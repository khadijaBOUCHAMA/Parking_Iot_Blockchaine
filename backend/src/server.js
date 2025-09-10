const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Imports locaux
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler, timeoutHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const blockchainService = require('./services/blockchainService');
const iotSimulator = require('./services/iotSimulator');
const parkingSocket = require('./sockets/parkingSocket');

// Routes
const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');
const reservationRoutes = require('./routes/reservation');
const iotRoutes = require('./routes/iot');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');

class ParkingSyncServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:8081",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    this.port = process.env.PORT || 3001;
  }

  setupSecurity() {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:8080",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Wallet-Address', 'X-Signature', 'X-Message']
    }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: { success: false, message: 'Trop de requêtes, veuillez réessayer plus tard' }
    });
    this.app.use('/api/', limiter);
  }

  setupMiddlewares() {
    this.app.use(compression());
    this.app.use(timeoutHandler(30000));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(logger.expressMiddleware);
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          blockchain: blockchainService.isConnected(),
          iot: iotSimulator.getRunningStatus()
        }
      });
    });

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/parking', parkingRoutes);
    this.app.use('/api/reservation', authMiddleware, reservationRoutes);
    this.app.use('/api/iot', iotRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/analytics', analyticsRoutes);

    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async initializeServices() {
    try {
      logger.info('🚀 Initialisation des services...');
      await connectDB();
      await connectRedis();

      try {
        await blockchainService.initialize();
        logger.info('✅ Service blockchain initialisé');
      } catch (error) {
        logger.warn('⚠️ Service blockchain non disponible:', error.message);
      }

      iotSimulator.start(this.io);
      parkingSocket(this.io);
      this.app.set('io', this.io);

      logger.info('✅ Tous les services sont initialisés');
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation des services:', error);
      throw error;
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      logger.info(`📴 Signal ${signal} reçu, arrêt gracieux en cours...`);

      this.server.close(() => {
        logger.info('🔌 Serveur HTTP fermé');
        iotSimulator.stop();
        this.io.close(() => {
          logger.info('🔌 WebSocket fermé');
        });
        require('mongoose').connection.close(() => {
          logger.info('📊 Connexion MongoDB fermée');
          process.exit(0);
        });
      });

      setTimeout(() => {
        logger.error('⏰ Arrêt forcé après timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  async start() {
    try {
      this.setupSecurity();
      this.setupMiddlewares();
      this.setupRoutes();
      this.setupGracefulShutdown();
      await this.initializeServices();

      this.server.listen(this.port, () => {
        logger.info('🎉 Serveur ParkSync démarré avec succès !');
        logger.info(`🌐 API disponible sur: http://localhost:${this.port}`);
        logger.info(`🔌 WebSocket disponible sur: ws://localhost:${this.port}`);
        logger.info(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      logger.error('❌ Erreur lors du démarrage du serveur:', error);
      process.exit(1);
    }
  }
}

const server = new ParkingSyncServer();

if (require.main === module) {
  server.start();
}

module.exports = server;

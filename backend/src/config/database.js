const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: true
    };

    const conn = await mongoose.connect(mongoURI, options);

    logger.info(`MongoDB connecté: ${conn.connection.host}`);

    // Gestion des événements de connexion
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connecté à MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Erreur de connexion MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose déconnecté de MongoDB');
    });

    // Gestion propre de la fermeture
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Connexion MongoDB fermée suite à l\'arrêt de l\'application');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Erreur de connexion à la base de données:', error);
    logger.warn('Le serveur continuera sans base de données - certaines fonctionnalités peuvent ne pas fonctionner');
    // process.exit(1); // Commenté pour permettre au serveur de continuer
  }
};

module.exports = connectDB;

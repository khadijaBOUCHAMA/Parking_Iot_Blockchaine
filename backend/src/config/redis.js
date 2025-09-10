const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Erreur Redis:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connecté');
    });

    redisClient.on('ready', () => {
      logger.info('Redis prêt');
    });

    redisClient.on('end', () => {
      logger.warn('Redis déconnecté');
    });

    await redisClient.connect();
    
    // Test de la connexion
    await redisClient.ping();
    logger.info('✅ Redis ping successful');

  } catch (error) {
    logger.error('Erreur de connexion Redis:', error);
    // Ne pas arrêter l'application si Redis n'est pas disponible
    logger.warn('⚠️ Application continue sans Redis (cache désactivé)');
  }
};

const getRedisClient = () => {
  return redisClient;
};

// Fonctions utilitaires pour le cache
const cacheGet = async (key) => {
  try {
    if (!redisClient || !redisClient.isReady) return null;
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Erreur cache GET:', error);
    return null;
  }
};

const cacheSet = async (key, value, expireInSeconds = 3600) => {
  try {
    if (!redisClient || !redisClient.isReady) return false;
    await redisClient.setEx(key, expireInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Erreur cache SET:', error);
    return false;
  }
};

const cacheDel = async (key) => {
  try {
    if (!redisClient || !redisClient.isReady) return false;
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Erreur cache DEL:', error);
    return false;
  }
};

const cacheFlush = async () => {
  try {
    if (!redisClient || !redisClient.isReady) return false;
    await redisClient.flushAll();
    return true;
  } catch (error) {
    logger.error('Erreur cache FLUSH:', error);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheFlush
};

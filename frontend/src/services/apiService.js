import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
    this.token = localStorage.getItem('authToken');
    
    // Créer l'instance axios
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Intercepteur pour ajouter le token d'authentification
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur pour gérer les réponses
    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/auth';
        }
        return Promise.reject(error.response?.data || error);
      }
    );
  }

  /**
   * Définir le token d'authentification
   */
  setAuthToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Effacer l'authentification
   */
  clearAuth() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // === AUTHENTIFICATION ===

  /**
   * Obtenir un nonce pour la signature MetaMask
   */
  async getNonce(walletAddress) {
    return this.api.get(`/auth/nonce/${walletAddress}`);
  }

  /**
   * Vérifier la signature MetaMask
   */
  async verifySignature(walletAddress, signature, message) {
    return this.api.post('/auth/verify', {
      walletAddress,
      signature,
      message
    });
  }

  /**
   * Obtenir les informations de l'utilisateur connecté
   */
  async getMe() {
    return this.api.get('/auth/me');
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  async updateProfile(profileData) {
    return this.api.put('/auth/profile', profileData);
  }

  // === PARKINGS ===

  /**
   * Obtenir toutes les places de parking
   */
  async getParkingSpots(params = {}) {
    return this.api.get('/parking/spots', { params });
  }

  /**
   * Obtenir une place de parking spécifique
   */
  async getParkingSpot(spotId) {
    return this.api.get(`/parking/spots/${spotId}`);
  }

  /**
   * Obtenir la disponibilité en temps réel
   */
  async getAvailability(zone = null) {
    const params = zone ? { zone } : {};
    return this.api.get('/parking/availability', { params });
  }

  /**
   * Rechercher des places disponibles
   */
  async searchParkingSpots(searchParams) {
    return this.api.get('/parking/search', { params: searchParams });
  }

  /**
   * Obtenir les zones de parking
   */
  async getParkingZones() {
    return this.api.get('/parking/zones');
  }

  /**
   * Obtenir les statistiques des parkings
   */
  async getParkingStats() {
    return this.api.get('/parking/stats');
  }

  // === RÉSERVATIONS ===

  /**
   * Créer une nouvelle réservation
   */
  async createReservation(reservationData) {
    return this.api.post('/reservation/create', reservationData);
  }

  /**
   * Confirmer le paiement d'une réservation
   */
  async confirmPayment(reservationId, paymentData) {
    return this.api.post(`/reservation/${reservationId}/pay`, paymentData);
  }

  /**
   * Obtenir les réservations de l'utilisateur
   */
  async getMyReservations(params = {}) {
    return this.api.get('/reservation/my-reservations', { params });
  }

  /**
   * Obtenir une réservation spécifique
   */
  async getReservation(reservationId) {
    return this.api.get(`/reservation/${reservationId}`);
  }

  /**
   * Annuler une réservation
   */
  async cancelReservation(reservationId, reason = null) {
    return this.api.put(`/reservation/${reservationId}/cancel`, { reason });
  }

  /**
   * Prolonger une réservation
   */
  async extendReservation(reservationId, newEndTime) {
    return this.api.put(`/reservation/${reservationId}/extend`, { newEndTime });
  }

  /**
   * Noter une réservation
   */
  async rateReservation(reservationId, rating, comment = null) {
    return this.api.post(`/reservation/${reservationId}/rate`, { rating, comment });
  }

  // === IOT ===

  /**
   * Obtenir les données des capteurs IoT
   */
  async getSensorsData(params = {}) {
    return this.api.get('/iot/sensors', { params });
  }

  /**
   * Obtenir les données d'un capteur spécifique
   */
  async getSensorData(spotId, includeHistory = false) {
    return this.api.get(`/iot/sensors/${spotId}`, {
      params: { includeHistory }
    });
  }

  /**
   * Obtenir le statut du système IoT
   */
  async getIoTStatus() {
    return this.api.get('/iot/status');
  }

  /**
   * Obtenir les analytics IoT
   */
  async getIoTAnalytics(period = '24h') {
    return this.api.get('/iot/analytics', { params: { period } });
  }

  // === ADMIN ===

  /**
   * Obtenir le dashboard admin
   */
  async getAdminDashboard() {
    return this.api.get('/admin/dashboard');
  }

  /**
   * Obtenir la liste des utilisateurs
   */
  async getUsers(params = {}) {
    return this.api.get('/admin/users', { params });
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId, userData) {
    return this.api.put(`/admin/users/${userId}`, userData);
  }

  /**
   * Créer une place de parking
   */
  async createParkingSpot(spotData) {
    return this.api.post('/admin/parking-spots', spotData);
  }

  /**
   * Mettre à jour une place de parking
   */
  async updateParkingSpot(spotId, spotData) {
    return this.api.put(`/admin/parking-spots/${spotId}`, spotData);
  }

  /**
   * Obtenir toutes les réservations (admin)
   */
  async getAllReservations(params = {}) {
    return this.api.get('/admin/reservations', { params });
  }

  /**
   * Mettre à jour une réservation (admin)
   */
  async updateReservation(reservationId, updateData) {
    return this.api.put(`/admin/reservations/${reservationId}`, updateData);
  }

  /**
   * Obtenir les informations système
   */
  async getSystemInfo() {
    return this.api.get('/admin/system-info');
  }

  /**
   * Vider le cache
   */
  async flushCache() {
    return this.api.post('/admin/cache/flush');
  }

  /**
   * Redémarrer le simulateur IoT
   */
  async restartIoTSimulator() {
    return this.api.post('/admin/iot/restart');
  }

  // === ANALYTICS ===

  /**
   * Obtenir les analytics de revenus
   */
  async getRevenueAnalytics(params = {}) {
    return this.api.get('/analytics/revenue', { params });
  }

  /**
   * Obtenir les analytics d'occupation
   */
  async getOccupancyAnalytics(params = {}) {
    return this.api.get('/analytics/occupancy', { params });
  }

  /**
   * Obtenir les analytics des utilisateurs
   */
  async getUserAnalytics(period = '30d') {
    return this.api.get('/analytics/users', { params: { period } });
  }

  /**
   * Obtenir les analytics de performance
   */
  async getPerformanceAnalytics() {
    return this.api.get('/analytics/performance');
  }

  /**
   * Obtenir les prédictions IA
   */
  async getPredictions(type = 'occupancy', horizon = '24h') {
    return this.api.get('/analytics/predictions', {
      params: { type, horizon }
    });
  }

  // === UTILITAIRES ===

  /**
   * Vérifier la santé de l'API
   */
  async healthCheck() {
    return this.api.get('/health');
  }

  /**
   * Obtenir les logs (admin)
   */
  async getLogs(params = {}) {
    return this.api.get('/admin/logs', { params });
  }

  /**
   * Upload de fichier
   */
  async uploadFile(file, endpoint = '/upload') {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
}

// Instance singleton
const apiService = new ApiService();

export default apiService;

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import apiService from '../services/apiService';
import blockchainService from '../services/blockchainService';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (profileData: any) => Promise<any>;
  checkAuthStatus: () => Promise<void>;
  reconnectBlockchain: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  getWalletAddress: () => string | undefined;
  isBlockchainConnected: () => boolean;
  isMetaMaskInstalled: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Vérifier si l'utilisateur est déjà connecté
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Vérifier le token avec l'API
      const response = await apiService.getMe();

      setAuthState({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      // Initialiser les services
      await blockchainService.initialize();

    } catch (error: any) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      localStorage.removeItem('authToken');
      apiService.clearAuth();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Erreur d\'authentification'
      });
    }
  }, []);

  // Connexion avec MetaMask
  const connectWallet = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Vérifier que MetaMask est installé
      if (!window.ethereum) {
        throw new Error('MetaMask n\'est pas installé');
      }

      // Initialiser le service blockchain
      await blockchainService.initialize();

      // Connecter le portefeuille
      const walletInfo = await blockchainService.connectWallet();
      const walletAddress = walletInfo.address;

      // Obtenir le nonce pour la signature
      const nonceResponse = await apiService.getNonce(walletAddress);
      const message = nonceResponse.data.message;

      // Demander à l'utilisateur de signer le message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress]
      });

      // Vérifier la signature côté serveur
      const authResponse = await apiService.verifySignature(
        walletAddress,
        signature,
        message
      );

      // Sauvegarder le token
      const token = authResponse.data.token;
      localStorage.setItem('authToken', token);
      apiService.setAuthToken(token);

      setAuthState({
        user: authResponse.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return authResponse.data.user;

    } catch (error: any) {
      console.error('Erreur lors de la connexion MetaMask:', error);

      let errorMessage = 'Erreur lors de la connexion';

      if (error.code === 4001) {
        errorMessage = 'Connexion refusée par l\'utilisateur';
      } else if (error.code === -32002) {
        errorMessage = 'Demande de connexion déjà en cours';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw new Error(errorMessage);
    }
  }, []);

  // Déconnexion
  const logout = useCallback(async () => {
    try {
      // Notifier le serveur de la déconnexion
      if (authState.isAuthenticated) {
        await apiService.api.post('/auth/logout');
      }
    } catch (error) {
      console.warn('Erreur lors de la déconnexion côté serveur:', error);
    } finally {
      // Nettoyer les données locales
      localStorage.removeItem('authToken');
      apiService.clearAuth();
      blockchainService.disconnect();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, [authState.isAuthenticated]);

  // Mettre à jour le profil utilisateur
  const updateProfile = useCallback(async (profileData: any) => {
    try {
      const response = await apiService.updateProfile(profileData);

      setAuthState(prev => ({
        ...prev,
        user: response.data.user
      }));

      return response.data.user;
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }, []);

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = useCallback((role: string | string[]) => {
    if (!authState.user) return false;

    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(authState.user.role);
  }, [authState.user]);

  // Vérifier si l'utilisateur est admin
  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  // Vérifier si l'utilisateur est manager ou admin
  const isManager = useCallback(() => {
    return hasRole(['admin', 'manager']);
  }, [hasRole]);

  // Obtenir l'adresse du portefeuille connecté
  const getWalletAddress = useCallback(() => {
    return authState.user?.walletAddress || blockchainService.getCurrentAccount();
  }, [authState.user]);

  // Vérifier la connexion blockchain
  const isBlockchainConnected = useCallback(() => {
    return blockchainService.isConnected();
  }, []);

  // Vérifier si MetaMask est installé
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }, []);

  // Reconnecter la blockchain si nécessaire
  const reconnectBlockchain = useCallback(async () => {
    try {
      if (!blockchainService.isConnected() && authState.isAuthenticated) {
        await blockchainService.initialize();
        if (authState.user?.walletAddress) {
          await blockchainService.connectWallet();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la reconnexion blockchain:', error);
    }
  }, [authState.isAuthenticated, authState.user]);

  // Écouter les changements de compte MetaMask
  useEffect(() => {
    const handleAccountChanged = (event: CustomEvent) => {
      const newAddress = event.detail.address;

      if (authState.user && authState.user.walletAddress !== newAddress.toLowerCase()) {
        // L'utilisateur a changé de compte, déconnecter
        logout();
      }
    };

    const handleWalletDisconnected = () => {
      if (authState.isAuthenticated) {
        logout();
      }
    };

    window.addEventListener('accountChanged', handleAccountChanged as EventListener);
    window.addEventListener('walletDisconnected', handleWalletDisconnected);

    return () => {
      window.removeEventListener('accountChanged', handleAccountChanged as EventListener);
      window.removeEventListener('walletDisconnected', handleWalletDisconnected);
    };
  }, [authState.user, authState.isAuthenticated, logout]);

  // Vérifier l'authentification au montage
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    // État
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,

    // Actions
    connectWallet,
    logout,
    updateProfile,
    checkAuthStatus,
    reconnectBlockchain,

    // Utilitaires
    hasRole,
    isAdmin,
    isManager,
    getWalletAddress,
    isBlockchainConnected,
    isMetaMaskInstalled
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
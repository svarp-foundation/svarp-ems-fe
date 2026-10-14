import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => api.getToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const heartbeatTimerRef = useRef(null);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      if (api.getToken()) {
        await api.logout();
      }
    } catch (err) {
      console.warn('Logout request failed or expired:', err);
    } finally {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      api.setToken(null);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setUser(null);
      setToken(null);
      setError(null);
    }
  }, []);

  // Validate active session on initial load or token changes
  const checkSession = useCallback(async () => {
    const currentToken = api.getToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const sessionData = await api.getSession();
      if (sessionData && sessionData.user) {
        setUser(sessionData.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionData.user));
        setError(null);
      } else {
        await logout();
      }
    } catch (err) {
      console.warn('Session validation error, resetting local session:', err.message || err);
      await logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  // Periodic heartbeat every 25 seconds when user is logged in
  useEffect(() => {
    if (!token || !user) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    const sendHeartbeat = async () => {
      try {
        await api.heartbeat();
      } catch (err) {
        if (err.status === 401 || err.status === 409) {
          console.warn('Heartbeat failed - session invalidated:', err.message);
          logout();
        }
      }
    };

    heartbeatTimerRef.current = setInterval(sendHeartbeat, 25000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [token, user, logout]);

  // Login handler
  const login = async (email, password, bypassKey = null) => {
    setError(null);
    try {
      const data = await api.login(email, password, bypassKey);
      setUser(data.user);
      setToken(data.access_token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      return { success: true, data };
    } catch (err) {
      const message = err.message || 'Login failed';
      setError(message);
      return {
        success: false,
        error: message,
        status: err.status,
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    checkSession,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

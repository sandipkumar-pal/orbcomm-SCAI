import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import jwtDecode from 'jwt-decode';
import { configureInterceptors } from '../services/api.js';

const AuthContext = createContext();

const STORAGE_KEY = 'scci_token';

const readToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => readToken());
  const [user, setUser] = useState(() => {
    const stored = readToken();
    if (!stored) return null;
    try {
      return jwtDecode(stored);
    } catch (error) {
      return null;
    }
  });

  useEffect(() => {
    configureInterceptors(token);
    if (typeof window === 'undefined') {
      return;
    }
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, token);
      try {
        setUser(jwtDecode(token));
      } catch (error) {
        setUser(null);
      }
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
  }, [token]);

  const value = useMemo(() => ({
    token,
    user,
    login: newToken => setToken(newToken),
    logout: () => setToken(null)
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

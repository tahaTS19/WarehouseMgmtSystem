import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';

const AuthContext = createContext(null);

// Decodes a JWT's payload WITHOUT verifying its signature — that's fine here,
// since the token was already issued by our own trusted backend. The frontend
// only ever uses this to know "who is this, for UI purposes" (which nav to
// show, etc.) — it is NEVER the source of truth for access control. Every
// real permission check happens server-side, via the guards.
function decodeJwtPayload(token) {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, restore the session from whatever token is already in
  // localStorage (if any) — this is what makes "persist login" work across
  // page refreshes.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        setUser(payload);
      }
    }
    setIsLoading(false);
  }, []);

  const register = useCallback(async (formData) => {
    const result = await api.post('/auth/register', formData);
    localStorage.setItem('token', result.accessToken);
    setUser(decodeJwtPayload(result.accessToken));
    return result;
  }, []);

  const login = useCallback(async (formData) => {
    const result = await api.post('/auth/login', formData);
    localStorage.setItem('token', result.accessToken);
    setUser(decodeJwtPayload(result.accessToken));
    return result;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

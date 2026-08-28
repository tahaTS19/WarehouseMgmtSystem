import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, ask the backend "who am I?" — the httpOnly auth cookie (if
  // any) is sent automatically with this request. There is nothing for the
  // frontend to read/decode itself anymore; the cookie is invisible to JS by
  // design. A 401 here just means "not logged in", which is a normal,
  // expected outcome, not an error to surface to the user.
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const result = await api.get('/auth/me');
        if (isMounted) {
          setUser(result.user);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const register = useCallback(async (formData) => {
    const result = await api.post('/auth/register', formData);
    setUser(result.user);
    return result;
  }, []);

  const login = useCallback(async (formData) => {
    const result = await api.post('/auth/login', formData);
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    // Frontend JS cannot clear an httpOnly cookie itself — the backend has to
    // do it via a real endpoint.
    await api.post('/auth/logout');
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

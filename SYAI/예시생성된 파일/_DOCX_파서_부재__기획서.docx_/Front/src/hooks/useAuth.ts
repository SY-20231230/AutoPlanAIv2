import { useState, useEffect, useContext, createContext, useCallback } from 'react';

interface AuthContextType {
  user: { id: string; name: string; email: string } | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: { name: string; email: string; password: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = !!user;

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (credentials.email === 'test@example.com' && credentials.password === 'password123') {
        const loggedInUser = { id: 'user-123', name: 'Test User', email: credentials.email };
        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      setUser(null);
      localStorage.removeItem('user');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: { name: string; email: string; password: string }) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const registeredUser = { id: `user-${Date.now()}`, name: userData.name, email: userData.email };
      setUser(registeredUser);
      localStorage.setItem('user', JSON.stringify(registeredUser));
    } catch (error) {
      setUser(null);
      localStorage.removeItem('user');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
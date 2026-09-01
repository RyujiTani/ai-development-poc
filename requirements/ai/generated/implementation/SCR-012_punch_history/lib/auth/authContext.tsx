import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role } from '@/features/attendance/domain/types';

interface AuthState {
  user_id: string | null;
  role: Role | null;
  display_name: string | null;
  isAuthenticated: boolean;
  loginAsAdmin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<Omit<AuthState, 'loginAsAdmin' | 'logout'>>({
    user_id: null,
    role: null,
    display_name: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const user_id = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role') as Role | null;
    const display_name = sessionStorage.getItem('display_name');
    
    if (user_id && role === 'FACTORY_ADMIN') {
      setState({
        user_id,
        role,
        display_name: display_name || '工場側管理者',
        isAuthenticated: true
      });
    } else {
      setState({
        user_id: null,
        role: null,
        display_name: null,
        isAuthenticated: false
      });
    }
  }, []);

  const loginAsAdmin = () => {
    sessionStorage.setItem('user_id', 'u-1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場側管理者 鈴木');
    setState({
      user_id: 'u-1',
      role: 'FACTORY_ADMIN',
      display_name: '工場側管理者 鈴木',
      isAuthenticated: true
    });
  };

  const logout = () => {
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('display_name');
    setState({
      user_id: null,
      role: null,
      display_name: null,
      isAuthenticated: false
    });
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ ...state, loginAsAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

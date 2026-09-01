"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@/features/user/domain/user';

interface AuthContextType {
  userId: string | null;
  role: Role | null;
  displayName: string | null;
  login: (userId: string, role: Role, displayName: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('user_id');
    const storedRole = sessionStorage.getItem('role') as Role | null;
    const storedName = sessionStorage.getItem('display_name');

    if (storedUserId && storedRole) {
      setUserId(storedUserId);
      setRole(storedRole);
      setDisplayName(storedName || '管理者');
    }
    setIsLoading(false);
  }, []);

  const login = (id: string, userRole: Role, name: string) => {
    sessionStorage.setItem('user_id', id);
    sessionStorage.setItem('role', userRole);
    sessionStorage.setItem('display_name', name);
    setUserId(id);
    setRole(userRole);
    setDisplayName(name);
  };

  const logout = () => {
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('display_name');
    setUserId(null);
    setRole(null);
    setDisplayName(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ userId, role, displayName, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
"
    },
    {
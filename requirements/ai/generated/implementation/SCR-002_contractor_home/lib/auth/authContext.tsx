'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../features/user/domain/user';
import { IndexedDBUserRepository } from '../../features/user/repository/userRepository';
import { GetUserMeUseCase } from '../../features/user/usecase/getUserMeUseCase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadSession() {
      try {
        if (typeof window === 'undefined') return;

        const userId = sessionStorage.getItem('USER_ID');
        const role = sessionStorage.getItem('USER_ROLE');

        // 未認証
        if (!userId || role !== 'CONTRACTOR_MANAGER') {
          if (pathname !== '/login') {
            router.push('/login');
          }
          setIsLoading(false);
          return;
        }

        const repo = new IndexedDBUserRepository();
        const useCase = new GetUserMeUseCase(repo);
        const user = await useCase.execute(userId);

        if (user && user.role === 'CONTRACTOR_MANAGER' && user.status === 'ACTIVE') {
          setCurrentUser(user);
        } else {
          sessionStorage.removeItem('USER_ID');
          sessionStorage.removeItem('USER_ROLE');
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [router, pathname]);

  const logout = () => {
    sessionStorage.removeItem('USER_ID');
    sessionStorage.removeItem('USER_ROLE');
    setCurrentUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, logout }}>
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
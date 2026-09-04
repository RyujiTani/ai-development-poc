import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LoginPage from '@/app/(auth)/login/page.tsx';

const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const { mockToast, mockToastHook } = vi.hoisted(() => {
  const mockToast = vi.fn();
  return {
    mockToast,
    mockToastHook: {
      toast: mockToast,
    },
  };
});

vi.mock('@/components/Toast', () => ({
  useToast: () => mockToastHook,
}));

vi.mock('@/features/user/repository/indexedDBUserRepository', () => {
  return {
    IndexedDBUserRepository: class {
      findByLoginId = async (loginId: string) => {
        if (loginId === 'contractor1') {
          return {
            user_id: 'user-contractor-1',
            contractor_id: 'contractor-1',
            role: 'CONTRACTOR_MANAGER' as const,
            login_id: 'contractor1',
            password_hash: '1d120a8', // password123 簡易ハッシュ
            display_name: '外注先 A 職長',
            status: 'ACTIVE' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return null;
      };
      updateLastLogin = async () => {};
    },
  };
});

vi.mock('@/lib/db/seed', () => ({
  seedDatabase: async () => {},
  hashPassword: (p: string) => {
    if (p === 'password123') return '1d120a8';
    return 'wrong';
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('正常に初期表示され、デモアカウント情報が表示されること', () => {
    render(<LoginPage />);
    expect(screen.getByText('外注作業員管理システム')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('IDを入力してください')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('パスワードを入力してください')).toBeInTheDocument();
  });

  it('IDとパスワードが未入力のときにバリデーションエラーが表示されること', async () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('IDを入力してください')).toBeInTheDocument();
    expect(await screen.findByText('パスワードを入力してください')).toBeInTheDocument();
  });

  it('間違ったパスワードでログインを試みたときにエラーメッセージが表示されること', async () => {
    render(<LoginPage />);
    
    const idInput = screen.getByPlaceholderText('IDを入力してください');
    const passwordInput = screen.getByPlaceholderText('パスワードを入力してください');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'contractor1' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });
    fireEvent.click(submitButton);

    expect(await screen.findByText('IDまたはパスワードが正しくありません')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith('IDまたはパスワードが正しくありません', 'error');
  });

  it('有効な資格情報でログインが成功し、ホーム画面へ遷移すること', async () => {
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText('IDを入力してください');
    const passwordInput = screen.getByPlaceholderText('パスワードを入力してください');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'contractor1' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(sessionStorage.getItem('auth_token')).toBe('mock-jwt-token-for-user-contractor-1');
      expect(sessionStorage.getItem('user_role')).toBe('CONTRACTOR_MANAGER');
      expect(mockPush).toHaveBeenCalledWith('/contractor/home');
    });
  });
});
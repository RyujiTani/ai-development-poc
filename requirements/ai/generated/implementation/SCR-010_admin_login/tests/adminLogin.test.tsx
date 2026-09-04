import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AdminLoginPage from '@/app/(auth)/admin/login/page.tsx';

// Next.js Routerのモック
const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// SessionStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true
});

describe('SCR-010 管理者ログイン画面テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('TST-SCR-010-001: 正常レンダリング確認', () => {
    render(<AdminLoginPage />);
    
    // 主要要素が表示されているか
    expect(screen.getByLabelText('管理者ID')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('TST-SCR-010-002: ID未入力時の必須バリデーション', async () => {
    render(<AdminLoginPage />);
    
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('IDを入力してください。')).toBeInTheDocument();
    });
  });

  it('TST-SCR-010-003: パスワード未入力時の必須バリデーション', async () => {
    render(<AdminLoginPage />);
    
    const idInput = screen.getByLabelText('管理者ID');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'admin' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('パスワードを入力してください。')).toBeInTheDocument();
    });
  });

  it('TST-SCR-010-004: 不適合な認証情報（間違ったPW）でログイン失敗', async () => {
    render(<AdminLoginPage />);
    
    const idInput = screen.getByLabelText('管理者ID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/IDまたはパスワードが正しくありません/)).toBeInTheDocument();
    });
  });

  it('TST-SCR-010-005: 適合する資格情報でログイン成功とセッション保存・遷移', async () => {
    render(<AdminLoginPage />);
    
    const idInput = screen.getByLabelText('管理者ID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // 総合ダッシュボードへ遷移されることを確認
      expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
      
      // SessionStorageにデータが格納されているか
      const sessionData = window.sessionStorage.getItem('worker_attendance_admin_session');
      expect(sessionData).not.toBeNull();
      
      const parsed = JSON.parse(sessionData!);
      expect(parsed.role).toBe('FACTORY_ADMIN');
      expect(parsed.userId).toBe('factory-admin-1');
    });
  });
});
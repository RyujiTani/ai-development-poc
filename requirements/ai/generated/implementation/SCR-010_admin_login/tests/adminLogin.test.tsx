import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminLoginPage from '@/app/(factory)/login/page';

const mocks = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockExecute = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockExecute,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.mockRouter,
}));

vi.mock('@/lib/db/idb', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
  openDB: vi.fn(),
}));

vi.mock('@/features/auth/usecase/loginUseCase', () => {
  return {
    LoginUseCase: vi.fn().mockImplementation(() => ({
      execute: mocks.mockExecute,
    })),
  };
});

describe('SCR-010 管理者ログイン画面テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('正常表示: 管理者用ログインUIが過不足なく表示されること', () => {
    render(<AdminLoginPage />);
    
    expect(screen.getByText('外注管理システム')).toBeInTheDocument();
    expect(screen.getByText('工場管理者ログイン')).toBeInTheDocument();
    expect(screen.getByLabelText(/ユーザーID/)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('SCR-010-UT-001 ID必須入力チェックが動作し、エラーが表示されること', async () => {
    render(<AdminLoginPage />);
    
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    expect(await screen.findByText('ユーザーIDを入力してください。')).toBeInTheDocument();
  });

  it('SCR-010-UT-002 パスワード必須入力チェックが動作し、エラーが表示されること', async () => {
    render(<AdminLoginPage />);
    
    const idInput = screen.getByLabelText(/ユーザーID/);
    fireEvent.change(idInput, { target: { value: 'admin' } });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    expect(await screen.findByText('パスワードを入力してください。')).toBeInTheDocument();
  });

  it('SCR-010-UT-003 不正なログイン情報の場合に認証エラーが表示されること', async () => {
    mocks.mockExecute.mockResolvedValueOnce({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'IDまたはパスワードが正しくありません' },
    });

    render(<AdminLoginPage />);

    const idInput = screen.getByLabelText(/ユーザーID/);
    const passInput = screen.getByLabelText(/パスワード/);
    fireEvent.change(idInput, { target: { value: 'invalid_user' } });
    fireEvent.change(passInput, { target: { value: 'wrong_pass' } });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    expect(await screen.findByText('IDまたはパスワードが正しくありません')).toBeInTheDocument();
  });

  it('SCR-010-E2E-001 適切な管理者権限の資格情報で認証成功しセッション保存、ダッシュボードに遷移すること', async () => {
    mocks.mockExecute.mockResolvedValueOnce({
      success: true,
      value: {
        token: 'mock-jwt-token-abcd',
        admin_info: {
          user_id: 'factory-admin-1',
          display_name: '工場側管理者A',
          role: 'FACTORY_ADMIN',
        },
      },
    });

    render(<AdminLoginPage />);

    const idInput = screen.getByLabelText(/ユーザーID/);
    const passInput = screen.getByLabelText(/パスワード/);
    fireEvent.change(idInput, { target: { value: 'admin' } });
    fireEvent.change(passInput, { target: { value: 'admin123' } });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(sessionStorage.getItem('session_user_id')).toBe('factory-admin-1');
      expect(sessionStorage.getItem('session_role')).toBe('FACTORY_ADMIN');
      expect(sessionStorage.getItem('session_display_name')).toBe('工場側管理者A');
      expect(sessionStorage.getItem('session_token')).toBe('mock-jwt-token-abcd');
    });

    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/admin/dashboard');
    }, { timeout: 1500 });
  });
});
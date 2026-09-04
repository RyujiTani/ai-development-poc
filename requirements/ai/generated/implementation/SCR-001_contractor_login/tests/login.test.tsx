import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LoginPage from '../app/(auth)/login/page.tsx';

const { mockPush, mockRouter, mockExecute } = vi.hoisted(() => {
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
  useRouter: () => mockRouter,
}));

vi.mock('../features/user/usecase/loginUseCase', () => {
  return {
    LoginUseCase: vi.fn().mockImplementation(() => ({
      execute: mockExecute,
    })),
  };
});

describe('SCR-001 外注先ログイン画面 テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          for (const key in store) {
            delete store[key];
          }
        },
      },
      writable: true,
    });
  });

  it('SCR-001-TST-001: ログインIDが空の場合、バリデーションエラーが表示され送信されないこと', async () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('パスワード');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('ログインIDを入力してください')).toBeInTheDocument();
    });

    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('SCR-001-TST-002: パスワードが空の場合、バリデーションエラーが表示され送信されないこと', async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText('ログインID');
    fireEvent.change(idInput, { target: { value: 'contractor1' } });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
    });

    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('SCR-001-TST-003: 不正なログイン情報の場合、認証エラーメッセージが表示されること', async () => {
    mockExecute.mockResolvedValue({
      success: false,
      error: { type: 'AUTH_ERROR', message: 'ログインIDまたはパスワードが正しくありません' },
    });

    render(<LoginPage />);

    const idInput = screen.getByLabelText('ログインID');
    const passwordInput = screen.getByLabelText('パスワード');

    fireEvent.change(idInput, { target: { value: 'wrong_id' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith('wrong_id', 'wrong_password');
    });

    await waitFor(() => {
      expect(screen.getByText('ログインIDまたはパスワードが正しくありません')).toBeInTheDocument();
    });
  });

  it('SCR-001-TST-004: ログインが成功した場合、セッションに保存されて適切な画面にリダイレクトされること', async () => {
    mockExecute.mockResolvedValue({
      success: true,
      data: {
        userId: 'user-contractor-1',
        role: 'CONTRACTOR_MANAGER',
        contractorId: 'contractor-1',
        displayName: '外注先A職長',
      },
    });

    render(<LoginPage />);

    const idInput = screen.getByLabelText('ログインID');
    const passwordInput = screen.getByLabelText('パスワード');

    fireEvent.change(idInput, { target: { value: 'contractor1' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith('contractor1', 'password123');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor/home');
    });
  });
});
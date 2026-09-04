import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../app/(auth)/login/page';
import { ToastProvider } from '../../components/ui/toast';

// Next.js ナビゲーションおよび IndexedDB初期化のモックを巻き上げ（hoist）定義
const { mockPush, mockRouter, mockInitializeDBWithSeed } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockInitializeDBWithSeed = vi.fn().mockResolvedValue(undefined);
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockInitializeDBWithSeed,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('../../lib/db/indexedDB', () => ({
  initializeDBWithSeed: () => mockInitializeDBWithSeed(),
}));

// UseCase のモック
const mockLoginUseCaseExecute = vi.fn();
vi.mock('../../features/user/usecase/loginUseCase', () => {
  return {
    LoginUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockLoginUseCaseExecute,
      };
    }),
  };
});

describe('SCR-001: 外注先ログイン画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <LoginPage />
      </ToastProvider>
    );
  };

  it('SCR-001-UI-001: ログインフォーム及びカードUI要素が正しく表示されていること', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: '勤怠・配置管理システム' })).toBeInTheDocument();
    expect(screen.getByLabelText('ログインID')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ログイン/ })).toBeInTheDocument();
  });

  it('SCR-001-VL-001: ID未入力の際にバリデーションエラーが表示されること', async () => {
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /ログイン/ });

    // パスワードのみ入力
    const passwordInput = screen.getByLabelText('パスワード');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ログインIDを入力してください。')).toBeInTheDocument();
    });
    expect(mockLoginUseCaseExecute).not.toHaveBeenCalled();
  });

  it('SCR-001-VL-002: パスワード未入力の際にバリデーションエラーが表示されること', async () => {
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /ログイン/ });

    // ログインIDのみ入力
    const idInput = screen.getByLabelText('ログインID');
    fireEvent.change(idInput, { target: { value: 'subcon_oshima' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('パスワードを入力してください。')).toBeInTheDocument();
    });
    expect(mockLoginUseCaseExecute).not.toHaveBeenCalled();
  });

  it('SCR-001-EV-001: ログイン成功時に外注先ホームへ遷移すること', async () => {
    mockLoginUseCaseExecute.mockResolvedValue({
      success: true,
      value: {
        user: {
          user_id: 'u1111111',
          contractor_id: 'c1111111',
          role: 'CONTRACTOR_MANAGER',
          display_name: '大島 茂',
        },
      },
    });

    renderComponent();

    // データベースが読み込まれてボタンが活性化するまで待つ
    await screen.findByRole('button', { name: 'ログイン' });

    const idInput = screen.getByLabelText('ログインID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'subcon_oshima' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLoginUseCaseExecute).toHaveBeenCalledWith('subcon_oshima', 'password123');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor');
    });
  });

  it('SCR-001-EV-002: 認証エラー時に適切なメッセージがトーストに表示され遷移しないこと', async () => {
    mockLoginUseCaseExecute.mockResolvedValue({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'IDまたはパスワードが正しくありません。',
      },
    });

    renderComponent();

    await screen.findByRole('button', { name: 'ログイン' });

    const idInput = screen.getByLabelText('ログインID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'wrong_id' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong_pw' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLoginUseCaseExecute).toHaveBeenCalledWith('wrong_id', 'wrong_pw');
    });

    await waitFor(() => {
      expect(screen.getByText('IDまたはパスワードが正しくありません。')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
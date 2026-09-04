import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminLoginPage from '../../app/(auth)/admin/login/page';
import { ToastProvider } from '../../components/ui/toast';

// モックデータを巻き上げ（hoist）定義してTDZ回避
const mocks = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockInitializeDBWithSeed = vi.fn().mockResolvedValue(undefined);
  return {
    mockPush,
    mockInitializeDBWithSeed,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.mockPush,
  }),
}));

vi.mock('../../lib/db/indexedDB', () => ({
  initializeDBWithSeed: () => mocks.mockInitializeDBWithSeed(),
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

describe('SCR-010: 管理者ログイン画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <AdminLoginPage />
      </ToastProvider>
    );
  };

  it('TS-SCR-010-002: ログインフォーム及び中央配置のためのクラスが親要素に適用されていること', async () => {
    renderComponent();

    const mainElement = screen.getByRole('main');
    expect(mainElement.className).toContain('flex');
    expect(mainElement.className).toContain('items-center');
    expect(mainElement.className).toContain('justify-center');
    expect(mainElement.className).toContain('min-h-screen');
  });

  it('TS-SCR-010-003: PC/スマホ両対応のレスポンシブな幅指定クラスが適用されていること', async () => {
    renderComponent();

    const formContainer = screen.getByLabelText('ログインID').closest('form')?.parentElement;
    expect(formContainer?.className).toContain('w-full');
    expect(formContainer?.className).toContain('max-w-md');
  });

  it('TS-SCR-010-004: ID未入力の際にバリデーションエラーが表示されること', async () => {
    renderComponent();

    // 読み込みが完了するまで待つ
    await screen.findByRole('button', { name: 'ログイン' });

    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    // パスワードのみ入力
    const passwordInput = screen.getByLabelText('パスワード');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ログインIDを入力してください。')).toBeInTheDocument();
    });
    expect(mockLoginUseCaseExecute).not.toHaveBeenCalled();
  });

  it('TS-SCR-010-005: パスワード未入力の際にバリデーションエラーが表示されること', async () => {
    renderComponent();

    await screen.findByRole('button', { name: 'ログイン' });

    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    // ログインIDのみ入力
    const idInput = screen.getByLabelText('ログインID');
    fireEvent.change(idInput, { target: { value: 'factory_admin' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('パスワードを入力してください。')).toBeInTheDocument();
    });
    expect(mockLoginUseCaseExecute).not.toHaveBeenCalled();
  });

  it('TS-SCR-010-006: 無効な認証情報の場合にエラーが表示され遷移しないこと', async () => {
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

    expect(mocks.mockPush).not.toHaveBeenCalled();
  });

  it('TS-SCR-010-006 (追加): 工場側管理者(FACTORY_ADMIN)以外のユーザーがログインを試みた際に認証エラーとすること', async () => {
    mockLoginUseCaseExecute.mockResolvedValue({
      success: true,
      value: {
        user: {
          user_id: 'u1111111',
          contractor_id: 'c1111111',
          role: 'CONTRACTOR_MANAGER', // 工場側管理者ではない
          display_name: '大島 茂',
        },
      },
    });

    renderComponent();

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
      expect(screen.getByText('IDまたはパスワードが正しくありません。')).toBeInTheDocument();
    });

    expect(mocks.mockPush).not.toHaveBeenCalled();
  });

  it('TS-SCR-010-007 & TS-SCR-010-009: ログイン成功（FACTORY_ADMIN）時に総合ダッシュボード画面へ遷移すること', async () => {
    mockLoginUseCaseExecute.mockResolvedValue({
      success: true,
      value: {
        user: {
          user_id: 'u3333333',
          contractor_id: null,
          role: 'FACTORY_ADMIN',
          display_name: '工場管理責任者',
        },
      },
    });

    renderComponent();

    await screen.findByRole('button', { name: 'ログイン' });

    const idInput = screen.getByLabelText('ログインID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'factory_admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLoginUseCaseExecute).toHaveBeenCalledWith('factory_admin', 'password123');
    });

    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('TS-SCR-010-010: ログイン成功時にsessionStorageへ認証情報が保存されること', async () => {
    mockLoginUseCaseExecute.mockImplementation(async (loginId, password) => {
      sessionStorage.setItem('user_id', 'u3333333');
      sessionStorage.setItem('role', 'FACTORY_ADMIN');
      sessionStorage.setItem('display_name', '工場管理責任者');
      return {
        success: true,
        value: {
          user: {
            user_id: 'u3333333',
            contractor_id: null,
            role: 'FACTORY_ADMIN',
            display_name: '工場管理責任者',
          },
        },
      };
    });

    renderComponent();

    await screen.findByRole('button', { name: 'ログイン' });

    const idInput = screen.getByLabelText('ログインID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'factory_admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(sessionStorage.getItem('user_id')).toBe('u3333333');
      expect(sessionStorage.getItem('role')).toBe('FACTORY_ADMIN');
    });
  });
});
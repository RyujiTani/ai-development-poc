import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminUserRegisterPage from '../../app/(factory)/admin-users/page';

// Next.js Navigation モック
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
}));

// UseCase / Repository のモック (vi.hoisted を使用してホイスティング問題を解決)
const userMocks = vi.hoisted(() => ({
  mockGetUsersExecute: vi.fn(),
  mockCreateUserExecute: vi.fn(),
  mockUpdateUserExecute: vi.fn(),
  mockDeleteUserExecute: vi.fn(),
  mockGetContractorsExecute: vi.fn(),
}));

vi.mock('@/features/user/usecase/getUsersUseCase', () => ({
  GetUsersUseCase: vi.fn().mockImplementation(() => ({
    execute: userMocks.mockGetUsersExecute,
  })),
}));

vi.mock('@/features/user/usecase/createUserUseCase', () => ({
  CreateUserUseCase: vi.fn().mockImplementation(() => ({
    execute: userMocks.mockCreateUserExecute,
  })),
}));

vi.mock('@/features/user/usecase/updateUserUseCase', () => ({
  UpdateUserUseCase: vi.fn().mockImplementation(() => ({
    execute: userMocks.mockUpdateUserExecute,
  })),
}));

vi.mock('@/features/user/usecase/deleteUserUseCase', () => ({
  DeleteUserUseCase: vi.fn().mockImplementation(() => ({
    execute: userMocks.mockDeleteUserExecute,
  })),
}));

vi.mock('@/features/contractor/usecase/getContractorsUseCase', () => ({
  GetContractorsUseCase: vi.fn().mockImplementation(() => ({
    execute: userMocks.mockGetContractorsExecute,
  })),
}));

describe('SCR-015 管理者ユーザー登録画面の検証', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトセッションストレージ設定
    const store: Record<string, string> = {
      user_id: 'usr-admin',
      role: 'FACTORY_ADMIN',
    };
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    });

    // window.confirm モック
    vi.stubGlobal('confirm', () => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TS-015-001: 正常にロードされたユーザー及び企業の一覧がテーブル内に表示されること', async () => {
    userMocks.mockGetUsersExecute.mockResolvedValue({
      success: true,
      value: [
        {
          user_id: 'usr-admin',
          login_id: 'admin_taro',
          role: 'FACTORY_ADMIN',
          display_name: '工場管理者太郎',
          status: 'ACTIVE',
          created_at: '2026-04-13T00:00:00Z',
        },
        {
          user_id: 'usr-sub',
          login_id: 'sub_manager',
          role: 'CONTRACTOR_MANAGER',
          display_name: '外注先管理者二郎',
          status: 'ACTIVE',
          contractor_id: 'con-001',
          created_at: '2026-04-13T01:00:00Z',
        },
      ],
    });

    userMocks.mockGetContractorsExecute.mockResolvedValue({
      success: true,
      value: [
        {
          contractor_id: 'con-001',
          name: 'テスト協力会社A',
          status: 'ACTIVE',
          created_at: '2026-04-13T00:00:00Z',
        },
      ],
    });

    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.getByText('工場管理者太郎')).toBeInTheDocument();
      expect(screen.getByText('外注先管理者二郎')).toBeInTheDocument();
      expect(screen.getByText('admin_taro')).toBeInTheDocument();
      expect(screen.getByText('sub_manager')).toBeInTheDocument();
    });
  });

  it('TS-015-002: 重複したユーザーIDを入力した際、バリデーションエラーが表示されること', async () => {
    userMocks.mockGetUsersExecute.mockResolvedValue({ success: true, value: [] });
    userMocks.mockGetContractorsExecute.mockResolvedValue({ success: true, value: [] });
    userMocks.mockCreateUserExecute.mockResolvedValue({
      success: false,
      error: { code: 'DUPLICATE_LOGIN_ID', message: 'ユーザーIDが重複しています。' },
    });

    render(<AdminUserRegisterPage />);

    // 「新規登録」モーダル展開
    const registerBtn = await screen.findByTestId('user-register-btn');
    fireEvent.click(registerBtn);

    // フォームに重複するIDを入力
    const loginIdInput = screen.getByTestId('loginId-input');
    const displayNameInput = screen.getByTestId('displayName-input');
    const passwordInput = screen.getByTestId('password-input');

    fireEvent.change(loginIdInput, { target: { value: 'existing_user' } });
    fireEvent.change(displayNameInput, { target: { value: '重複テスト氏名' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // 保存
    const submitBtn = screen.getByTestId('form-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('loginId-error')).toHaveTextContent('ユーザーIDが重複しています。');
    });
  });

  it('TS-015-003: 外注先管理者を選択した状態で所属企業を選択しない場合、バリデーションメッセージが表示されること', async () => {
    userMocks.mockGetUsersExecute.mockResolvedValue({ success: true, value: [] });
    userMocks.mockGetContractorsExecute.mockResolvedValue({
      success: true,
      value: [
        { contractor_id: 'con-001', name: '協力企業A', status: 'ACTIVE' },
      ],
    });

    render(<AdminUserRegisterPage />);

    // 新規登録モーダル展開
    const registerBtn = await screen.findByTestId('user-register-btn');
    fireEvent.click(registerBtn);

    // 外注先管理者を選択
    const contractorRadioLabel = screen.getByTestId('role-contractor-label');
    const radioInput = contractorRadioLabel.querySelector('input[type="radio"]');
    if (radioInput) {
      fireEvent.click(radioInput);
    }

    // 企業は初期値のまま（未選択）
    const displayNameInput = screen.getByTestId('displayName-input');
    const passwordInput = screen.getByTestId('password-input');
    const loginIdInput = screen.getByTestId('loginId-input');

    fireEvent.change(loginIdInput, { target: { value: 'new_manager' } });
    fireEvent.change(displayNameInput, { target: { value: '新規外注マネージャー' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitBtn = screen.getByTestId('form-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('contractorId-error')).toHaveTextContent('所属外注先企業を選択してください。');
    });
  });

  it('TS-015-004: 権限で工場管理者を選択した際、所属外注先企業の選択プルダウンが非表示となること', async () => {
    userMocks.mockGetUsersExecute.mockResolvedValue({ success: true, value: [] });
    userMocks.mockGetContractorsExecute.mockResolvedValue({ success: true, value: [] });

    render(<AdminUserRegisterPage />);

    // 新規登録モーダル展開
    const registerBtn = await screen.findByTestId('user-register-btn');
    fireEvent.click(registerBtn);

    // デフォルトで「工場管理者」が選択されている状態
    expect(screen.queryByTestId('contractor-select-container')).not.toBeInTheDocument();
  });

  it('TS-015-005: セッションが存在しないか、ロールが外注先管理者の場合は直ちにログイン画面へ自動リダイレクトされること', async () => {
    userMocks.mockGetUsersExecute.mockResolvedValue({ success: true, value: [] });
    userMocks.mockGetContractorsExecute.mockResolvedValue({ success: true, value: [] });

    // ロールを CONTRACTOR_MANAGER に差し替える
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });
});
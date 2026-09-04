import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminUserRegisterPage from '../../app/(factory)/admin-user-register/page';
import { ToastProvider } from '../../components/ui/toast';

const {
  mockReplace,
  mockPush,
  mockRouter,
  mockExecuteGetUsers,
  mockExecuteSaveUser,
  mockExecuteDeleteUser,
  mockFindAllContractors,
} = vi.hoisted(() => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();
  const mockExecuteGetUsers = vi.fn();
  const mockExecuteSaveUser = vi.fn();
  const mockExecuteDeleteUser = vi.fn();
  const mockFindAllContractors = vi.fn().mockResolvedValue([]);
  return {
    mockReplace,
    mockPush,
    mockRouter: {
      replace: mockReplace,
      push: mockPush,
    },
    mockExecuteGetUsers,
    mockExecuteSaveUser,
    mockExecuteDeleteUser,
    mockFindAllContractors,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// UseCase のモック
vi.mock('../../features/user/usecase/getUsersUseCase', () => {
  return {
    GetUsersUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteGetUsers,
      };
    }),
  };
});

vi.mock('../../features/user/usecase/saveUserUseCase', () => {
  return {
    SaveUserUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteSaveUser,
      };
    }),
  };
});

vi.mock('../../features/user/usecase/deleteUserUseCase', () => {
  return {
    DeleteUserUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteDeleteUser,
      };
    }),
  };
});

// Contractors Repositoryのモック
vi.mock('../../features/contractor/repository/contractorRepository', () => {
  return {
    IndexedDBContractorRepository: vi.fn().mockImplementation(() => {
      return {
        findAll: mockFindAllContractors,
      };
    }),
  };
});

describe('SCR-015: 管理者ユーザー登録画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <AdminUserRegisterPage />
      </ToastProvider>
    );
  };

  it('SCR-015-UT-001: 登録済みの管理者ユーザー一覧がテーブルに正しく描画されていること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    const mockUsers = [
      {
        user_id: 'u111',
        login_id: 'subcon_oshima',
        role: 'CONTRACTOR_MANAGER',
        display_name: '大島 茂',
        contractor_id: 'c111',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00.000Z',
        updated_at: '2026-04-13T00:00:00.000Z',
      },
      {
        user_id: 'u333',
        login_id: 'factory_admin',
        role: 'FACTORY_ADMIN',
        display_name: '工場管理責任者',
        contractor_id: null,
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00.000Z',
        updated_at: '2026-04-13T00:00:00.000Z',
      }
    ];

    mockExecuteGetUsers.mockResolvedValue({
      success: true,
      value: mockUsers,
    });

    mockFindAllContractors.mockResolvedValue([
      { contractor_id: 'c111', name: '株式会社大島組', status: 'ACTIVE' }
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('大島 茂')).toBeInTheDocument();
    expect(screen.getByText('subcon_oshima')).toBeInTheDocument();
    expect(screen.getByText('外注先管理者')).toBeInTheDocument();
    expect(screen.getByText('工場管理責任者')).toBeInTheDocument();
    expect(screen.getByText('工場管理者')).toBeInTheDocument();
  });

  it('SCR-015-UT-002: 空文字やパスワード重複チェックなどでバリデーションエラーが描画されること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetUsers.mockResolvedValue({ success: true, value: [] });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /新規登録/ });
    fireEvent.click(newBtn);

    // 空文字で保存を押下
    const saveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('表示名を入力してください。')).toBeInTheDocument();
      expect(screen.getByText('ログインIDを入力してください。')).toBeInTheDocument();
    });
  });

  it('SCR-015-UT-003: 外注先管理者を選択し所属企業が空の時にバリデーションエラーとなること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetUsers.mockResolvedValue({ success: true, value: [] });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /新規登録/ });
    fireEvent.click(newBtn);

    // 権限を外注先管理者に変更
    const radioBtn = screen.getByLabelText('外注先管理者');
    fireEvent.click(radioBtn);

    // 保存ボタンクリック
    const saveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('所属外注先企業を選択してください。')).toBeInTheDocument();
    });
  });

  it('SCR-015-UT-004: 未ログイン、または認可外でアクセスした際、管理者ログイン画面へ即リダイレクトされること', async () => {
    sessionStorage.clear(); // 未セッション

    renderComponent();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    });
  });
});
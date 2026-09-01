import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AdminUserRegisterPage from '../app/(factory)/admin-users/page';

const mockUsers = [
  {
    user_id: "admin-default-id",
    contractor_id: null,
    role: "FACTORY_ADMIN" as const,
    login_id: "admin_test",
    password_hash: "YWRtaW4xMjM=",
    display_name: "工場管理者",
    status: "ACTIVE" as const,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z"
  },
  {
    user_id: "user-2",
    contractor_id: "c1",
    role: "CONTRACTOR_MANAGER" as const,
    login_id: "sub_test",
    password_hash: "c3ViMTIz",
    display_name: "外注先管理者A",
    status: "ACTIVE" as const,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z"
  }
];

const mockContractors = [
  { contractor_id: "c1", name: "A建設", status: "ACTIVE" as const, created_at: "2026-04-13T00:00:00Z", updated_at: "2026-04-13T00:00:00Z" },
  { contractor_id: "c2", name: "B工業", status: "ACTIVE" as const, created_at: "2026-04-13T00:00:00Z", updated_at: "2026-04-13T00:00:00Z" }
];

vi.mock('@/features/user/usecase/userUsecase', () => {
  return {
    UserUsecase: vi.fn().mockImplementation(() => {
      return {
        getUsersList: vi.fn().mockResolvedValue({ success: true, value: mockUsers }),
        getContractorsList: vi.fn().mockResolvedValue({ success: true, value: mockContractors }),
        registerUser: vi.fn().mockResolvedValue({ success: true }),
        modifyUser: vi.fn().mockResolvedValue({ success: true }),
        disableUser: vi.fn().mockResolvedValue({ success: true })
      };
    })
  };
});

describe('SCR-015 管理者ユーザー登録画面', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store: { [key: string]: string } = {
      user_id: 'admin-default-id',
      role: 'FACTORY_ADMIN'
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); }
      },
      writable: true
    });
  });

  it('初期ロードが走り、登録済みのユーザーがテーブル形式で表示されること', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.getByText('admin_test')).toBeInTheDocument();
      expect(screen.getByText('sub_test')).toBeInTheDocument();
      expect(screen.getByText('外注先管理者A')).toBeInTheDocument();
    });
  });

  it('新規登録ボタンを押下すると新規登録モーダルが表示されること', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.getByText('admin_test')).toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: '新規登録' });
    fireEvent.click(newBtn);

    expect(screen.getByText('ユーザーアカウント新規登録')).toBeInTheDocument();
  });
});
"
    },
    {
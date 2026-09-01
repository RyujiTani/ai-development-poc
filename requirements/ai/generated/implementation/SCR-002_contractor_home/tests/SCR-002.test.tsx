import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractorHomePage from '@/app/(contractor)/home/page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

const mockGetUserById = vi.fn();
vi.mock('@/features/user/repository/userRepository', () => {
  return {
    IndexedDBUserRepository: vi.fn().mockImplementation(() => {
      return {
        getUserById: mockGetUserById,
      };
    }),
  };
});

vi.mock('@/lib/db/indexedDB', () => ({
  initializeSeedData: vi.fn().mockResolvedValue(undefined),
}));

describe('SCR-002 外注先ホーム画面テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const sessionStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
    })();
    vi.stubGlobal('sessionStorage', sessionStorageMock);
  });

  it('sessionStorageに認証情報がない場合、ログイン画面にリダイレクトされること (TST-SCR-002-001)', async () => {
    render(<ContractorHomePage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('認証完了後にユーザー名が画面上部に正しく表示されること (TST-SCR-002-002)', async () => {
    sessionStorage.setItem('user_id', 'usr001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    mockGetUserById.mockResolvedValue({
      success: true,
      value: {
        user_id: 'usr001',
        display_name: 'テスト外注先管理者',
        role: 'CONTRACTOR_MANAGER',
      },
    });

    render(<ContractorHomePage />);

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    expect(screen.getByText('🏢 テスト外注先管理者')).toBeInTheDocument();
  });

  it('打刻ボタンクリック時に打刻モード選択画面(SCR-003)へ遷移すること (TST-SCR-002-003)', async () => {
    sessionStorage.setItem('user_id', 'usr001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    mockGetUserById.mockResolvedValue({
      success: true,
      value: {
        user_id: 'usr001',
        display_name: 'テスト外注先管理者',
        role: 'CONTRACTOR_MANAGER',
      },
    });

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    const punchButton = screen.getByText('打刻').closest('button');
    expect(punchButton).toBeInTheDocument();
    if (punchButton) {
      fireEvent.click(punchButton);
    }

    expect(mockPush).toHaveBeenCalledWith('/contractor/punch-mode');
  });

  it('作業員管理ボタンクリック時に作業員一覧画面(SCR-007)へ遷移すること (TST-SCR-002-004)', async () => {
    sessionStorage.setItem('user_id', 'usr001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    mockGetUserById.mockResolvedValue({
      success: true,
      value: {
        user_id: 'usr001',
        display_name: 'テスト外注先管理者',
        role: 'CONTRACTOR_MANAGER',
      },
    });

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    const workersButton = screen.getByText('作業員管理').closest('button');
    expect(workersButton).toBeInTheDocument();
    if (workersButton) {
      fireEvent.click(workersButton);
    }

    expect(mockPush).toHaveBeenCalledWith('/contractor/workers');
  });

  it('ログアウト時にsessionStorageを破棄してログイン画面に遷移すること (TST-SCR-002-005)', async () => {
    sessionStorage.setItem('user_id', 'usr001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    mockGetUserById.mockResolvedValue({
      success: true,
      value: {
        user_id: 'usr001',
        display_name: 'テスト外注先管理者',
        role: 'CONTRACTOR_MANAGER',
      },
    });

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    const logoutBtn = screen.getByText('ログアウト');
    fireEvent.click(logoutBtn);

    expect(sessionStorage.getItem('user_id')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

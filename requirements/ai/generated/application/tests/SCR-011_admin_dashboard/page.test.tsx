import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AdminDashboardPage from '@/app/(factory)/dashboard/page';

// router のモック (毎レンダリングで新しいオブジェクト参照を生成して無限再レンダリングを引き起こすのを防止するため、安定した参照を返すように修正)
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
};
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// UseCase のモック
const mockGetDashboardData = vi.fn();
vi.mock('@/features/dashboard/usecase/getDashboardData', () => ({
  getDashboardData: () => mockGetDashboardData(),
}));

// mockAuth のモック
const mockLogoutMock = vi.fn();
vi.mock('@/lib/auth/mockAuth', () => ({
  logoutMock: () => mockLogoutMock(),
}));

// initDB (IndexedDBラッパ) のモック
vi.mock('@/lib/db/indexedDB', () => ({
  initDB: vi.fn(() => Promise.resolve({
    transaction: () => ({
      objectStore: () => ({
        get: () => Promise.resolve({
          user_id: 'u2-uuid',
          contractor_id: null,
          role: 'FACTORY_ADMIN',
          login_id: 'admin1',
          display_name: '佐藤 工場管理者',
          status: 'ACTIVE',
        }),
      }),
    }),
  })),
}));

// sessionStorage のモック
class SessionStorageMock {
  private store: Record<string, string> = {};
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}
const sessionStorageMock = new SessionStorageMock();
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock });

describe('AdminDashboardPage (SCR-011_admin_dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  it('未認証状態の場合、管理者ログイン画面へ強制リダイレクトされること (TST-011-001)', async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin-login');
    });
  });

  it('外注先管理者アカウント（role が CONTRACTOR_MANAGER）の場合、強制リダイレクトされること (TST-011-001)', async () => {
    sessionStorageMock.setItem('user_id', 'u1-uuid');
    sessionStorageMock.setItem('role', 'CONTRACTOR_MANAGER');

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin-login');
    });
  });

  it('サマリー情報がカード形式で正常に表示されること (TST-011-002)', async () => {
    sessionStorageMock.setItem('user_id', 'u2-uuid');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    mockGetDashboardData.mockResolvedValue({
      summary: {
        active_workers_count: 35,
        clocked_in_count: 18,
        clocked_out_count: 10,
      },
      alerts: [
        {
          alert_id: 'alert-mock-1',
          level: 'LOW',
          message: '本日の配置・打刻状況に異常はありません。',
          occurred_at: '2026-04-13T09:00:00Z',
        },
      ],
    });

    render(<AdminDashboardPage />);

    // 読み込み完了とユーザー名の表示を確認
    await screen.findByText('佐藤 工場管理者');

    expect(screen.getByTestId('summary-active-workers').textContent).toBe('35');
    expect(screen.getByTestId('summary-clocked-in').textContent).toBe('18');
    expect(screen.getByTestId('summary-clocked-out').textContent).toBe('10');
  });

  it('直近のアラート情報が重要度に応じたスタイルでリスト表示されること (TST-011-003)', async () => {
    sessionStorageMock.setItem('user_id', 'u2-uuid');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    mockGetDashboardData.mockResolvedValue({
      summary: {
        active_workers_count: 10,
        clocked_in_count: 5,
        clocked_out_count: 2,
      },
      alerts: [
        {
          alert_id: 'alert-high-1',
          level: 'HIGH',
          message: '安全教育未受講者が出勤しています',
          occurred_at: '2026-04-13T08:30:00Z',
        },
        {
          alert_id: 'alert-medium-1',
          level: 'MEDIUM',
          message: '出勤から退勤打刻がありません',
          occurred_at: '2026-04-13T10:15:00Z',
        },
      ],
    });

    render(<AdminDashboardPage />);

    await screen.findByText('佐藤 工場管理者');

    const highAlert = screen.getByTestId('alert-item-alert-high-1');
    expect(highAlert).toHaveTextContent('HIGH');
    expect(highAlert).toHaveTextContent('安全教育未受講者が出勤しています');

    const mediumAlert = screen.getByTestId('alert-item-alert-medium-1');
    expect(mediumAlert).toHaveTextContent('MEDIUM');
    expect(mediumAlert).toHaveTextContent('出勤から退勤打刻がありません');
  });

  it('ナビゲーションメニューから、打刻履歴確認等の各画面へ遷移可能であること (TST-011-004)', async () => {
    sessionStorageMock.setItem('user_id', 'u2-uuid');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    mockGetDashboardData.mockResolvedValue({
      summary: { active_workers_count: 5, clocked_in_count: 2, clocked_out_count: 1 },
      alerts: [],
    });

    render(<AdminDashboardPage />);

    await screen.findByText('佐藤 工場管理者');

    // 「打刻履歴確認」ボタンのクリック
    const navHistoryButton = screen.getByTestId('nav-history');
    fireEvent.click(navHistoryButton);
    expect(mockPush).toHaveBeenCalledWith('/factory/attendance-history');

    // 「労働時間集計」ボタンのクリック
    const navSummaryButton = screen.getByTestId('nav-summary');
    fireEvent.click(navSummaryButton);
    expect(mockPush).toHaveBeenCalledWith('/factory/labor-summary');
  });

  it('ログアウトボタンを押下した際、セッションが破棄されログイン画面にリダイレクトされること (TST-011-005)', async () => {
    sessionStorageMock.setItem('user_id', 'u2-uuid');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    mockGetDashboardData.mockResolvedValue({
      summary: { active_workers_count: 5, clocked_in_count: 2, clocked_out_count: 1 },
      alerts: [],
    });

    render(<AdminDashboardPage />);

    await screen.findByText('佐藤 工場管理者');

    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton);

    expect(mockLogoutMock).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/admin-login');
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DashboardPage from '../app/(factory)/dashboard/page';
import { AuthProvider } from '../lib/auth/authContext';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

const mockGetDashboardData = vi.fn().mockResolvedValue({
  summary: {
    todayWorkingCount: 25,
    todayTotalPunchedCount: 40,
    activeContractorCount: 5,
    totalWorkerCount: 120,
  },
  alerts: [
    {
      alert_id: 'alert-1',
      type: 'WARNING',
      message: '連続勤務時間が8時間を超過しています（現在進行中）',
      target_name: '山田 太郎',
      occurred_at: '2026-04-13T08:00:00Z',
    },
  ],
});

vi.mock('../features/dashboard/repository/dashboardRepository', () => {
  return {
    IndexedDBDashboardRepository: vi.fn().mockImplementation(() => {
      return {
        getDashboardData: mockGetDashboardData,
      };
    }),
  };
});

describe('SCR-011 工場管理者総合ダッシュボード', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('TST-011-001: 未認証状態でアクセスした場合、ログイン画面へリダイレクトされること', async () => {
    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-011-002: FACTORY_ADMINとして認証状態なら初期表示時にダッシュボード表示データ取得APIが呼ばれること', async () => {
    sessionStorage.setItem('user_id', 'u-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場側管理者');

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockGetDashboardData).toHaveBeenCalled();
    });
  });

  it('TST-011-003: 稼働人数サマリーが正しく画面に反映されていること', async () => {
    sessionStorage.setItem('user_id', 'u-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場側管理者');

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      const workingCountElem = screen.getByTestId('working-count');
      expect(workingCountElem.textContent).toContain('25');
    });
  });

  it('TST-011-004: アラートリストが正しく表示されること', async () => {
    sessionStorage.setItem('user_id', 'u-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場側管理者');

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      const alertListElem = screen.getByTestId('alert-list');
      expect(alertListElem.textContent).toContain('山田 太郎');
      expect(alertListElem.textContent).toContain('連続勤務時間が8時間を超過しています');
    });
  });

  it('TST-011-005: ナビゲーションメニュー押下時に対象画面に遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場側管理者');

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      const navBtn = screen.getByTestId('nav-history');
      fireEvent.click(navBtn);
      expect(mockPush).toHaveBeenCalledWith('/attendance-history');
    });
  });

  it('TST-011-006: ログアウト押下時にセッションが削除されログイン画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場側管理者');

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      const logoutBtn = screen.getByTestId('logout-button');
      fireEvent.click(logoutBtn);
    });

    expect(sessionStorage.getItem('user_id')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

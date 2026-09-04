import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboardPage from '../../app/(factory)/admin/dashboard/page';
import { ToastProvider } from '../../components/ui/toast';

// Routerの安定したモックとUsecaseのモックをhoist
const { mockPush, mockRouter, mockExecuteGetDashboard } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockExecuteGetDashboard = vi.fn();
  return {
    mockPush,
    mockExecuteGetDashboard,
    mockRouter: {
      push: mockPush,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('../../features/report/usecase/getAdminDashboardUseCase', () => {
  return {
    GetAdminDashboardUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteGetDashboard,
      };
    }),
  };
});

describe('SCR-011: 総合ダッシュボード画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <AdminDashboardPage />
      </ToastProvider>
    );
  };

  it('TS-SCR-011-005: 未ログイン状態でアクセスした際、管理者ログイン画面へリダイレクトされること', async () => {
    sessionStorage.clear();

    renderComponent();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/login');
    });
  });

  it('TS-SCR-011-001 & TS-SCR-011-002: ダッシュボードサマリーおよびアラートリストが正常に表示されること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    const mockSummary = {
      activeContractorsCount: 3,
      totalWorkersCount: 25,
      todayClockedInCount: 15,
      todayClockedOutCount: 10,
      alerts: [
        {
          id: 'alert-punch-w001',
          type: 'PUNCH_MISSING',
          message: '【退勤打刻なし】大島組の大島 太郎さんは本日退勤打刻がありません。',
          severity: 'medium',
          occurredAt: '2026-04-13T08:00:00Z',
        },
        {
          id: 'alert-training-w002',
          type: 'QUALIFICATION_ALERT',
          message: '【講習未受講】佐藤工業の佐藤 一郎さんは安全講習履歴がありません。',
          severity: 'high',
          occurredAt: '2026-04-13T08:30:00Z',
        },
      ],
    };

    mockExecuteGetDashboard.mockResolvedValue({
      success: true,
      value: mockSummary,
    });

    renderComponent();

    // ローディングが外れるまで待つ
    await waitFor(() => {
      expect(screen.queryByText('ダッシュボード初期化中...')).not.toBeInTheDocument();
    });

    // 各カード数値が表示されること
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    // アラートが表示されること
    expect(screen.getByText('打刻漏れ')).toBeInTheDocument();
    expect(screen.getByText('配置要確認')).toBeInTheDocument();
    expect(
      screen.getByText('【退勤打刻なし】大島組の大島 太郎さんは本日退勤打刻がありません。')
    ).toBeInTheDocument();
  });

  it('TS-SCR-011-003: 各管理画面へのアンカー導線が配置されていること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetDashboard.mockResolvedValue({
      success: true,
      value: {
        activeContractorsCount: 0,
        totalWorkersCount: 0,
        todayClockedInCount: 0,
        todayClockedOutCount: 0,
        alerts: [],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('ダッシュボード初期化中...')).not.toBeInTheDocument();
    });

    // リンクアンカーボタンが存在すること
    expect(screen.getByText('打刻履歴確認 (SCR-012)')).toBeInTheDocument();
    expect(screen.getByText('労働時間集計 (SCR-013)')).toBeInTheDocument();
    expect(screen.getByText('外注先企業登録 (SCR-014)')).toBeInTheDocument();
    expect(screen.getByText('管理者ユーザー登録 (SCR-015)')).toBeInTheDocument();
  });

  it('TS-SCR-011-006 & TS-SCR-011-007 & TS-SCR-011-008 & TS-SCR-011-009: メニュークリックにより適切なパスにルーティングが呼ばれること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetDashboard.mockResolvedValue({
      success: true,
      value: {
        activeContractorsCount: 0,
        totalWorkersCount: 0,
        todayClockedInCount: 0,
        todayClockedOutCount: 0,
        alerts: [],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('ダッシュボード初期化中...')).not.toBeInTheDocument();
    });

    // 打刻履歴確認へ遷移
    const historyButton = screen.getByText('打刻履歴確認 (SCR-012)').closest('button');
    fireEvent.click(historyButton!);
    expect(mockPush).toHaveBeenCalledWith('/admin/attendance-history');

    // 労働時間集計へ遷移
    const laborButton = screen.getByText('労働時間集計 (SCR-013)').closest('button');
    fireEvent.click(laborButton!);
    expect(mockPush).toHaveBeenCalledWith('/admin/labor-summary');

    // 外注先企業登録へ遷移
    const contractorButton = screen.getByText('外注先企業登録 (SCR-014)').closest('button');
    fireEvent.click(contractorButton!);
    expect(mockPush).toHaveBeenCalledWith('/admin/contractors');

    // 管理者ユーザー登録へ遷移
    const userButton = screen.getByText('管理者ユーザー登録 (SCR-015)').closest('button');
    fireEvent.click(userButton!);
    expect(mockPush).toHaveBeenCalledWith('/admin-user-register');
  });

  it('TS-SCR-011-004: ログアウトボタン押下により、sessionStorage がクリアされ管理者ログイン画面に遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetDashboard.mockResolvedValue({
      success: true,
      value: {
        activeContractorsCount: 0,
        totalWorkersCount: 0,
        todayClockedInCount: 0,
        todayClockedOutCount: 0,
        alerts: [],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('ダッシュボード初期化中...')).not.toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButton);

    // セッションクリア
    expect(sessionStorage.getItem('user_id')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();

    // ログイン画面へリダイレクト
    expect(mockPush).toHaveBeenCalledWith('/admin/login');
  });
});
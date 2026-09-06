import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, vi, describe, it, beforeEach } from 'vitest';
import AdminDashboardPage from '../../app/(factory)/dashboard/page';

// sessionStorageのモック
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

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// next/navigation のモック
const mockPush = vi.fn();
const mockReplace = vi.fn();
const stableRouter = {
  push: mockPush,
  replace: mockReplace,
};
vi.mock('next/navigation', () => ({
  useRouter: () => stableRouter,
}));

// loggerのモック
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// GetDashboardDataUseCaseのモック
const mockExecute = vi.fn();
vi.mock('@/features/report/usecase/getDashboardDataUseCase', () => {
  return {
    GetDashboardDataUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecute,
      };
    }),
  };
});

describe('SCR-011 総合ダッシュボードのテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('未認証状態（sessionStorageが空）の時、管理者ログイン画面へ強制リダイレクトされること', async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('認証されているがロールがFACTORY_ADMIN以外の場合、管理者ログイン画面へ強制リダイレクトされること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER'); // 無効なロール

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('FACTORY_ADMINで認証されている時、正常にダッシュボード情報をロード・表示できること', async () => {
    sessionStorage.setItem('user_id', 'usr-admin');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    // 成功モックデータを定義
    mockExecute.mockResolvedValue({
      success: true,
      value: {
        summary: {
          total_workers: 45,
          active_workers: 23,
          total_contractors: 4,
        },
        alerts: [
          {
            id: 'alert-punch-1',
            type: 'PUNCH_MISSING',
            message: '山田 太郎さんの出勤打刻から12時間以上が経過しています。',
            occurred_at: '2026-04-13T08:00:00Z',
          },
          {
            id: 'alert-training-1',
            type: 'TRAINING_REQUIRED',
            message: '鈴木 三郎さんは安全衛生教育講習の受講履歴がありません。',
            occurred_at: '2026-04-13T00:00:00Z',
          }
        ],
      },
    });

    render(<AdminDashboardPage />);

    // ローディング表示の確認
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // ロード完了後の表示を検証
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByTestId('active-workers-count')).toHaveTextContent('23');
    expect(screen.getByTestId('total-workers-count')).toHaveTextContent('45');
    expect(screen.getByTestId('total-contractors-count')).toHaveTextContent('4');

    // アラートの検証
    expect(screen.getByText('山田 太郎さんの出勤打刻から12時間以上が経過しています。')).toBeInTheDocument();
    expect(screen.getByText('鈴木 三郎さんは安全衛生教育講習の受講履歴がありません。')).toBeInTheDocument();

    // 各管理画面へのナビゲーションリンクが存在することの検証
    expect(screen.getByTestId('link-attendance-history')).toBeInTheDocument();
    expect(screen.getByTestId('link-labor-summary')).toBeInTheDocument();
    expect(screen.getByTestId('link-contractors')).toBeInTheDocument();
    expect(screen.getByTestId('link-admin-users')).toBeInTheDocument();
  });

  it('アラートが0件の時、「現在アラートはありません。」と画面に表示されること', async () => {
    sessionStorage.setItem('user_id', 'usr-admin');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    mockExecute.mockResolvedValue({
      success: true,
      value: {
        summary: {
          total_workers: 10,
          active_workers: 5,
          total_contractors: 2,
        },
        alerts: [], // アラート0件
      },
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('no-alerts-message')).toHaveTextContent('現在アラートはありません。');
    });
  });

  it('各クイックメニューをクリックした際、対応するURLへ正しく画面遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-admin');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    mockExecute.mockResolvedValue({
      success: true,
      value: {
        summary: { total_workers: 10, active_workers: 5, total_contractors: 2 },
        alerts: [],
      },
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // 「打刻履歴確認」ボタンのクリック
    fireEvent.click(screen.getByTestId('link-attendance-history'));
    expect(mockPush).toHaveBeenCalledWith('/attendance-history');

    // 「労働時間集計」ボタンのクリック
    fireEvent.click(screen.getByTestId('link-labor-summary'));
    expect(mockPush).toHaveBeenCalledWith('/labor-summary');

    // 「外注先企業登録」ボタンのクリック
    fireEvent.click(screen.getByTestId('link-contractors'));
    expect(mockPush).toHaveBeenCalledWith('/contractors');

    // 「管理者ユーザー登録」ボタンのクリック
    fireEvent.click(screen.getByTestId('link-admin-users'));
    expect(mockPush).toHaveBeenCalledWith('/admin-users');
  });

  it('ログアウト操作を行った際、セッションがクリアされログイン画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-admin');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    mockExecute.mockResolvedValue({
      success: true,
      value: {
        summary: { total_workers: 10, active_workers: 5, total_contractors: 2 },
        alerts: [],
      },
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // ログアウトボタン押下
    fireEvent.click(screen.getByTestId('logout-btn'));

    // sessionStorageがクリアされていること
    expect(sessionStorage.getItem('user_id')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();

    // ログイン画面へ遷移したこと
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('モバイル画面幅におけるメニュー開閉トグルの操作が正常に機能すること', async () => {
    sessionStorage.setItem('user_id', 'usr-admin');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    mockExecute.mockResolvedValue({
      success: true,
      value: {
        summary: { total_workers: 10, active_workers: 5, total_contractors: 2 },
        alerts: [],
      },
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // 初期状態ではモバイルサイドバーは非表示
    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();

    // メニュートグルをクリックして開く
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();

    // メニュー内のログアウトボタンがモバイルドロワー内にも存在することを確認
    expect(screen.getByTestId('mobile-logout-btn')).toBeInTheDocument();
  });
});
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PunchCompletePage from '../../app/(contractor)/contractor/punch-complete/page';
import { ToastProvider } from '../../components/ui/toast';
import { useAttendanceStore } from '../../features/attendance/store/useAttendanceStore';

// Next.js ナビゲーションの安定したモック
const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('SCR-006: 打刻完了画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAttendanceStore.getState().clearAttendanceSession();
    useAttendanceStore.getState().setLastPunchSummary(null);
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <PunchCompletePage />
      </ToastProvider>
    );
  };

  it('TS-SCR-006-001: 前画面から引き渡された打刻情報（出勤、5名）を含む送信完了メッセージが、画面中央に正しく表示されていること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    // Zustandストアに前画面からの打刻完了情報をセット
    useAttendanceStore.getState().setLastPunchSummary({
      punchType: 'CLOCK_IN',
      workerCount: 5,
    });

    renderComponent();

    // 読み込み中表示が消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 送信完了メッセージと送信内容サマリーが表示されていること
    expect(screen.getByText('送信完了')).toBeInTheDocument();
    expect(screen.getByText('出勤')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // 画面中央に配置されているためのflexコンテナなどの配置クラスが親に指定されていること
    const mainElement = screen.getByRole('main');
    expect(mainElement.className).toContain('flex');
    expect(mainElement.className).toContain('items-center');
    expect(mainElement.className).toContain('justify-center');
  });

  it('TS-SCR-006-002: 「ホームへ戻る」ボタンが、十分なタップ高さ（h-14 等）を持ち、レスポンシブなスタイルになっていること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const homeButton = screen.getByRole('button', { name: /ホームへ戻る/ });
    expect(homeButton).toBeInTheDocument();
    
    // タップしやすいようにh-14のクラスが付いていることを確認
    expect(homeButton.className).toContain('h-14');
  });

  it('TS-SCR-006-003: 未認証状態で打刻完了画面（SCR-006）へアクセスした際、ログイン画面（/login）へリダイレクトされること', async () => {
    sessionStorage.clear(); // 未認証状態

    renderComponent();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-SCR-006-004: 「ホームへ戻る」ボタンを押下した際、外注先ホーム画面（/contractor）へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const homeButton = screen.getByRole('button', { name: /ホームへ戻る/ });
    fireEvent.click(homeButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor');
    });

    // ストアの一時情報がクリアされていることもアサーション
    expect(useAttendanceStore.getState().lastPunchSummary).toBeNull();
  });
});
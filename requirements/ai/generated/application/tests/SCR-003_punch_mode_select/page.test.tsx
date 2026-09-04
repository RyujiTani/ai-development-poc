import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PunchModeSelectPage from '../../app/(contractor)/contractor/punch-mode/page';
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

describe('SCR-003: 打刻モード選択画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
    useAttendanceStore.getState().clearAttendanceSession();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <PunchModeSelectPage />
      </ToastProvider>
    );
  };

  it('TS-003-004: 未ログイン状態でアクセスした際、/login にリダイレクトされること', async () => {
    sessionStorage.clear();

    renderComponent();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-003-003: システム日時を固定し、現在日時の表示領域にその日時がフォーマットされて表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    // 2026/04/13 (月) 12:00:00 (ローカル時刻として12時)
    const mockDate = new Date(2026, 3, 13, 12, 0, 0);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(mockDate);

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const displayElement = document.getElementById('current-time-display');
    expect(displayElement).toBeInTheDocument();
    expect(displayElement?.textContent).toContain('2026/04/13');
    expect(displayElement?.textContent).toContain('12:00:00');

    vi.useRealTimers();
  });

  it('TS-003-001: 「出勤」ボタンをクリックした際、打刻モードが CLOCK_IN に設定され、作業員選択画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const punchInButton = screen.getByRole('button', { name: /出勤（作業開始）/ });
    fireEvent.click(punchInButton);

    // Zustand ストアの状態を検証
    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_IN');
    // ルーターの遷移を検証
    expect(mockPush).toHaveBeenCalledWith('/contractor/worker-select');
  });

  it('TS-003-002: 「退勤」ボタンをクリックした際、打刻モードが CLOCK_OUT に設定され、作業員選択画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const punchOutButton = screen.getByRole('button', { name: /退勤（作業終了）/ });
    fireEvent.click(punchOutButton);

    // Zustand ストアの状態を検証
    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_OUT');
    // ルーターの遷移を検証
    expect(mockPush).toHaveBeenCalledWith('/contractor/worker-select');
  });

  it('TS-003-005: 「戻る」ボタンをクリックした際、外注先ホーム画面（/contractor）へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /メニューに戻る/ });
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor');
  });
});
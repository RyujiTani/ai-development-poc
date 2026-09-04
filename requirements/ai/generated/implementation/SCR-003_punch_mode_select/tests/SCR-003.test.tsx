import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PunchModePage from '@/app/(contractor)/punch-mode/page';
import { useAuthStore } from '@/lib/auth/store';
import { usePunchStore } from '@/features/attendance/store/punchStore';

// Next.jsのナビゲーションをモック化
const { mockPush, mockReplace } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  return { mockPush, mockReplace };
});

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
}));

describe('SCR-003 打刻モード選択画面の検証', () => {
  const mockUser = {
    user_id: 'user-1',
    contractor_id: 'contractor-1',
    role: 'CONTRACTOR_MANAGER' as const,
    login_id: 'contractor_mgr_1',
    password_hash: 'hashed_pw',
    display_name: 'テスト外注先管理者',
    status: 'ACTIVE' as const,
    created_at: '2026-04-13T00:00:00Z',
    updated_at: '2026-04-13T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });
    usePunchStore.setState({
      punchMode: null,
    });
  });

  it('未認証状態の場合、自動的にログイン画面（/login）へリダイレクトされること', () => {
    render(<PunchModePage />);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('認証完了している場合、管理者名および現在日時が表示されること', () => {
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
    });

    vi.useFakeTimers();
    const mockTime = new Date('2026-04-13T10:00:00');
    vi.setSystemTime(mockTime);

    render(<PunchModePage />);

    expect(screen.getByText('テスト外注先管理者')).toBeInTheDocument();
    expect(screen.getByTestId('current-datetime')).toHaveTextContent('2026年04月13日 10:00');

    vi.useRealTimers();
  });

  it('「出勤」ボタン押下時に、punchModeがCLOCK_INに更新されて作業員選択画面へ遷移すること', () => {
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
    });

    render(<PunchModePage />);

    const clockInButton = screen.getByRole('button', { name: '出勤' });
    fireEvent.click(clockInButton);

    expect(usePunchStore.getState().punchMode).toBe('CLOCK_IN');
    expect(mockPush).toHaveBeenCalledWith('/(contractor)/worker-select');
  });

  it('「退勤」ボタン押下時に、punchModeがCLOCK_OUTに更新されて作業員選択画面へ遷移すること', () => {
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
    });

    render(<PunchModePage />);

    const clockOutButton = screen.getByRole('button', { name: '退勤' });
    fireEvent.click(clockOutButton);

    expect(usePunchStore.getState().punchMode).toBe('CLOCK_OUT');
    expect(mockPush).toHaveBeenCalledWith('/(contractor)/worker-select');
  });

  it('「戻る」ボタン押下時に、外注先ホーム画面（/(contractor)/home）へ戻ること', () => {
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
    });

    render(<PunchModePage />);

    const backButton = screen.getByRole('button', { name: 'ホーム画面へ戻る' });
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/(contractor)/home');
  });
});
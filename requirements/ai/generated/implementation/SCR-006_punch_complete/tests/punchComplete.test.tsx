import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import PunchCompletePage from '../app/(contractor)/punch-complete/page';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import { useAuthStore } from '@/lib/auth/authStore';

// Next.jsの安定したuseRouterモックの定義 (Test Mock Consistency遵守)
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

describe('SCR-006 PunchCompletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // sessionStorageのモック
    const store: Record<string, string> = {};
    const sessionStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key in store) {
          delete store[key];
        }
      },
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    useAttendanceStore.getState().setPunchResult(null);
    useAuthStore.getState().logout();
  });

  it('TST-006-001: 正しく認証され、打刻結果が存在する場合、完了画面に内容が反映されて表示されること', async () => {
    const mockUser = {
      user_id: 'user-123',
      contractor_id: 'contractor-456',
      role: 'CONTRACTOR_MANAGER' as const,
      login_id: 'test-manager',
      display_name: 'テスト管理者',
      status: 'ACTIVE' as const,
    };
    sessionStorage.setItem('auth_user', JSON.stringify(mockUser));
    useAuthStore.getState().login(mockUser);

    useAttendanceStore.getState().setPunchResult({
      punchType: 'CLOCK_IN',
      workerCount: 3,
      timestamp: '2026-04-13T09:00:00.000Z',
    });

    render(<PunchCompletePage />);

    expect(screen.getByText('打刻の送信が完了しました')).toBeInTheDocument();
    expect(screen.getByText('出勤')).toBeInTheDocument();
    expect(screen.getByText('3 名')).toBeInTheDocument();
  });

  it('TST-006-002: 「ホームへ戻る」ボタンを押下した際に、正しいパスへ遷移すること', async () => {
    const mockUser = {
      user_id: 'user-123',
      contractor_id: 'contractor-456',
      role: 'CONTRACTOR_MANAGER' as const,
      login_id: 'test-manager',
      display_name: 'テスト管理者',
      status: 'ACTIVE' as const,
    };
    sessionStorage.setItem('auth_user', JSON.stringify(mockUser));
    useAuthStore.getState().login(mockUser);

    render(<PunchCompletePage />);

    const button = screen.getByRole('button', { name: /ホームへ戻る/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
  });

  it('TST-006-003: 未認証状態の場合、ログイン画面にリダイレクトされること', async () => {
    sessionStorage.removeItem('auth_user');
    useAuthStore.getState().logout();

    render(<PunchCompletePage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('AC-006-005: 送信成功データがない（直接アクセスなど）状態でのフォールバック表示が機能すること', async () => {
    const mockUser = {
      user_id: 'user-123',
      contractor_id: 'contractor-456',
      role: 'CONTRACTOR_MANAGER' as const,
      login_id: 'test-manager',
      display_name: 'テスト管理者',
      status: 'ACTIVE' as const,
    };
    sessionStorage.setItem('auth_user', JSON.stringify(mockUser));
    useAuthStore.getState().login(mockUser);

    // punchResult は null (直接アクセス)
    render(<PunchCompletePage />);

    expect(screen.getByText('打刻の送信が完了しました')).toBeInTheDocument();
    expect(screen.getByText('不明（直接アクセス）')).toBeInTheDocument();
  });
});
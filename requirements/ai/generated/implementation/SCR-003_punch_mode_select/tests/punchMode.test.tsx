import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import PunchModePage from '../app/(contractor)/punch-mode/page';
import { useAuthStore } from '../lib/auth/authStore';
import { useAttendanceStore } from '../features/attendance/usecase/attendanceState';

// Next.js Routerのモック（参照の安定性を維持）
const { mockPush, mockReplace, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  return {
    mockPush,
    mockReplace,
    mockRouter: {
      push: mockPush,
      replace: mockReplace,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// SessionStorageのモック
const mockSessionStorage = (() => {
  let store: { [key: string]: string } = {};
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

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('PunchModePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    useAuthStore.getState().logout();
    useAttendanceStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TST-SCR-003-001: 未認証状態の場合はログイン画面にリダイレクトされること', () => {
    render(<PunchModePage />);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('TST-SCR-003-002: 認証済みのとき、画面上部に指定した現在日時が表示されること', () => {
    const mockUser = {
      user_id: 'user-123',
      contractor_id: 'cont-456',
      role: 'CONTRACTOR_MANAGER' as const,
      login_id: 'manager1',
      display_name: '山田 太郎',
      status: 'ACTIVE' as const,
    };
    mockSessionStorage.setItem('auth_user', JSON.stringify(mockUser));
    useAuthStore.getState().login(mockUser);

    // 日時を 2026年4月13日 10:00:00 に固定
    const fixedDate = new Date('2026-04-13T10:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);

    render(<PunchModePage />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText(/2026年04月13日 \(月\) 10:00:00/)).toBeInTheDocument();
  });

  it('TST-SCR-003-003: 出勤ボタンをクリックした際、打刻モードが CLOCK_IN に設定され、作業員選択画面へ遷移すること', () => {
    const mockUser = {
      user_id: 'user-123',
      contractor_id: 'cont-456',
      role: 'CONTRACTOR_MANAGER' as const,
      login_id: 'manager1',
      display_name: '山田 太郎',
      status: 'ACTIVE' as const,
    };
    mockSessionStorage.setItem('auth_user', JSON.stringify(mockUser));
    useAuthStore.getState().login(mockUser);

    render(<PunchModePage />);

    const clockInButton = screen.getByRole('button', { name: /出勤/ });
    fireEvent.click(clockInButton);

    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_IN');
    expect(mockPush).toHaveBeenCalledWith('/contractor/select-workers');
  });

  it('TST-SCR-003-004: 退勤ボタンをクリックした際、打刻モードが CLOCK_OUT に設定され、作業員選択画面へ遷移すること', () => {
    const mockUser = {
      user_id: 'user-123',
      contractor_id: 'cont-456',
      role: 'CONTRACTOR_MANAGER' as const,
      login_id: 'manager1',
      display_name: '山田 太郎',
      status: 'ACTIVE' as const,
    };
    mockSessionStorage.setItem('auth_user', JSON.stringify(mockUser));
    useAuthStore.getState().login(mockUser);

    render(<PunchModePage />);

    const clockOutButton = screen.getByRole('button', { name: /退勤/ });
    fireEvent.click(clockOutButton);

    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_OUT');
    expect(mockPush).toHaveBeenCalledWith('/contractor/select-workers');
  });

  it('TST-SCR-003-005: 戻るボタンをクリックした際、ホーム画面へ遷移すること', () => {
    const mockUser = {
      user_id: 'user-123',
      contractor_id: 'cont-456',
      role: 'CONTRACTOR_MANAGER' as const,
      login_id: 'manager1',
      display_name: '山田 太郎',
      status: 'ACTIVE' as const,
    };
    mockSessionStorage.setItem('auth_user', JSON.stringify(mockUser));
    useAuthStore.getState().login(mockUser);

    render(<PunchModePage />);

    const backButton = screen.getByRole('button', { name: /ホーム画面へ戻る/ });
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
  });
});
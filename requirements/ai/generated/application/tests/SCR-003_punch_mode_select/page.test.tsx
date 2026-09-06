import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PunchModePage from '@/app/(contractor)/punch-mode/page';
import { useAttendanceStore } from '@/features/attendance/store/useAttendanceStore';

const { mockRouter } = vi.hoisted(() => {
  return {
    mockRouter: {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }
  };
});

vi.mock('next/navigation', () => ({
  useRouter() {
    return mockRouter;
  },
}));

describe('SCR-003 PunchModePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAttendanceStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TS-003-001: sessionStorage が空の未認証状態のとき、ログイン画面へリダイレクトされること', () => {
    render(<PunchModePage />);

    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
  });

  it('TS-003-002: システム日時を 2026-04-13T10:00:00+09:00 に固定したとき、2026/04/13 の日付が表示されていること', () => {
    const mockDate = new Date('2026-04-13T10:00:00+09:00');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<PunchModePage />);

    const timeElement = screen.getByTestId('current-time');
    expect(timeElement.textContent).toContain('2026/04/13');
    expect(timeElement.textContent).toContain('10:00:00');
  });

  it('TS-003-003: 認証済み状態で「出勤」ボタンをクリックしたとき、ZustandのpunchTypeがCLOCK_INに更新され、/workers-selectへ遷移すること', () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<PunchModePage />);

    const clockInBtn = screen.getByTestId('clock-in-btn');
    fireEvent.click(clockInBtn);

    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_IN');
    expect(mockRouter.push).toHaveBeenCalledWith('/workers-select');
  });

  it('TS-003-004: 認証済み状態で「退勤」ボタンをクリックしたとき、ZustandのpunchTypeがCLOCK_OUTに更新され、/workers-selectへ遷移すること', () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<PunchModePage />);

    const clockOutBtn = screen.getByTestId('clock-out-btn');
    fireEvent.click(clockOutBtn);

    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_OUT');
    expect(mockRouter.push).toHaveBeenCalledWith('/workers-select');
  });

  it('TS-003-005: 認証済み状態で「戻る」ボタンをクリックしたとき、状態をクリアせずに /home へ遷移すること', () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<PunchModePage />);

    const backBtn = screen.getByRole('button', { name: '戻る' });
    fireEvent.click(backBtn);

    expect(useAttendanceStore.getState().punchType).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith('/home');
  });
});
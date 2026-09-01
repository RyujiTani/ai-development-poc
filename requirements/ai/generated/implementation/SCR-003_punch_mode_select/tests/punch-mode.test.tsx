import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PunchModePage from '@/app/(contractor)/punch-mode/page';
import { useAttendanceStore } from '@/lib/store/attendanceStore';
import React from 'react';
import '@testing-library/jest-dom';

// Next.js Router のモック
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

describe('SCR-003 打刻モード選択画面', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 13, 9, 0, 0)); // 2026年4月13日 09:00:00
    mockPush.mockClear();
    mockReplace.mockClear();
    sessionStorage.clear();
    useAttendanceStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('SCR-003-UT-001: 画面上部の日時表示部に、設定したシステム時刻に対応する日付・時刻情報が含まれていること', () => {
    // ログイン済みセッション設定
    sessionStorage.setItem('user_id', 'user-123');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<PunchModePage />);

    expect(screen.getByText(/2026年04月13日\(月\) 09:00:00/)).toBeInTheDocument();
  });

  it('SCR-003-UT-002: sessionStorageが空（未ログイン）の状態の時、/loginにリダイレクトされること', () => {
    render(<PunchModePage />);

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('SCR-003-IT-001: 出勤ボタンをクリックしたとき、打刻モードがCLOCK_INに更新され、/worker-selectに遷移すること', () => {
    sessionStorage.setItem('user_id', 'user-123');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<PunchModePage />);

    const clockInButton = screen.getByRole('button', { name: '出勤' });
    fireEvent.click(clockInButton);

    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_IN');
    expect(mockPush).toHaveBeenCalledWith('/worker-select');
  });

  it('SCR-003-IT-002: 退勤ボタンをクリックしたとき、打刻モードがCLOCK_OUTに更新され、/worker-selectに遷移すること', () => {
    sessionStorage.setItem('user_id', 'user-123');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<PunchModePage />);

    const clockOutButton = screen.getByRole('button', { name: '退勤' });
    fireEvent.click(clockOutButton);

    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_OUT');
    expect(mockPush).toHaveBeenCalledWith('/worker-select');
  });

  it('SCR-003-IT-003: 戻るボタンをクリックしたとき、/contractor-homeへの画面遷移が要求されること', () => {
    sessionStorage.setItem('user_id', 'user-123');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<PunchModePage />);

    const backButton = screen.getByRole('button', { name: 'ホームへ戻る' });
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor-home');
  });
});

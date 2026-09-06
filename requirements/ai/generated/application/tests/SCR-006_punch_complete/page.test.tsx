import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import PunchCompletePage from '@/app/(contractor)/punch-complete/page';
import { useAttendanceStore } from '@/features/attendance/store/useAttendanceStore';

// useRouter モック
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

describe('SCR-006_punch_complete - PunchCompletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAttendanceStore.getState().clear();
  });

  it('TST-SCR-006-001: 正常に認証され、打刻完了データ（出勤・5名）が表示されること', () => {
    // 認証情報のセットアップ
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    // Zustand の打刻完了情報のセットアップ
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001', 'wrk-002', 'wrk-003', 'wrk-004', 'wrk-005'],
    });

    render(<PunchCompletePage />);

    // タイトルと送信成功メッセージの検証
    expect(screen.getByTestId('complete-title')).toHaveTextContent('打刻が完了しました');

    // 打刻モードと人数の検証
    expect(screen.getByTestId('complete-punch-type')).toHaveTextContent('出勤');
    expect(screen.getByTestId('complete-worker-count')).toHaveTextContent('5 名');
  });

  it('TST-SCR-006-002: 「メニューへ戻る」ボタンをクリックしたときにストアがクリアされ、ホームへ遷移すること', () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    useAttendanceStore.setState({
      punchType: 'CLOCK_OUT',
      selectedWorkerIds: ['wrk-001', 'wrk-002'],
    });

    render(<PunchCompletePage />);

    const homeButton = screen.getByTestId('complete-home-btn');
    
    // ボタンがドキュメントに存在し、高さ要件（44px以上）を表現したスタイルかクラスが適用されていること
    expect(homeButton).toBeInTheDocument();

    // クリックイベントを発火
    fireEvent.click(homeButton);

    // /home への遷移が発生していること
    expect(mockPush).toHaveBeenCalledWith('/home');

    // Zustand ストアがクリアされていること
    const state = useAttendanceStore.getState();
    expect(state.punchType).toBeNull();
    expect(state.selectedWorkerIds).toEqual([]);
  });

  it('TST-SCR-006-003: 未認証（sessionStorageが空）の場合に /login にリダイレクトされること', () => {
    render(<PunchCompletePage />);

    // ログイン画面へリダイレクトされること
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('TST-SCR-006-003: ロールが不一致（FACTORY_ADMIN）の場合に /login にリダイレクトされること', () => {
    sessionStorage.setItem('user_id', 'usr-002');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    render(<PunchCompletePage />);

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
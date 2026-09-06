import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PunchCompletePage from '@/app/(contractor)/punch/complete/page';
import React from 'react';

// next/navigation のモック
const mockPush = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

describe('SCR-006_punch_complete - 打刻完了画面', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // sessionStorage のモックを設定
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) {
          delete store[k];
        }
      },
    });
  });

  it('TS-SCR-006-003: 未ログイン状態（sessionStorageが空）の時に、即座にログイン画面へ遷移すること', () => {
    // sessionStorage は空
    render(<PunchCompletePage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TS-SCR-006-001: 正常ログイン時、クエリパラメータから取得した出勤モードと対象人数を含むメッセージが表示されること', () => {
    // ログイン状態をシミュレート
    sessionStorage.setItem('user_id', 'u1-uuid');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    // クエリパラメータ: CLOCK_IN (出勤), count: 3
    mockSearchParamsGet.mockImplementation((key) => {
      if (key === 'type') return 'CLOCK_IN';
      if (key === 'count') return '3';
      return null;
    });

    render(<PunchCompletePage />);

    // メッセージが正しく埋め込まれていることを検証
    const msgElement = screen.getByTestId('complete-message');
    expect(msgElement.textContent).toBe('出勤打刻を完了しました（対象: 3名）');
    expect(screen.getByText('送信完了')).toBeInTheDocument();
  });

  it('TS-SCR-006-001: 退勤打刻を完了した旨のメッセージが正しく表示されること', () => {
    sessionStorage.setItem('user_id', 'u1-uuid');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    // クエリパラメータ: CLOCK_OUT (退勤), count: 5
    mockSearchParamsGet.mockImplementation((key) => {
      if (key === 'type') return 'CLOCK_OUT';
      if (key === 'count') return '5';
      return null;
    });

    render(<PunchCompletePage />);

    const msgElement = screen.getByTestId('complete-message');
    expect(msgElement.textContent).toBe('退勤打刻を完了しました（対象: 5名）');
  });

  it('TS-SCR-006-001: クエリパラメータがない場合、デフォルトのフォールバック完了メッセージが表示されること', () => {
    sessionStorage.setItem('user_id', 'u1-uuid');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    // クエリパラメータなし
    mockSearchParamsGet.mockReturnValue(null);

    render(<PunchCompletePage />);

    const msgElement = screen.getByTestId('complete-message');
    expect(msgElement.textContent).toBe('打刻送信が完了しました');
  });

  it('TS-SCR-006-002: 「ホームへ戻る」ボタンが適切なサイズで描画され、クリック時に外注先ホームへ遷移すること', () => {
    sessionStorage.setItem('user_id', 'u1-uuid');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    mockSearchParamsGet.mockImplementation((key) => {
      if (key === 'type') return 'CLOCK_IN';
      if (key === 'count') return '1';
      return null;
    });

    render(<PunchCompletePage />);

    const btn = screen.getByTestId('go-home-button');
    expect(btn).toBeInTheDocument();
    
    // スタイルの存在確認
    expect(btn.className).toContain('w-full');
    expect(btn.className).toContain('rounded-xl');

    // クリックシミュレーション
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
  });
});
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PunchCompletePage from '../app/(contractor)/punch-complete/page';

// React Hook / Mock Stability に従い、安定した参照を返すモックを定義
const { mockPush, mockRouter, mockGet, mockSearchParams } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockGet = vi.fn();

  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockGet,
    mockSearchParams: {
      get: mockGet,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

describe('SCR-006 打刻完了画面', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const setMockSession = (role = 'CONTRACTOR_MANAGER') => {
    sessionStorage.setItem(
      'session',
      JSON.stringify({ user_id: 'user123', role })
    );
  };

  it('TS-SCR-006-001 & TS-SCR-006-002: 認証済み状態で正常に完了メッセージとホームへ戻るボタンが表示されること', () => {
    setMockSession();
    mockGet.mockReturnValue(null); // クエリパラメータなしのケース

    render(<PunchCompletePage />);

    // 完了メッセージの確認 (SCR-006-FN-001)
    expect(screen.getByText('送信完了')).toBeInTheDocument();
    expect(
      screen.getByText('打刻データの送信が完了しました。')
    ).toBeInTheDocument();

    // ホームへ戻るボタンの確認 (SCR-006-FN-002)
    const button = screen.getByRole('button', { name: 'ホームへ戻る' });
    expect(button).toBeInTheDocument();
  });

  it('TS-SCR-006-003 & TS-SCR-006-004: 中央寄せのクラスとタップしやすいボタンサイズ設定が存在すること', () => {
    setMockSession();
    mockGet.mockReturnValue(null);

    const { container } = render(<PunchCompletePage />);

    // 中央揃えを含むコンテナ要素のクラスチェック (SCR-006-UI-001)
    const containerDiv = container.querySelector('.flex.flex-col.justify-center.items-center.text-center');
    expect(containerDiv).toBeInTheDocument();

    // 「ホームへ戻る」ボタンが高さ48px以上（h-12）を担保するTailwindクラスを持つこと (SCR-006-UI-002)
    const button = screen.getByRole('button', { name: 'ホームへ戻る' });
    expect(button.className).toContain('h-12');
  });

  it('TS-SCR-006-005: sessionStorageが空（未ログイン）の場合にログイン画面へリダイレクトされること', () => {
    // sessionStorage は設定しない
    render(<PunchCompletePage />);

    // 認証チェックが走り、/login へリダイレクトされること (SCR-006-VL-001)
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TS-SCR-006-005: 異なるロール（FACTORY_ADMIN）のセッションの場合にログイン画面へリダイレクトされること', () => {
    setMockSession('FACTORY_ADMIN'); // ロールが不一致

    render(<PunchCompletePage />);

    // 認証チェックが走り、/login へリダイレクトされること (SCR-006-VL-001)
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TS-SCR-006-006: 「ホームへ戻る」ボタンのクリックにより外注先ホーム画面に遷移すること', () => {
    setMockSession();
    mockGet.mockReturnValue(null);

    render(<PunchCompletePage />);

    const button = screen.getByRole('button', { name: 'ホームへ戻る' });
    fireEvent.click(button);

    // ホーム画面（/home）へのクライアントサイドルーティング遷移 (SCR-006-EV-001)
    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('TS-SCR-006-007: 出勤、3名分の送信結果パラメータが渡された際、動的なメッセージが表示されること', () => {
    setMockSession();
    // mockGetが順番にクエリパラメータを返すよう設定
    // 'type' -> 'CLOCK_IN', 'count' -> '3'
    mockGet.mockImplementation((key: string) => {
      if (key === 'type') return 'CLOCK_IN';
      if (key === 'count') return '3';
      return null;
    });

    render(<PunchCompletePage />);

    // 出勤打刻を 3 名分送信しました。と表示されること (SCR-006-DT-001)
    expect(
      screen.getByText('出勤打刻を 3 名分送信しました。')
    ).toBeInTheDocument();
  });

  it('TS-SCR-006-007: 退勤、5名分の送信結果パラメータが渡された際、動的なメッセージが表示されること', () => {
    setMockSession();
    mockGet.mockImplementation((key: string) => {
      if (key === 'type') return 'CLOCK_OUT';
      if (key === 'count') return '5';
      return null;
    });

    render(<PunchCompletePage />);

    // 退勤打刻を 5 名分送信しました。と表示されること (SCR-006-DT-001)
    expect(
      screen.getByText('退勤打刻を 5 名分送信しました。')
    ).toBeInTheDocument();
  });

  it('TS-SCR-006-008: 前画面パラメータが欠落している場合、デフォルトメッセージにフォールバックすること', () => {
    setMockSession();
    // type、countがnull
    mockGet.mockReturnValue(null);

    render(<PunchCompletePage />);

    // クラッシュせずデフォルト文言が表示されること (SCR-006-ST-002)
    expect(
      screen.getByText('打刻データの送信が完了しました。')
    ).toBeInTheDocument();
  });
});
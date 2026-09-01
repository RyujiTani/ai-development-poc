import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PunchCompletePage from '@/app/(contractor)/punch-complete/page';
import * as sessionModule from '@/lib/auth/session';

const mockPush = vi.fn();
const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

describe('SCR-006 Punch Complete Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      store[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete store[key];
    });
  });

  it('TS-SCR-006-001: 正常な遷移ステートで完了メッセージが描画されること', () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'test-user-id',
      role: 'CONTRACTOR_MANAGER',
    });
    mockGet.mockImplementation((key) => {
      if (key === 'mode') return 'CLOCK_IN';
      if (key === 'count') return '3';
      return null;
    });

    render(<PunchCompletePage />);

    expect(screen.getByText('打刻データの送信が完了しました')).toBeInTheDocument();
  });

  it('TS-SCR-006-002: 「ホームへ戻る」テキストを持つボタンが存在すること', () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'test-user-id',
      role: 'CONTRACTOR_MANAGER',
    });

    render(<PunchCompletePage />);

    const button = screen.getByTestId('home-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('ホームへ戻る');
  });

  it('TS-SCR-006-003: 中央揃えを実現するためのレイアウトクラスが含まれていること', () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'test-user-id',
      role: 'CONTRACTOR_MANAGER',
    });

    const { container } = render(<PunchCompletePage />);
    const mainWrapper = container.querySelector('.flex.min-h-screen.items-center.justify-center');
    expect(mainWrapper).toBeInTheDocument();
  });

  it('TS-SCR-006-004: 「ホームへ戻る」ボタンに十分なサイズを確保するCSSクラスが含まれていること', () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'test-user-id',
      role: 'CONTRACTOR_MANAGER',
    });

    render(<PunchCompletePage />);

    const button = screen.getByTestId('home-button');
    expect(button).toHaveClass('w-full', 'py-4', 'px-4');
  });

  it('TS-SCR-006-005: PC画面での最大幅制限が適用されていること', () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'test-user-id',
      role: 'CONTRACTOR_MANAGER',
    });

    const { container } = render(<PunchCompletePage />);
    const cardElement = container.querySelector('.max-w-md');
    expect(cardElement).toBeInTheDocument();
  });

  it('TS-SCR-006-006: 未認証状態の場合にログインページへリダイレクトすること', () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(null);

    render(<PunchCompletePage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TS-SCR-006-007: 「ホームへ戻る」ボタンクリック時にホーム画面へ遷移すること', () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'test-user-id',
      role: 'CONTRACTOR_MANAGER',
    });

    render(<PunchCompletePage />);

    const button = screen.getByTestId('home-button');
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
  });

  it('TS-SCR-006-008: 前画面からのパラメータ(CLOCK_OUT, 5名)が正しく表示に反映されること', () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'test-user-id',
      role: 'CONTRACTOR_MANAGER',
    });
    mockGet.mockImplementation((key) => {
      if (key === 'mode') return 'CLOCK_OUT';
      if (key === 'count') return '5';
      return null;
    });

    render(<PunchCompletePage />);

    expect(screen.getByTestId('punch-type')).toHaveTextContent('退勤');
    expect(screen.getByTestId('punch-count')).toHaveTextContent('5名');
  });
});

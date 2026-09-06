import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PunchModeSelectPage from '@/app/(contractor)/punch-mode/page';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';

// next/navigation のモック化
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

// logger のモック化
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// db のモック化
vi.mock('@/lib/db/indexedDB', () => ({
  initDB: vi.fn().mockResolvedValue({
    transaction: () => ({
      objectStore: () => ({
        get: vi.fn().mockResolvedValue({
          user_id: 'u1-uuid',
          contractor_id: 'c1-uuid',
          role: 'CONTRACTOR_MANAGER',
          display_name: '田中 職長',
          status: 'ACTIVE',
        }),
      }),
      done: Promise.resolve(),
    }),
  }),
}));

describe('SCR-003_punch_mode_select', () => {
  let originalDate: typeof Date;

  beforeEach(() => {
    vi.clearAllMocks();
    useAttendanceStore.getState().reset();
    originalDate = global.Date;

    // sessionStorage のモック設定
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
        Object.keys(store).forEach((key) => delete store[key]);
      },
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  it('TEST-SCR-003-005: 認証セッションが存在しない場合はログイン画面へリダイレクトされること', async () => {
    window.sessionStorage.clear();

    await act(async () => {
      render(<PunchModeSelectPage />);
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TEST-SCR-003-001: 「出勤」ボタン押下により打刻モードが CLOCK_IN に設定され、作業員選択画面へ遷移すること', async () => {
    window.sessionStorage.setItem('user_id', 'u1-uuid');
    window.sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    await act(async () => {
      render(<PunchModeSelectPage />);
    });

    expect(await screen.findByText('打刻モード選択')).toBeInTheDocument();

    const clockInButton = screen.getByRole('button', { name: /出勤/ });
    await act(async () => {
      fireEvent.click(clockInButton);
    });

    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_IN');
    expect(mockPush).toHaveBeenCalledWith('/contractor/worker-select');
  });

  it('TEST-SCR-003-002: 「退勤」ボタン押下により打刻モードが CLOCK_OUT に設定され、作業員選択画面へ遷移すること', async () => {
    window.sessionStorage.setItem('user_id', 'u1-uuid');
    window.sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    await act(async () => {
      render(<PunchModeSelectPage />);
    });

    expect(await screen.findByText('打刻モード選択')).toBeInTheDocument();

    const clockOutButton = screen.getByRole('button', { name: /退勤/ });
    await act(async () => {
      fireEvent.click(clockOutButton);
    });

    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_OUT');
    expect(mockPush).toHaveBeenCalledWith('/contractor/worker-select');
  });

  it('TEST-SCR-003-004: 現在の日時が意図したフォーマットで画面上部に表示されていること', async () => {
    const mockDate = new Date('2026-04-13T10:30:00');
    // Dateモックを安全に設定しFakeTimersに起因する Testing Library のタイムアウトを回避する
    // @ts-ignore
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockDate.getTime());
          return new originalDate(mockDate.getTime());
        }
        // @ts-ignore
        super(...args);
        return new originalDate(...args);
      }
      static now() {
        return mockDate.getTime();
      }
    };

    window.sessionStorage.setItem('user_id', 'u1-uuid');
    window.sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    await act(async () => {
      render(<PunchModeSelectPage />);
    });

    expect(await screen.findByText('打刻モード選択')).toBeInTheDocument();
    expect(screen.getByText(/2026年04月13日\(月\) 10:30:00/)).toBeInTheDocument();
  });

  it('TEST-SCR-003-006: 「戻る」ボタンが押下された際、選択状態をクリアしてホーム画面へ遷移すること', async () => {
    window.sessionStorage.setItem('user_id', 'u1-uuid');
    window.sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    await act(async () => {
      render(<PunchModeSelectPage />);
    });

    expect(await screen.findByText('打刻モード選択')).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: '戻る' });
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
    expect(useAttendanceStore.getState().punchType).toBeNull();
  });
});
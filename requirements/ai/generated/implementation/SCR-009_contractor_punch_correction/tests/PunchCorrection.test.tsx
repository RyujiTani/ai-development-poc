import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PunchCorrectionPage from '@/app/(contractor)/punch-correction/page';
import { saveSessionUser, clearSessionUser } from '@/lib/auth/session';
import * as navigation from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const mockPush = vi.fn();

const mockWorkers = [
  {
    worker_id: 'WKR-001',
    contractor_id: 'CTR-001',
    name: '佐藤 健太',
    status: 'ACTIVE',
  },
];

// IndexedDB mocks
vi.mock('@/lib/db/indexedDb', () => ({
  seedInitialData: vi.fn().mockResolvedValue(undefined),
  openDB: vi.fn().mockResolvedValue({
    transaction: () => ({
      objectStore: () => ({
        index: () => ({
          getAll: () => ({
            onsuccess: function (this: any) {
              this.result = mockWorkers;
              if (this.onsuccess) this.onsuccess();
            },
          }),
        }),
        put: vi.fn(),
      }),
      oncomplete: vi.fn(),
    }),
  }),
}));

vi.mock('@/features/worker/repository/workerRepository', () => ({
  IndexedDBWorkerRepository: vi.fn().mockImplementation(() => ({
    getByContractorId: vi.fn().mockResolvedValue(mockWorkers),
  })),
}));

vi.mock('@/features/attendance/repository/attendanceRepository', () => ({
  IndexedDBAttendanceRepository: vi.fn().mockImplementation(() => ({
    saveCorrection: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('PunchCorrectionPage (SCR-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionUser();
    (navigation.useRouter as any).mockReturnValue({ push: mockPush });
  });

  it('TST-005: 未認証ユーザーがアクセスした際、ログイン画面にリダイレクトされること', async () => {
    render(<PunchCorrectionPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-001: 未入力状態で送信ボタンを押したときに各必須項目のバリデーションエラーが表示されること', async () => {
    // Setup contractor manager session
    saveSessionUser({
      userId: 'USR-001',
      contractorId: 'CTR-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: '外注先管理者',
    });

    render(<PunchCorrectionPage />);

    // Wait for load
    await screen.findByText('外注先打刻修正フォーム');

    // Empty date field first
    const dateInput = screen.getByLabelText(/打刻日時/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('作業員を選択してください')).toBeInTheDocument();
    expect(await screen.findByText('有効な日時を入力してください')).toBeInTheDocument();
    expect(await screen.findByText('打刻種別を選択してください')).toBeInTheDocument();
    expect(await screen.findByText('修正理由を入力してください')).toBeInTheDocument();
  });

  it('TST-004: キャンセルボタンを押した際、即座にホーム画面に遷移すること', async () => {
    saveSessionUser({
      userId: 'USR-001',
      contractorId: 'CTR-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: '外注先管理者',
    });

    render(<PunchCorrectionPage />);
    await screen.findByText('外注先打刻修正フォーム');

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
  });

  it('TST-003: 正常値を入力して送信した際、打刻修正が正常に完了しホーム画面へ遷移すること', async () => {
    saveSessionUser({
      userId: 'USR-001',
      contractorId: 'CTR-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: '外注先管理者',
    });

    render(<PunchCorrectionPage />);
    await screen.findByText('外注先打刻修正フォーム');

    // Select Worker
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'WKR-001' } });

    // Set DateTime
    const dateInput = screen.getByLabelText(/打刻日時/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-04-13T09:00' } });

    // Select Punch Type "出勤"
    const clockInLabel = screen.getByText('出勤');
    fireEvent.click(clockInLabel);

    // Input Reason
    const textarea = screen.getByPlaceholderText(/打刻漏れのため/i);
    fireEvent.change(textarea, { target: { value: '打刻忘れのため手動登録' } });

    // Submit Form
    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('打刻修正を登録しました')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor/home');
    }, { timeout: 2000 });
  });
});

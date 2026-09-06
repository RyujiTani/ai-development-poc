import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PunchCorrectionPage from '@/app/(contractor)/punch-correction/page';
import { toast } from '@/lib/toast';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParamsGet = vi.fn().mockReturnValue(null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsGet(key),
  }),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const {
  mockFindUserById,
  mockFindByContractorId,
  mockSaveRecord,
  mockSaveCorrection,
  mockFindRecordById,
} = vi.hoisted(() => ({
  mockFindUserById: vi.fn(),
  mockFindByContractorId: vi.fn(),
  mockSaveRecord: vi.fn(),
  mockSaveCorrection: vi.fn(),
  mockFindRecordById: vi.fn(),
}));

vi.mock('@/features/user/repository/indexedDBUserRepository', () => {
  return {
    IndexedDBUserRepository: class {
      findById = mockFindUserById;
    },
  };
});

vi.mock('@/features/worker/repository/indexedDBWorkerRepository', () => {
  return {
    IndexedDBWorkerRepository: class {
      findByContractorId = mockFindByContractorId;
    },
  };
});

vi.mock('@/features/attendance/repository/indexedDBAttendanceRepository', () => {
  return {
    IndexedDBAttendanceRepository: class {
      saveRecord = mockSaveRecord;
      saveCorrection = mockSaveCorrection;
      findRecordById = mockFindRecordById;
    },
  };
});

const formatISOToDateTimeLocal = (isoString: string) => {
  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

describe('外注先打刻修正画面 (SCR-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSearchParamsGet.mockReturnValue(null);
  });

  it('SCR-009-UT-003: 認証情報がない場合、/login にリダイレクトされること', async () => {
    render(<PunchCorrectionPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('SCR-009-UT-001: 空の状態で送信した場合、バリデーションエラーが表示され送信されないこと', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    mockFindUserById.mockResolvedValue({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      status: 'ACTIVE',
      display_name: '管理者A',
    });

    mockFindByContractorId.mockResolvedValue([
      { worker_id: 'wrk-001', name: '作業員A', status: 'ACTIVE' },
    ]);

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId('submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('workerId-error')).toBeInTheDocument();
      expect(screen.getByTestId('clockedAt-error')).toBeInTheDocument();
      expect(screen.getByTestId('reason-error')).toBeInTheDocument();
    });

    expect(mockSaveRecord).not.toHaveBeenCalled();
  });

  it('SCR-009-UT-002: 有効な入力データを送信した場合、打刻記録と修正履歴が保存されホームへ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    mockFindUserById.mockResolvedValue({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      status: 'ACTIVE',
      display_name: '管理者A',
    });

    mockFindByContractorId.mockResolvedValue([
      { worker_id: 'wrk-001', name: '作業員A', status: 'ACTIVE' },
    ]);

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('worker-select'), { target: { value: 'wrk-001' } });
    fireEvent.change(screen.getByTestId('clockedAt-input'), { target: { value: '2026-04-13T08:00' } });
    
    const clockInRadio = screen.getByTestId('punchType-clockin');
    fireEvent.click(clockInRadio);

    fireEvent.change(screen.getByTestId('reason-input'), { target: { value: '打刻漏れによる手動登録' } });

    const submitBtn = screen.getByTestId('submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSaveRecord).toHaveBeenCalled();
      expect(mockSaveCorrection).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('送信完了');
      expect(mockPush).toHaveBeenCalledWith('/home');
    });

    const savedRecord = mockSaveRecord.mock.calls[0][0];
    expect(savedRecord.worker_id).toBe('wrk-001');
    expect(savedRecord.punch_type).toBe('CLOCK_IN');
    expect(new Date(savedRecord.clocked_at).toISOString()).toBe(new Date('2026-04-13T08:00').toISOString());

    const savedCorrection = mockSaveCorrection.mock.calls[0][0];
    expect(savedCorrection.reason).toBe('打刻漏れによる手動登録');
    expect(savedCorrection.corrected_by).toBe('usr-001');
  });

  it('SCR-009-UT-004: フォーム入力中にキャンセルボタンを押下した場合、保存されずホーム画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    mockFindUserById.mockResolvedValue({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      status: 'ACTIVE',
      display_name: '管理者A',
    });

    mockFindByContractorId.mockResolvedValue([
      { worker_id: 'wrk-001', name: '作業員A', status: 'ACTIVE' },
    ]);

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('reason-input'), { target: { value: '入力中...' } });

    const cancelBtn = screen.getByTestId('cancel-btn');
    fireEvent.click(cancelBtn);

    expect(mockSaveRecord).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('既存の打刻IDがクエリパラメータにある場合、打刻データがロードされ、修正処理ができること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    mockSearchParamsGet.mockReturnValue('att-999');

    mockFindUserById.mockResolvedValue({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      status: 'ACTIVE',
      display_name: '管理者A',
    });

    mockFindByContractorId.mockResolvedValue([
      { worker_id: 'wrk-001', name: '作業員A', status: 'ACTIVE' },
    ]);

    mockFindRecordById.mockResolvedValue({
      attendance_id: 'att-999',
      worker_id: 'wrk-001',
      contractor_id: 'con-001',
      punch_type: 'CLOCK_OUT',
      clocked_at: '2026-04-13T17:00:00+09:00',
      punched_by: 'usr-001',
      photo_object_id: 'pho-001',
      created_at: '2026-04-13T17:00:00+09:00',
    });

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    const select = screen.getByTestId('worker-select') as HTMLSelectElement;
    expect(select.value).toBe('wrk-001');
    expect(select.disabled).toBe(true);

    const clockedAtInput = screen.getByTestId('clockedAt-input') as HTMLInputElement;
    expect(clockedAtInput.value).toBe(formatISOToDateTimeLocal('2026-04-13T17:00:00+09:00'));

    const clockOutRadio = screen.getByTestId('punchType-clockout') as HTMLInputElement;
    expect(clockOutRadio.checked).toBe(true);

    fireEvent.change(screen.getByTestId('reason-input'), { target: { value: '退勤時間の修正' } });
    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(mockSaveRecord).toHaveBeenCalled();
      expect(mockSaveCorrection).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('送信完了');
      expect(mockPush).toHaveBeenCalledWith('/home');
    });

    const savedRecord = mockSaveRecord.mock.calls[0][0];
    expect(savedRecord.attendance_id).toBe('att-999');
    expect(savedRecord.photo_object_id).toBe('pho-001');
  });
});
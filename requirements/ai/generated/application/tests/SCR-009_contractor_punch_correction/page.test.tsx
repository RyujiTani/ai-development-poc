import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PunchCorrectionPage from '../../app/(contractor)/contractor/punch-correction/page';
import { ToastProvider } from '../../components/ui/toast';

// Next.js ナビゲーションおよびUseCaseの安定したモック
const mocks = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockExecuteGetWorkers = vi.fn();
  const mockExecuteGetWorkerAttendance = vi.fn();
  const mockExecuteCorrectAttendance = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockExecuteGetWorkers,
    mockExecuteGetWorkerAttendance,
    mockExecuteCorrectAttendance,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.mockRouter,
}));

// Workers UseCaseのモック
vi.mock('../../features/worker/usecase/getWorkersUseCase', () => {
  return {
    GetWorkersUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mocks.mockExecuteGetWorkers,
      };
    }),
  };
});

// Attendance UseCaseのモック
vi.mock('../../features/attendance/usecase/getWorkerAttendanceUseCase', () => {
  return {
    GetWorkerAttendanceUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mocks.mockExecuteGetWorkerAttendance,
      };
    }),
  };
});

vi.mock('../../features/attendance/usecase/correctAttendanceUseCase', () => {
  return {
    CorrectAttendanceUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mocks.mockExecuteCorrectAttendance,
      };
    }),
  };
});

describe('SCR-009: 外注先打刻修正画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <PunchCorrectionPage />
      </ToastProvider>
    );
  };

  it('SCR-009-VL-005: 未ログイン状態でアクセスした際、/login にリダイレクトされること', async () => {
    sessionStorage.clear();

    renderComponent();

    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('SCR-009-UI-001: 画面項目が正しくレンダリングされていること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: [
        {
          worker_id: 'w111',
          contractor_id: 'c1111111',
          name: '大島 太郎',
          status: 'ACTIVE',
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/対象作業員/)).toBeInTheDocument();
    expect(screen.getByText('出勤')).toBeInTheDocument();
    expect(screen.getByText('退勤')).toBeInTheDocument();
    expect(screen.getByLabelText(/修正理由/)).toBeInTheDocument();
  });

  it('SCR-009-VL-001: 作業員を選択せずに送信した際、バリデーションエラーが表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('作業員を選択してください。')).toBeInTheDocument();
    });
    expect(mocks.mockExecuteCorrectAttendance).not.toHaveBeenCalled();
  });

  it('SCR-009-VL-004: 修正理由が空欄のまま送信した際、バリデーションエラーが表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: [
        {
          worker_id: 'w111',
          contractor_id: 'c1111111',
          name: '大島 太郎',
          status: 'ACTIVE',
        },
      ],
    });

    mocks.mockExecuteGetWorkerAttendance.mockResolvedValue({
      success: true,
      value: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 作業員を選択
    const select = screen.getByLabelText(/対象作業員/);
    fireEvent.change(select, { target: { value: 'w111' } });

    // 修正理由を空にする
    const reasonInput = screen.getByLabelText(/修正理由/);
    fireEvent.change(reasonInput, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('修正理由を入力してください。')).toBeInTheDocument();
    });
    expect(mocks.mockExecuteCorrectAttendance).not.toHaveBeenCalled();
  });

  it('SCR-009-EV-001 & SCR-009-DT-001: 正常入力で手動打刻登録を送信した際、完了してポータルへ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: [
        {
          worker_id: 'w111',
          contractor_id: 'c1111111',
          name: '大島 太郎',
          status: 'ACTIVE',
        },
      ],
    });

    mocks.mockExecuteGetWorkerAttendance.mockResolvedValue({
      success: true,
      value: [],
    });

    mocks.mockExecuteCorrectAttendance.mockResolvedValue({
      success: true,
      value: { correctionId: 'corr123' },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 1. 作業員選択
    const select = screen.getByLabelText(/対象作業員/);
    fireEvent.change(select, { target: { value: 'w111' } });

    // 2. 理由を入力
    const reasonInput = screen.getByLabelText(/修正理由/);
    fireEvent.change(reasonInput, { target: { value: '打刻漏れ手動登録のため' } });

    // 3. 日時を設定
    const dateInput = screen.getByLabelText(/打刻日時/);
    fireEvent.change(dateInput, { target: { value: '2026-04-13T09:00' } });

    // 4. 送信
    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mocks.mockExecuteCorrectAttendance).toHaveBeenCalledWith({
        attendanceId: undefined,
        workerId: 'w111',
        contractorId: 'c1111111',
        punchType: 'CLOCK_IN',
        clockedAt: expect.any(String),
        reason: '打刻漏れ手動登録のため',
        correctedBy: 'u1111111',
      });
    });

    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/contractor');
    });
  });

  it('SCR-009-EV-002: キャンセルボタンをクリックした際、保存を行わずポータルへ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(mocks.mockExecuteCorrectAttendance).not.toHaveBeenCalled();
    expect(mocks.mockPush).toHaveBeenCalledWith('/contractor');
  });
});
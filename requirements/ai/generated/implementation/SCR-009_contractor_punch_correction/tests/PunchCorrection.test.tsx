import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PunchCorrectionForm from '../features/attendance/ui/PunchCorrectionForm';
import { IAttendanceRepository } from '../features/attendance/repository/attendanceRepository';
import { Worker, AttendanceRecord } from '../features/attendance/domain/types';
import { AuthSession } from '../lib/auth/authStore';

// Next.js Navigation モック
const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe('PunchCorrectionForm', () => {
  // モックデータ定義
  const mockWorkers: Worker[] = [
    {
      worker_id: 'worker-1',
      contractor_id: 'contractor-A',
      name: '田中 一郎 (A社)',
      status: 'ACTIVE',
      qualifications: [],
      trainings: [],
      created_at: '2026-04-13',
      updated_at: '2026-04-13',
    },
    {
      worker_id: 'worker-2',
      contractor_id: 'contractor-A',
      name: '鈴木 二郎 (A社)',
      status: 'ACTIVE',
      qualifications: [],
      trainings: [],
      created_at: '2026-04-13',
      updated_at: '2026-04-13',
    }
  ];

  const mockSession: AuthSession = {
    userId: 'user-manager-A',
    contractorId: 'contractor-A',
    role: 'CONTRACTOR_MANAGER',
    displayName: '山田 太郎 (A社管理者)',
  };

  let mockRepository: IAttendanceRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      getWorkersByContractor: vi.fn().mockResolvedValue(mockWorkers),
      getAttendanceRecord: vi.fn().mockResolvedValue(null),
      getAttendanceRecordsByWorker: vi.fn().mockResolvedValue([]),
      saveAttendanceRecord: vi.fn().mockResolvedValue(undefined),
      saveAttendanceCorrection: vi.fn().mockResolvedValue(undefined),
    };
  });

  // TST-SCR-009-001: 作業員未選択でのバリデーション
  it('作業員が未選択の場合、バリデーションエラーが表示され送信されないこと', async () => {
    render(
      <PunchCorrectionForm
        repository={mockRepository}
        session={mockSession}
        initialAttendanceId={null}
      />
    );

    // ロード完了を待つ
    await screen.findByLabelText(/対象作業員/);

    // フォームへの入力（日時はデフォルトまたは手動入力）
    const dateInput = screen.getByLabelText(/打刻日/);
    const timeInput = screen.getByLabelText(/打刻時刻/);
    const reasonInput = screen.getByLabelText(/修正・登録理由/);

    fireEvent.change(dateInput, { target: { value: '2026-04-13' } });
    fireEvent.change(timeInput, { target: { value: '08:00' } });
    fireEvent.change(reasonInput, { target: { value: '打刻漏れ手動追加' } });

    // 送信
    const submitBtn = screen.getByRole('button', { name: '送信する' });
    fireEvent.click(submitBtn);

    // エラー検証
    await waitFor(() => {
      expect(screen.getByTestId('error-worker')).toHaveTextContent('作業員を選択してください。');
    });

    expect(mockRepository.saveAttendanceRecord).not.toHaveBeenCalled();
  });

  // TST-SCR-009-002: 修正理由が空（空白文字含む）でのバリデーション
  it('修正理由が空（スペースのみ等）の場合、バリデーションエラーが表示されること', async () => {
    render(
      <PunchCorrectionForm
        repository={mockRepository}
        session={mockSession}
        initialAttendanceId={null}
      />
    );

    await screen.findByLabelText(/対象作業員/);

    // 各項目を選択
    const workerSelect = screen.getByLabelText(/対象作業員/);
    const dateInput = screen.getByLabelText(/打刻日/);
    const timeInput = screen.getByLabelText(/打刻時刻/);
    const reasonInput = screen.getByLabelText(/修正・登録理由/);

    fireEvent.change(workerSelect, { target: { value: 'worker-1' } });
    fireEvent.change(dateInput, { target: { value: '2026-04-13' } });
    fireEvent.change(timeInput, { target: { value: '08:00' } });
    fireEvent.change(reasonInput, { target: { value: '   ' } }); // 空白

    const submitBtn = screen.getByRole('button', { name: '送信する' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('error-reason')).toHaveTextContent('修正理由を入力してください。');
    });

    expect(mockRepository.saveAttendanceRecord).not.toHaveBeenCalled();
  });

  // TST-SCR-009-005: ログインユーザーの所属会社ID制限
  it('自社(contractor-A)に所属する作業員のみが選択肢に表示されていること', async () => {
    render(
      <PunchCorrectionForm
        repository={mockRepository}
        session={mockSession}
        initialAttendanceId={null}
      />
    );

    await screen.findByLabelText(/対象作業員/);

    expect(mockRepository.getWorkersByContractor).toHaveBeenCalledWith('contractor-A');

    const selectElement = screen.getByLabelText(/対象作業員/) as HTMLSelectElement;
    const options = Array.from(selectElement.options);

    // プレースホルダ + mockWorkersの2件 = 合計3つ
    expect(options).toHaveLength(3);
    expect(options[1].text).toBe('田中 一郎 (A社)');
    expect(options[2].text).toBe('鈴木 二郎 (A社)');
  });
});
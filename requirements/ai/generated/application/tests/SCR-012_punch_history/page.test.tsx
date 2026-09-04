import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendanceHistoryPage from '../../app/(factory)/admin/attendance-history/page';
import { ToastProvider } from '../../components/ui/toast';

// 参照の安定したモック
const {
  mockReplace,
  mockPush,
  mockRouter,
  mockExecuteGetAttendanceHistory,
  mockExecuteGetPhotoBlob,
  mockExecuteCorrectAttendance,
  mockFindAllContractors,
} = vi.hoisted(() => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();
  const mockExecuteGetAttendanceHistory = vi.fn();
  const mockExecuteGetPhotoBlob = vi.fn();
  const mockExecuteCorrectAttendance = vi.fn();
  const mockFindAllContractors = vi.fn().mockResolvedValue([]);

  return {
    mockReplace,
    mockPush,
    mockRouter: {
      replace: mockReplace,
      push: mockPush,
    },
    mockExecuteGetAttendanceHistory,
    mockExecuteGetPhotoBlob,
    mockExecuteCorrectAttendance,
    mockFindAllContractors,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('../../features/attendance/usecase/getAttendanceHistoryUseCase', () => {
  return {
    GetAttendanceHistoryUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteGetAttendanceHistory,
      };
    }),
  };
});

vi.mock('../../features/attendance/usecase/getPhotoBlobUseCase', () => {
  return {
    GetPhotoBlobUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteGetPhotoBlob,
      };
    }),
  };
});

vi.mock('../../features/attendance/usecase/correctAttendanceUseCase', () => {
  return {
    CorrectAttendanceUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteCorrectAttendance,
      };
    }),
  };
});

vi.mock('../../features/contractor/repository/contractorRepository', () => {
  return {
    IndexedDBContractorRepository: vi.fn().mockImplementation(() => {
      return {
        findAll: mockFindAllContractors,
      };
    }),
  };
});

describe('SCR-012: 打刻履歴確認画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    global.URL.createObjectURL = vi.fn().mockReturnValue('mock-object-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('TST-012-001: 打刻履歴がテーブル形式で正しく出力されていること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    const mockHistory = [
      {
        attendance_id: 'att-1',
        worker_id: 'w-1',
        worker_name: '作業員A',
        contractor_id: 'c-1',
        contractor_name: '外注先A',
        punch_type: 'CLOCK_IN',
        clocked_at: '2026-04-13T08:00:00.000Z',
        punched_by: 'u1',
        photo_object_id: 'photo-1',
        created_at: '2026-04-13T08:00:00.000Z',
      },
    ];

    mockExecuteGetAttendanceHistory.mockResolvedValue({
      success: true,
      value: mockHistory,
    });

    render(
      <ToastProvider>
        <AttendanceHistoryPage />
      </ToastProvider>
    );

    // 読み込み完了を待つ
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('作業員A')).toBeInTheDocument();
    expect(screen.getByText('外注先A')).toBeInTheDocument();
    expect(screen.getByText('出勤')).toBeInTheDocument();
  });

  it('TST-012-002: 日付フィルタによる絞り込みが行われること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetAttendanceHistory.mockResolvedValue({
      success: true,
      value: [],
    });

    render(
      <ToastProvider>
        <AttendanceHistoryPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText('日付選択');
    fireEvent.change(dateInput, { target: { value: '2026-04-13' } });

    // フィルタ条件変更で再取得が行われる
    await waitFor(() => {
      expect(mockExecuteGetAttendanceHistory).toHaveBeenCalledWith({
        date: '2026-04-13',
        contractorId: '',
      });
    });
  });

  it('TST-012-003: 外注先フィルタによる絞り込みが行われること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockFindAllContractors.mockResolvedValue([
      { contractor_id: 'c-1', name: '外注先A', status: 'ACTIVE' },
    ]);

    mockExecuteGetAttendanceHistory.mockResolvedValue({
      success: true,
      value: [],
    });

    render(
      <ToastProvider>
        <AttendanceHistoryPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // プルダウン描画完了を待つ
    await waitFor(() => {
      expect(screen.getByText('外注先A')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('外注先企業');
    fireEvent.change(select, { target: { value: 'c-1' } });

    await waitFor(() => {
      expect(mockExecuteGetAttendanceHistory).toHaveBeenCalledWith({
        date: '',
        contractorId: 'c-1',
      });
    });
  });

  it('TST-012-004: サムネイル画像クリックで拡大モーダルが出現し、クローズ時にrevokeObjectURLされること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetAttendanceHistory.mockResolvedValue({
      success: true,
      value: [
        {
          attendance_id: 'att-1',
          worker_id: 'w-1',
          worker_name: '作業員A',
          contractor_id: 'c-1',
          contractor_name: '外注先A',
          punch_type: 'CLOCK_IN',
          clocked_at: '2026-04-13T08:00:00.000Z',
          punched_by: 'u1',
          photo_object_id: 'photo-1',
          created_at: '2026-04-13T08:00:00.000Z',
        },
      ],
    });

    mockExecuteGetPhotoBlob.mockResolvedValue({
      success: true,
      value: { blob: new Blob(['photo-data'], { type: 'image/jpeg' }) },
    });

    render(
      <ToastProvider>
        <AttendanceHistoryPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // サムネイル画像のロード完了
    const img = await screen.findByAltText('打刻写真');
    expect(img).toBeInTheDocument();

    // クリックしてモーダルを開く
    fireEvent.click(img);

    // モーダルが出現したことを確認
    expect(screen.getByText('打刻写真拡大')).toBeInTheDocument();

    // モーダル内の閉じるボタンをクリック
    const closeBtn = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeBtn);

    // モーダルが閉じたことを確認
    await waitFor(() => {
      expect(screen.queryByText('打刻写真拡大')).not.toBeInTheDocument();
    });

    // URL.revokeObjectURL の呼び出しを確認
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('TST-012-005: 修正ボタン押下でモーダルが開き、日時と理由を入力して保存した際にUseCaseが呼ばれること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetAttendanceHistory.mockResolvedValue({
      success: true,
      value: [
        {
          attendance_id: 'att-1',
          worker_id: 'w-1',
          worker_name: '作業員A',
          contractor_id: 'c-1',
          contractor_name: '外注先A',
          punch_type: 'CLOCK_IN',
          clocked_at: '2026-04-13T08:00:00.000Z',
          punched_by: 'u1',
          photo_object_id: 'photo-1',
          created_at: '2026-04-13T08:00:00.000Z',
        },
      ],
    });

    mockExecuteCorrectAttendance.mockResolvedValue({
      success: true,
      value: { correctionId: 'correction-1' },
    });

    render(
      <ToastProvider>
        <AttendanceHistoryPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const fixBtn = screen.getByRole('button', { name: '修正' });
    fireEvent.click(fixBtn);

    // 修正モーダルが開いた
    expect(screen.getByText('打刻データの修正')).toBeInTheDocument();

    // 修正理由を入力
    const reasonInput = screen.getByLabelText(/修正理由/);
    fireEvent.change(reasonInput, { target: { value: '電車の遅延に伴う修正' } });

    // 保存ボタンをクリック
    const saveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockExecuteCorrectAttendance).toHaveBeenCalledWith({
        attendanceId: 'att-1',
        workerId: 'w-1',
        contractorId: 'c-1',
        punchType: 'CLOCK_IN',
        clockedAt: expect.any(String),
        reason: '電車の遅延に伴う修正',
        correctedBy: 'u3333333',
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('打刻データの修正')).not.toBeInTheDocument();
    });
  });

  it('TST-012-006: 修正理由が空の場合にバリデーションエラーが表示され、UseCaseが呼ばれないこと', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetAttendanceHistory.mockResolvedValue({
      success: true,
      value: [
        {
          attendance_id: 'att-1',
          worker_id: 'w-1',
          worker_name: '作業員A',
          contractor_id: 'c-1',
          contractor_name: '外注先A',
          punch_type: 'CLOCK_IN',
          clocked_at: '2026-04-13T08:00:00.000Z',
          punched_by: 'u1',
          photo_object_id: 'photo-1',
          created_at: '2026-04-13T08:00:00.000Z',
        },
      ],
    });

    render(
      <ToastProvider>
        <AttendanceHistoryPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const fixBtn = screen.getByRole('button', { name: '修正' });
    fireEvent.click(fixBtn);

    // モーダルオープンを待つ
    await screen.findByText('打刻データの修正');

    // 理由を入力せずに保存
    const saveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('修正理由は必須入力です。')).toBeInTheDocument();
    });

    expect(mockExecuteCorrectAttendance).not.toHaveBeenCalled();
  });

  it('TST-012-007: 未認証の状態でアクセスした際、管理者ログイン画面へリダイレクトされること', async () => {
    sessionStorage.clear(); // 未ログイン

    render(
      <ToastProvider>
        <AttendanceHistoryPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    });
  });
});
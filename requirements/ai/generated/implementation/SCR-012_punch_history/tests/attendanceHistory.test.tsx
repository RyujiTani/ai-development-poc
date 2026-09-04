import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AttendanceHistoryPage from '../app/(factory)/attendance-history/page';
import { AttendanceUseCase } from '../features/attendance/usecase/attendanceUseCase';

// router mock
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
}));

// UseCase Mock Data & Functions hoisted to avoid Temporal Dead Zone (TDZ)
const mocks = vi.hoisted(() => {
  const mockContractors = [
    { contractor_id: 'CT-001', name: '株式会社A建設', status: 'ACTIVE', created_at: '', updated_at: '' },
    { contractor_id: 'CT-002', name: '有限会社B興業', status: 'ACTIVE', created_at: '', updated_at: '' },
  ];

  const mockWorkers = [
    { worker_id: 'WK-001', name: '山田 太郎', contractor_id: 'CT-001', status: 'ACTIVE', qualifications: [], trainings: [], created_at: '', updated_at: '' },
    { worker_id: 'WK-002', name: '佐藤 次郎', contractor_id: 'CT-001', status: 'ACTIVE', qualifications: [], trainings: [], created_at: '', updated_at: '' },
  ];

  const mockRecords = [
    {
      attendance_id: 'AT-001',
      worker_id: 'WK-001',
      contractor_id: 'CT-001',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:00:00Z',
      punched_by: 'US-002',
      photo_object_id: 'PH-001',
      created_at: '2026-04-13T08:01:00Z',
    },
  ];

  const mockGetAttendanceHistory = vi.fn().mockResolvedValue({
    success: true,
    value: {
      records: mockRecords,
      contractors: mockContractors,
      workers: mockWorkers,
    },
  });

  const mockGetPhotoUrl = vi.fn().mockResolvedValue({
    success: true,
    value: 'blob:mock-object-url',
  });

  const mockCorrectPunch = vi.fn().mockResolvedValue({
    success: true,
    value: mockRecords[0],
  });

  return {
    mockGetAttendanceHistory,
    mockGetPhotoUrl,
    mockCorrectPunch,
    mockRecords,
    mockContractors,
    mockWorkers,
  };
});

vi.mock('../features/attendance/usecase/attendanceUseCase', () => {
  return {
    AttendanceUseCase: vi.fn().mockImplementation(() => {
      return {
        getAttendanceHistory: mocks.mockGetAttendanceHistory,
        getPhotoUrl: mocks.mockGetPhotoUrl,
        correctPunch: mocks.mockCorrectPunch,
      };
    }),
  };
});

// window & sessionStorage mock
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// URL.createObjectURL / revokeObjectURL mock
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn().mockReturnValue('blob:mock-url'),
});
Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
});

describe('SCR-012 AttendanceHistoryPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    // デフォルトで FACTORY_ADMIN ログイン状態にする
    mockSessionStorage.setItem(
      'worker_attendance_session',
      JSON.stringify({
        user_id: 'US-001',
        role: 'FACTORY_ADMIN',
        status: 'ACTIVE',
        display_name: '工場管理者 鈴木',
      })
    );
  });

  it('TS-012-001: 正常に描画され、打刻履歴一覧が表示されること', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(mocks.mockGetAttendanceHistory).toHaveBeenCalled();
    });

    expect(screen.getByText('打刻履歴一覧')).toBeInTheDocument();
    expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    expect(screen.getByText('株式会社A建設')).toBeInTheDocument();
    expect(screen.getByText('出勤')).toBeInTheDocument();
  });

  it('TS-012-002: 日付フィルタによる絞り込みの検証', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(mocks.mockGetAttendanceHistory).toHaveBeenCalled();
    });

    const dateInput = screen.getByLabelText('日付フィルタ');
    fireEvent.change(dateInput, { target: { value: '2026-04-13' } });

    await waitFor(() => {
      expect(mocks.mockGetAttendanceHistory).toHaveBeenLastCalledWith('2026-04-13', 'all');
    });
  });

  it('TS-012-003: 外注先フィルタによる絞り込みの検証', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(mocks.mockGetAttendanceHistory).toHaveBeenCalled();
    });

    const contractorSelect = screen.getByLabelText('外注先企業フィルタ');
    fireEvent.change(contractorSelect, { target: { value: 'CT-001' } });

    await waitFor(() => {
      expect(mocks.mockGetAttendanceHistory).toHaveBeenLastCalledWith('', 'CT-001');
    });
  });

  it('TS-012-004: 写真サムネイルロード時のメモリ管理安全性確認', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(mocks.mockGetPhotoUrl).toHaveBeenCalledWith('PH-001');
    });
  });

  it('TS-012-005: 写真サムネイルのクリックにより拡大モーダルが表示されること', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(mocks.mockGetPhotoUrl).toHaveBeenCalled();
    });

    const img = screen.getByAltText('打刻証拠写真');
    fireEvent.click(img);

    expect(screen.getByText('打刻エビデンス写真')).toBeInTheDocument();
  });

  it('TS-012-006: 打刻修正が正常に行われ、一覧データがリロードされること', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    const editBtn = screen.getByText('修正');
    fireEvent.click(editBtn);

    expect(screen.getByText('打刻実績の修正')).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText('打刻漏れ対応、端末エラーのため、等');
    fireEvent.change(reasonInput, { target: { value: '交通事情による打刻遅れのため修正' } });

    const saveBtn = screen.getByText('修正を適用する');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mocks.mockCorrectPunch).toHaveBeenCalled();
      expect(screen.getByText('打刻情報を修正しました。')).toBeInTheDocument();
    });
  });

  it('TS-012-007: 修正理由が空白の場合、バリデーションエラーとなること', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    const editBtn = screen.getByText('修正');
    fireEvent.click(editBtn);

    const saveBtn = screen.getByText('修正を適用する');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('修正理由は必須項目です。')).toBeInTheDocument();
      expect(mocks.mockCorrectPunch).not.toHaveBeenCalled();
    });
  });

  it('TS-012-008: 未ログイン状態の場合、ログイン画面へリダイレクトされること', async () => {
    mockSessionStorage.clear(); // セッションクリア
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/login');
    });
  });

  it('TS-012-009: フィルタ解除した際に全件検索にフォールバックすること', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(mocks.mockGetAttendanceHistory).toHaveBeenCalled();
    });

    const clearBtn = screen.getByText('フィルタ解除');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(mocks.mockGetAttendanceHistory).toHaveBeenLastCalledWith('', 'all');
    });
  });
});
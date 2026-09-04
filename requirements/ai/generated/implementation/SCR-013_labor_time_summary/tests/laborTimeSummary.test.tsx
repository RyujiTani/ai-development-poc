import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LaborTimeSummaryPage from '../app/(factory)/labor-time-summary/page';
import { LaborSummaryUseCase } from '../features/attendance/usecase/laborSummaryUseCase';
import { IAttendanceRepository } from '../features/attendance/repository/attendanceRepository';
import { Worker, Contractor, AttendanceRecord } from '../features/attendance/domain/types';

// stable な router mock の作成
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

// Papaparse の mock
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn((data) => JSON.stringify(data)),
  },
}));

// クライアント上のモックデータを生成するインメモリリポジトリ
class MockAttendanceRepository implements IAttendanceRepository {
  constructor(
    private workers: Worker[] = [],
    private contractors: Contractor[] = [],
    private records: AttendanceRecord[] = []
  ) {}

  async getWorkers() { return this.workers; }
  async getContractors() { return this.contractors; }
  async getAttendanceRecords() { return this.records; }
}

describe('LaborTimeSummaryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // URL.createObjectURL の擬似化
    window.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('TST-SCR-013-006: 未ログインの場合、ログイン画面にリダイレクトされること', async () => {
    render(<LaborTimeSummaryPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-SCR-013-001: 開始日未入力時にバリデーションエラーを表示すること', async () => {
    // FACTORY_ADMIN 権限でセッションを設定
    sessionStorage.setItem(
      'worker_attendance_user_session',
      JSON.stringify({ user_id: 'u1', role: 'FACTORY_ADMIN', display_name: '管理者' })
    );

    render(<LaborTimeSummaryPage />);

    const startInput = await screen.findByLabelText(/開始日/);
    fireEvent.change(startInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: '集計する' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('開始日は必須です')).toBeInTheDocument();
  });

  it('TST-SCR-013-002: 終了日が開始日より前の日付の場合にバリデーションエラーを表示すること', async () => {
    sessionStorage.setItem(
      'worker_attendance_user_session',
      JSON.stringify({ user_id: 'u1', role: 'FACTORY_ADMIN', display_name: '管理者' })
    );

    render(<LaborTimeSummaryPage />);

    const startInput = await screen.findByLabelText(/開始日/);
    const endInput = screen.getByLabelText(/終了日/);

    fireEvent.change(startInput, { target: { value: '2026-04-10' } });
    fireEvent.change(endInput, { target: { value: '2026-04-05' } });

    const submitBtn = screen.getByRole('button', { name: '集計する' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('終了日は開始日以降の日付を指定してください')).toBeInTheDocument();
  });

  it('TST-SCR-013-003: 日次で正しく実労働時間が計算されること（UseCase）', async () => {
    const workers: Worker[] = [
      { worker_id: 'w1', contractor_id: 'c1', name: '佐藤', status: 'ACTIVE', qualifications: [], trainings: [], created_at: '', updated_at: '' }
    ];
    const contractors: Contractor[] = [
      { contractor_id: 'c1', name: 'A建設', status: 'ACTIVE', created_at: '', updated_at: '' }
    ];
    const records: AttendanceRecord[] = [
      { attendance_id: 'a1', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-01T08:00:00Z', punched_by: 'u1', created_at: '' },
      { attendance_id: 'a2', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-01T17:00:00Z', punched_by: 'u1', created_at: '' }
    ];

    const repo = new MockAttendanceRepository(workers, contractors, records);
    const usecase = new LaborSummaryUseCase(repo);

    const result = await usecase.execute({
      startDate: '2026-04-01',
      endDate: '2026-04-01',
      unit: 'daily'
    });

    expect(result).toHaveLength(1);
    expect(result[0].worker_name).toBe('佐藤');
    expect(result[0].period).toBe('2026-04-01');
    expect(result[0].total_hours).toBe(9); // 8:00 to 17:00 = 9.0 hours
  });

  it('TST-SCR-013-004: 月次で正しく実労働時間が集計されること（UseCase）', async () => {
    const workers: Worker[] = [
      { worker_id: 'w1', contractor_id: 'c1', name: '佐藤', status: 'ACTIVE', qualifications: [], trainings: [], created_at: '', updated_at: '' }
    ];
    const contractors: Contractor[] = [
      { contractor_id: 'c1', name: 'A建設', status: 'ACTIVE', created_at: '', updated_at: '' }
    ];
    const records: AttendanceRecord[] = [
      { attendance_id: 'a1', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-01T08:00:00Z', punched_by: 'u1', created_at: '' },
      { attendance_id: 'a2', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-01T12:00:00Z', punched_by: 'u1', created_at: '' },
      { attendance_id: 'a3', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-15T13:00:00Z', punched_by: 'u1', created_at: '' },
      { attendance_id: 'a4', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-15T17:00:00Z', punched_by: 'u1', created_at: '' }
    ];

    const repo = new MockAttendanceRepository(workers, contractors, records);
    const usecase = new LaborSummaryUseCase(repo);

    const result = await usecase.execute({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      unit: 'monthly'
    });

    expect(result).toHaveLength(1);
    expect(result[0].period).toBe('2026-04');
    expect(result[0].total_hours).toBe(8); // 4.0 hours + 4.0 hours = 8.0 hours
  });
});
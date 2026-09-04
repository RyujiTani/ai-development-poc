import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PunchCorrectionUseCase, PunchCorrectionInput } from '../features/attendance/usecase/punchCorrectionUseCase';
import { IAttendanceRepository } from '../features/attendance/repository/attendanceRepository';
import { IWorkerRepository } from '../features/worker/repository/workerRepository';
import { Worker, AttendanceRecord } from '../features/attendance/domain/types';

// Mock Router Setup
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
    get: (param: string) => null,
  }),
}));

describe('PunchCorrectionUseCase', () => {
  let mockAttendanceRepo: IAttendanceRepository;
  let mockWorkerRepo: IWorkerRepository;
  let useCase: PunchCorrectionUseCase;

  const sampleWorker: Worker = {
    worker_id: 'WRK-001',
    contractor_id: 'CON-ABC',
    name: 'テスト作業員',
    status: 'ACTIVE',
    qualifications: [],
    trainings: [],
    created_at: '',
    updated_at: '',
  };

  beforeEach(() => {
    mockAttendanceRepo = {
      saveRecord: vi.fn().mockResolvedValue(undefined),
      getRecordById: vi.fn().mockResolvedValue(null),
      saveCorrection: vi.fn().mockResolvedValue(undefined),
      generateId: vi.fn().mockReturnValue('COR-123'),
    };

    mockWorkerRepo = {
      getByContractor: vi.fn().mockResolvedValue([sampleWorker]),
    };

    useCase = new PunchCorrectionUseCase(mockAttendanceRepo, mockWorkerRepo);
  });

  it('新規手動登録を実行した際に、attendance_records と attendance_corrections を正常に保存すること', async () => {
    const input: PunchCorrectionInput = {
      workerId: 'WRK-001',
      punchType: 'CLOCK_IN',
      punchedAt: '2026-04-13T09:00:00.000Z',
      reason: '打刻忘れのため',
      correctedBy: 'USR-001',
      contractorId: 'CON-ABC',
    };

    const result = await useCase.submitCorrection(input);

    expect(result.success).toBe(true);
    expect(mockAttendanceRepo.saveRecord).toHaveBeenCalled();
    expect(mockAttendanceRepo.saveCorrection).toHaveBeenCalledWith(
      expect.objectContaining({
        corrected_by: 'USR-001',
        reason: '打刻忘れのため',
        after: {
          worker_id: 'WRK-001',
          punch_type: 'CLOCK_IN',
          clocked_at: '2026-04-13T09:00:00.000Z',
        },
      })
    );
  });

  it('既存打刻修正を実行した際に、元の打刻内容を before 履歴に含め、更新保存すること', async () => {
    const existingRecord: AttendanceRecord = {
      attendance_id: 'ATT-777',
      worker_id: 'WRK-001',
      contractor_id: 'CON-ABC',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:00:00.000Z',
      punched_by: 'USR-001',
      photo_object_id: '',
      created_at: '',
    };

    vi.mocked(mockAttendanceRepo.getRecordById).mockResolvedValue(existingRecord);

    const input: PunchCorrectionInput = {
      workerId: 'WRK-001',
      punchType: 'CLOCK_IN',
      punchedAt: '2026-04-13T08:30:00.000Z',
      reason: '遅刻を打刻ミスしたため修正',
      attendanceId: 'ATT-777',
      correctedBy: 'USR-001',
      contractorId: 'CON-ABC',
    };

    const result = await useCase.submitCorrection(input);

    expect(result.success).toBe(true);
    expect(mockAttendanceRepo.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        attendance_id: 'ATT-777',
        clocked_at: '2026-04-13T08:30:00.000Z',
      })
    );
    expect(mockAttendanceRepo.saveCorrection).toHaveBeenCalledWith(
      expect.objectContaining({
        before: expect.objectContaining({
          clocked_at: '2026-04-13T08:00:00.000Z',
        }),
        after: expect.objectContaining({
          clocked_at: '2026-04-13T08:30:00.000Z',
        }),
      })
    );
  });
});
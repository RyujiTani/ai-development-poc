import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AttendanceHistoryPage from '../app/(factory)/attendance-history/page.tsx';
import { sessionService } from '../lib/auth/session';
import { IndexedDBAttendanceRepository } from '../features/attendance/repository/attendanceRepository';
import { IndexedDBContractorRepository } from '../features/contractor/repository/contractorRepository';
import { IndexedDBWorkerRepository } from '../features/worker/repository/workerRepository';

// Setup router mocks with reference stability
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

// Mock repositories and database helpers
vi.mock('../features/attendance/repository/attendanceRepository');
vi.mock('../features/contractor/repository/contractorRepository');
vi.mock('../features/worker/repository/workerRepository');
vi.mock('../lib/db/indexedDbHelper', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
  initDB: vi.fn().mockResolvedValue({}),
}));

describe('SCR-012 打刻履歴確認画面 (AttendanceHistoryPage)', () => {
  const mockContractors = [
    { contractor_id: 'c1', name: '大和建設株式会社', status: 'ACTIVE', created_at: '2026', updated_at: '2026' },
  ];

  const mockWorkers = [
    { worker_id: 'w1', contractor_id: 'c1', name: '佐藤 博', contact: '090-1111-2222', qualifications: [], trainings: [], status: 'ACTIVE', created_at: '2026', updated_at: '2026' },
  ];

  const mockRecords = [
    {
      attendance_id: 'a1',
      worker_id: 'w1',
      contractor_id: 'c1',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:00:00+09:00',
      punched_by: 'u1',
      photo_object_id: 'p1',
      created_at: '2026-04-13T08:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    sessionService.setSession({
      userId: 'admin1',
      displayName: 'テスト管理者',
      role: 'FACTORY_ADMIN',
      contractorId: null,
    });

    IndexedDBAttendanceRepository.prototype.getFilteredRecords = vi.fn().mockResolvedValue(mockRecords);
    IndexedDBAttendanceRepository.prototype.getPhotoBlob = vi.fn().mockResolvedValue({ blob: new Blob() });
    IndexedDBContractorRepository.prototype.getAll = vi.fn().mockResolvedValue(mockContractors);
    IndexedDBWorkerRepository.prototype.getAll = vi.fn().mockResolvedValue(mockWorkers);
  });

  it('正常表示 - FACTORY_ADMINロールのユーザーがアクセスした際、一覧テーブルが表示されること', async () => {
    render(<AttendanceHistoryPage />);

    // Wait for the async loading
    await waitFor(() => {
      expect(screen.getByText('佐藤 博')).toBeInTheDocument();
      expect(screen.getAllByText('大和建設株式会社')[0]).toBeInTheDocument();
      expect(screen.getByText('出勤')).toBeInTheDocument();
    });
  });

  it('未ログインまたは無効なロールの場合にログイン画面へリダイレクトされること', async () => {
    // Clear session to simulate unauthenticated state
    sessionService.clearSession();

    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('日付フィルタおよび企業フィルタを変更し、検索実行時に再取得がトリガーされること', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('佐藤 博')).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText('対象日付');
    fireEvent.change(dateInput, { target: { value: '2026-04-12' } });

    const searchButton = screen.getByRole('button', { name: '検索・再取得' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(IndexedDBAttendanceRepository.prototype.getFilteredRecords).toHaveBeenLastCalledWith(
        '2026-04-12',
        undefined
      );
    });
  });

  it('写真サムネイルクリック時に拡大モーダルが開き、閉じるボタンで閉じられること', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '📷 プレビュー' })).toBeInTheDocument();
    });

    const thumbnailBtn = screen.getByRole('button', { name: '📷 プレビュー' });
    fireEvent.click(thumbnailBtn);

    await waitFor(() => {
      expect(screen.getByText('本人確認写真')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('本人確認写真')).not.toBeInTheDocument();
    });
  });

  it('打刻修正モーダルで、理由を空にしたまま保存を試みるとバリデーションエラーとなること', async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '修正' })).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: '修正' });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('打刻履歴情報の修正')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('⚠️ 修正理由・登録理由は必須です。')).toBeInTheDocument();
    });
  });
});
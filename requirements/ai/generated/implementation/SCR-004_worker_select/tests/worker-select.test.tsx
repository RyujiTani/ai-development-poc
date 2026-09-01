import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import Page from '../app/(contractor)/worker-select/page';
import { setSessionUser, clearSessionUser } from '../lib/auth/session';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

vi.mock('@/lib/db/indexedDb', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined)
}));

const mockWorkers = [
  { worker_id: 'W01', name: '佐藤 一郎', contact: '090-1111-2222', qualifications: ['高所作業車'] },
  { worker_id: 'W02', name: '鈴木 二郎', contact: '090-3333-4444', qualifications: [] }
];

const mockAttendanceRecords = [
  {
    attendance_id: 'A01',
    worker_id: 'W02',
    punch_type: 'CLOCK_IN',
    clocked_at: new Date().toISOString()
  }
];

vi.mock('@/features/worker/repository/workerRepository', () => {
  return {
    IndexedDBWorkerRepository: vi.fn().mockImplementation(() => {
      return {
        getWorkersByContractor: vi.fn().mockResolvedValue(mockWorkers),
        getAttendanceRecordsByDate: vi.fn().mockResolvedValue(mockAttendanceRecords)
      };
    })
  };
});

describe('SCR-004 作業員選択画面テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionUser();
    sessionStorage.clear();
  });

  it('未ログイン状態でアクセスした場合、ログイン画面へリダイレクトされること', async () => {
    render(<Page />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('ログインしている場合は作業員が一覧表示されること', async () => {
    setSessionUser({
      user_id: 'U01',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      display_name: '佐藤 孝'
    });

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('佐藤 一郎')).toBeDefined();
      expect(screen.getByText('鈴木 二郎')).toBeDefined();
    });
  });

  it('鈴木二郎は本日打刻済みのため、打刻済ステータスでありチェックボックスが無効化されていること', async () => {
    setSessionUser({
      user_id: 'U01',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      display_name: '佐藤 孝'
    });

    render(<Page />);

    await waitFor(() => {
      const badges = screen.getAllByText('本日打刻済');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('作業員を1名も選択せずに「次へ進む」をクリックした場合、エラーが表示され画面遷移しないこと', async () => {
    setSessionUser({
      user_id: 'U01',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      display_name: '佐藤 孝'
    });

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('佐藤 一郎')).toBeDefined();
    });

    const nextButton = screen.getByText('次へ進む');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('作業員を1名以上選択してください。')).toBeDefined();
      expect(mockPush).not.toHaveBeenCalledWith('/contractor/punch-photo');
    });
  });

  it('作業員を選択して「次へ進む」をクリックした場合、正常に画面遷移すること', async () => {
    setSessionUser({
      user_id: 'U01',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      display_name: '佐藤 孝'
    });

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('佐藤 一郎')).toBeDefined();
    });

    const row = screen.getByText('佐藤 一郎');
    fireEvent.click(row);

    const nextButton = screen.getByText('次へ進む');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor/punch-photo');
    }, { timeout: 2000 });
  });
});

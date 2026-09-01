import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkerList from '../features/worker/ui/WorkerList';
import { IndexedDBWorkerRepository } from '../features/worker/repository/workerRepository';
import * as authStore from '@/lib/auth/authStore';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

const mockGetWorkers = vi.fn();
const mockDeleteWorker = vi.fn();

vi.mock('../features/worker/repository/workerRepository', () => {
  return {
    IndexedDBWorkerRepository: vi.fn().mockImplementation(() => {
      return {
        getWorkersByContractor: mockGetWorkers,
        deleteWorker: mockDeleteWorker,
      };
    })
  };
});

vi.mock('@/lib/db/indexedDB', () => ({
  seedDatabaseIfEmpty: vi.fn().mockResolvedValue(undefined),
  initDB: vi.fn().mockResolvedValue({}),
}));

declared: window.confirm;

describe('WorkerList component (SCR-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authStore, 'getCurrentUser').mockReturnValue({
      user_id: 'usr-1',
      contractor_id: 'CON-001',
      role: 'CONTRACTOR_MANAGER',
      display_name: '山田 太郎'
    });
  });

  it('loads and displays workers belonging to logged-in contractor (TS-007-001)', async () => {
    mockGetWorkers.mockResolvedValue([
      {
        worker_id: 'w-001',
        contractor_id: 'CON-001',
        name: '佐藤 勝',
        contact: '090-1111-2222',
        qualifications: ['QUAL_001'],
        trainings: [{ code: 'TRN_001', taken_at: '2025-04-10' }],
        status: 'ACTIVE',
        created_at: '',
        updated_at: ''
      },
      {
        worker_id: 'w-002',
        contractor_id: 'CON-001',
        name: '高橋 健二',
        contact: '080-3333-4444',
        qualifications: [],
        trainings: [],
        status: 'ACTIVE',
        created_at: '',
        updated_at: ''
      }
    ]);

    render(<WorkerList />);

    await waitFor(() => {
      expect(screen.getByText('佐藤 勝')).toBeInTheDocument();
      expect(screen.getByText('高橋 健二')).toBeInTheDocument();
    });

    expect(screen.getByText('090-1111-2222')).toBeInTheDocument();
    expect(screen.getByText('フォークリフト運転者')).toBeInTheDocument();
  });

  it('triggers router navigation when create button is clicked (TS-007-002)', async () => {
    mockGetWorkers.mockResolvedValue([]);
    render(<WorkerList />);

    await waitFor(() => {
      expect(screen.getByText('＋ 新規追加')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('＋ 新規追加'));
    expect(mockPush).toHaveBeenCalledWith('/contractor/workers/new');
  });

  it('triggers router navigation when edit button is clicked (TS-007-003)', async () => {
    mockGetWorkers.mockResolvedValue([
      {
        worker_id: 'w-001',
        contractor_id: 'CON-001',
        name: '佐藤 勝',
        contact: '090-1111-2222',
        qualifications: [],
        trainings: [],
        status: 'ACTIVE',
        created_at: '',
        updated_at: ''
      }
    ]);

    render(<WorkerList />);

    await waitFor(() => {
      expect(screen.getByText('佐藤 勝')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: '編集' });
    fireEvent.click(editButtons[0]);
    expect(mockPush).toHaveBeenCalledWith('/contractor/workers/w-001/edit');
  });

  it('performs deletion and refreshes active items on confirmation (TS-007-004)', async () => {
    mockGetWorkers.mockResolvedValueOnce([
      {
        worker_id: 'w-001',
        contractor_id: 'CON-001',
        name: '佐藤 勝',
        status: 'ACTIVE',
        qualifications: [],
        trainings: [],
        created_at: '',
        updated_at: ''
      }
    ]).mockResolvedValueOnce([]); // next load returns empty list

    mockDeleteWorker.mockResolvedValueOnce(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<WorkerList />);

    await waitFor(() => {
      expect(screen.getByText('佐藤 勝')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteWorker).toHaveBeenCalledWith('w-001');

    await waitFor(() => {
      expect(screen.queryByText('佐藤 勝')).not.toBeInTheDocument();
    });
  });

  it('cancels deletion when user clicks cancel (TS-007-005)', async () => {
    mockGetWorkers.mockResolvedValue([
      {
        worker_id: 'w-001',
        contractor_id: 'CON-001',
        name: '佐藤 勝',
        status: 'ACTIVE',
        qualifications: [],
        trainings: [],
        created_at: '',
        updated_at: ''
      }
    ]);

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<WorkerList />);

    await waitFor(() => {
      expect(screen.getByText('佐藤 勝')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteWorker).not.toHaveBeenCalled();
    expect(screen.getByText('佐藤 勝')).toBeInTheDocument();
  });

  it('redirects unauthorized users to login screen (TS-007-006)', async () => {
    vi.spyOn(authStore, 'getCurrentUser').mockReturnValue(null);
    render(<WorkerList />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('triggers router back action when Back button is clicked (TS-007-007)', async () => {
    mockGetWorkers.mockResolvedValue([]);
    render(<WorkerList />);

    await waitFor(() => {
      expect(screen.getByText('← 戻る')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('← 戻る'));
    expect(mockPush).toHaveBeenCalledWith('/contractor');
  });

  it('supports splitting records correctly via pagination controls (TS-007-008)', async () => {
    // Load 25 mock records
    const mockWorkers = Array.from({ length: 25 }, (_, i) => ({
      worker_id: `w-${i}`,
      contractor_id: 'CON-001',
      name: `テスト作業員 ${i + 1}`,
      status: 'ACTIVE' as const,
      qualifications: [],
      trainings: [],
      created_at: '',
      updated_at: ''
    }));

    mockGetWorkers.mockResolvedValue(mockWorkers);

    render(<WorkerList />);

    await waitFor(() => {
      expect(screen.getByText('テスト作業員 1')).toBeInTheDocument();
    });

    // Page 1 should display 20 items
    expect(screen.getByText('テスト作業員 20')).toBeInTheDocument();
    expect(screen.queryByText('テスト作業員 21')).not.toBeInTheDocument();

    // Click page "2" button
    const pageTwoButton = screen.getByRole('button', { name: '2' });
    fireEvent.click(pageTwoButton);

    // Page 2 should display remaining 5 items
    await waitFor(() => {
      expect(screen.getByText('テスト作業員 21')).toBeInTheDocument();
      expect(screen.getByText('テスト作業員 25')).toBeInTheDocument();
      expect(screen.queryByText('テスト作業員 1')).not.toBeInTheDocument();
    });
  });
});

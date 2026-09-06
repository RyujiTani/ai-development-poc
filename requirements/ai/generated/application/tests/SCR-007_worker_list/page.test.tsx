import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, vi, describe, it, beforeEach } from 'vitest';
import WorkerListPage from '@/app/(contractor)/workers/page';
import { IndexedDBWorkerRepository } from '@/features/worker/repository/indexedDBWorkerRepository';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';

// Next.js routerのモックを安定化
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
};
vi.mock('next/navigation', () => ({
  useRouter() {
    return mockRouter;
  },
}));

// loggerのモック
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// 既存のリポジトリ実装をモック化
vi.mock('@/features/worker/repository/indexedDBWorkerRepository');
vi.mock('@/features/user/repository/indexedDBUserRepository');

describe('SCR-007 WorkerListPage', () => {
  const mockUser = {
    user_id: 'usr-001',
    contractor_id: 'con-001',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'valid_contractor',
    password_hash: 'correct_password',
    display_name: '外注先管理者A',
    status: 'ACTIVE',
    created_at: '2026-04-13T00:00:00Z',
    updated_at: '2026-04-13T00:00:00Z',
  };

  const mockWorkers = [
    {
      worker_id: 'W01',
      contractor_id: 'con-001',
      name: '作業員1',
      qualifications: ['玉掛技能者'],
      trainings: [],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    },
    {
      worker_id: 'W02',
      contractor_id: 'con-001',
      name: '作業員2',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const setupAuthSession = () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
  };

  it('TST-007-009: Accessing page with empty session storage redirects to login', async () => {
    render(<WorkerListPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-007-001: Renders user Display Name and own workers, excludes different contractor', async () => {
    setupAuthSession();

    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue(mockUser as any);
    vi.mocked(IndexedDBWorkerRepository.prototype.findByContractorId).mockResolvedValue(mockWorkers as any);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('作業員1')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('作業員2')[0]).toBeInTheDocument();
    expect(screen.getByText('外注先管理者A')).toBeInTheDocument();
    expect(screen.queryByText('他社作業員')).not.toBeInTheDocument();
  });

  it('TST-007-002: Clicking 新規追加 button navigates to new worker route', async () => {
    setupAuthSession();
    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue(mockUser as any);
    vi.mocked(IndexedDBWorkerRepository.prototype.findByContractorId).mockResolvedValue(mockWorkers as any);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('作業員1')[0]).toBeInTheDocument();
    });

    const addButton = screen.getByTestId('add-worker-btn');
    fireEvent.click(addButton);

    expect(mockPush).toHaveBeenCalledWith('/workers/new');
  });

  it('TST-007-003: Clicking 編集 button navigates to the correct edit route', async () => {
    setupAuthSession();
    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue(mockUser as any);
    vi.mocked(IndexedDBWorkerRepository.prototype.findByContractorId).mockResolvedValue(mockWorkers as any);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('作業員1')[0]).toBeInTheDocument();
    });

    const editButton = screen.getByTestId('edit-btn-W01');
    fireEvent.click(editButton);

    expect(mockPush).toHaveBeenCalledWith('/workers/W01');
  });

  it('TST-007-004: Clicking 削除 and confirming triggers delete repository method and updates list', async () => {
    setupAuthSession();
    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue(mockUser as any);
    
    vi.mocked(IndexedDBWorkerRepository.prototype.findByContractorId)
      .mockResolvedValueOnce(mockWorkers as any)
      .mockResolvedValueOnce([mockWorkers[1]] as any);

    const deleteMock = vi.fn().mockResolvedValue(undefined);
    IndexedDBWorkerRepository.prototype.delete = deleteMock;

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('作業員1')[0]).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-btn-W01');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('本当に削除しますか？');
    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('W01');
    });

    await waitFor(() => {
      expect(screen.queryByText('作業員1')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('作業員2')[0]).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('TST-007-008: Cancelling deletion aborts the operation', async () => {
    setupAuthSession();
    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue(mockUser as any);
    vi.mocked(IndexedDBWorkerRepository.prototype.findByContractorId).mockResolvedValue(mockWorkers as any);

    const deleteMock = vi.fn();
    IndexedDBWorkerRepository.prototype.delete = deleteMock;

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('作業員1')[0]).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-btn-W01');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(screen.getAllByText('作業員1')[0]).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('TST-007-010: Clicking 戻る button navigates back to contractor home', async () => {
    setupAuthSession();
    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue(mockUser as any);
    vi.mocked(IndexedDBWorkerRepository.prototype.findByContractorId).mockResolvedValue(mockWorkers as any);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByTestId('back-btn')).toBeInTheDocument();
    });

    const backButton = screen.getByTestId('back-btn');
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('TST-007-006: Pagination splits large datasets correctly', async () => {
    setupAuthSession();
    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue(mockUser as any);

    const largeWorkersList = Array.from({ length: 6 }, (_, i) => ({
      worker_id: `W0${i + 1}`,
      contractor_id: 'con-001',
      name: `作業員${i + 1}`,
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    }));

    vi.mocked(IndexedDBWorkerRepository.prototype.findByContractorId).mockResolvedValue(largeWorkersList as any);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('作業員1')[0]).toBeInTheDocument();
    });
    expect(screen.getAllByText('作業員5')[0]).toBeInTheDocument();
    expect(screen.queryAllByText('作業員6').length).toBe(0);

    const nextPageBtn = screen.getByTestId('next-page-btn');
    fireEvent.click(nextPageBtn);

    await waitFor(() => {
      expect(screen.getAllByText('作業員6')[0]).toBeInTheDocument();
    });
    expect(screen.queryAllByText('作業員1').length).toBe(0);
  });
});
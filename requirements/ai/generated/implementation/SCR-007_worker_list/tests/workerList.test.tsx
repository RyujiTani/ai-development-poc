import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkerListPage from '@/app/(contractor)/workers/page';
import * as sessionModule from '@/lib/auth/session';
import { User } from '@/features/worker/domain/types';

// Mock Router Setup with stable references and mocked repository data using vi.hoisted
const { mockPush, mockRouter, mockRepository, mockWorkers } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockWorkers = [
    {
      worker_id: 'w1',
      contractor_id: 'c1',
      name: '田中 太郎',
      contact: '090-1111-2222',
      qualifications: ['QUAL_01'],
      trainings: [{ code: 'TR_01', taken_at: '2025-04-10' }],
      status: 'ACTIVE',
      created_at: '',
      updated_at: '',
    },
    {
      worker_id: 'w2',
      contractor_id: 'c1',
      name: '鈴木 一郎',
      contact: '090-3333-4444',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: '',
      updated_at: '',
    },
  ];
  const mockRepository = {
    getWorkersByContractor: vi.fn().mockResolvedValue(mockWorkers),
    deleteWorker: vi.fn().mockResolvedValue(undefined),
  };
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockRepository,
    mockWorkers,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock Database module
vi.mock('../lib/db/indexedDb', () => ({
  seedIfNeeded: vi.fn().mockResolvedValue(undefined),
  initDB: vi.fn().mockResolvedValue({}),
}));

vi.mock('../features/worker/repository/workerRepository', () => {
  return {
    WorkerRepository: vi.fn().mockImplementation(() => mockRepository),
  };
});

describe('WorkerListPage', () => {
  const mockUser: User = {
    user_id: 'u1',
    contractor_id: 'c1',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'manager1',
    password_hash: 'hash',
    display_name: 'A建設 管理者',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('未認証の状態でアクセスした際、ログイン画面にリダイレクトされること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(null);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('外注先管理者として認証済みの場合、自社の作業員一覧が正しく表示されること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(mockUser);
    mockRepository.getWorkersByContractor.mockResolvedValueOnce(mockWorkers);

    render(<WorkerListPage />);

    // ローディングが終わり、作業員の氏名が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
      expect(screen.getByText('鈴木 一郎')).toBeInTheDocument();
    });
  });

  it('新規追加ボタンをクリックした際、新規追加画面（SCR-008）へ遷移すること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(mockUser);
    mockRepository.getWorkersByContractor.mockResolvedValueOnce(mockWorkers);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText('新規作業員登録')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新規作業員登録'));
    expect(mockPush).toHaveBeenCalledWith('/contractor/workers/new');
  });

  it('特定の作業員の編集ボタンをクリックした際、編集画面（SCR-008）へ正しいパラメータを伴って遷移すること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(mockUser);
    mockRepository.getWorkersByContractor.mockResolvedValueOnce(mockWorkers);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]); // 田中 太郎の編集ボタン

    expect(mockPush).toHaveBeenCalledWith('/contractor/workers/edit?id=w1');
  });

  it('削除ボタンをクリックし確認ダイアログでOKした際、データが削除され一覧が更新されること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(mockUser);
    mockRepository.getWorkersByContractor.mockResolvedValueOnce(mockWorkers);
    
    // 削除後のリスト状態を模倣（鈴木一郎のみ残る）
    const remainingWorkers = [mockWorkers[1]];
    mockRepository.getWorkersByContractor.mockResolvedValueOnce(remainingWorkers);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]); // 田中 太郎の削除ボタン

    expect(window.confirm).toHaveBeenCalledWith('作業員「田中 太郎」を本当に削除しますか？');
    
    await waitFor(() => {
      expect(mockRepository.deleteWorker).toHaveBeenCalledWith('w1');
      expect(screen.queryByText('田中 太郎')).not.toBeInTheDocument();
      expect(screen.getByText('鈴木 一郎')).toBeInTheDocument();
    });
  });

  it('「戻る」ボタンをクリックした際、ホーム画面へ遷移すること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(mockUser);
    mockRepository.getWorkersByContractor.mockResolvedValueOnce(mockWorkers);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText('戻る')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('戻る'));
    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
  });
});
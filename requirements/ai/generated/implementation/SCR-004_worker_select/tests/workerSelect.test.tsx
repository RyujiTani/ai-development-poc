import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import WorkerSelectPage from '@/app/(contractor)/worker-select/page';
import { useWorkerSelectStore } from '@/features/attendance/ui/WorkerSelectStore';
import { getSessionUser } from '@/lib/auth/mockAuth';

// モックヘルパー
const { mockPush, mockRouter, mockGetWorkersByContractor, MockWorkerRepository } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockGetWorkersByContractor = vi.fn().mockResolvedValue([
    {
      worker_id: 'w-1',
      contractor_id: 'cont-abc',
      name: '作業員A',
      status: 'ACTIVE',
      qualifications: [],
      trainings: [],
      created_at: '',
      updated_at: '',
    },
    {
      worker_id: 'w-2',
      contractor_id: 'cont-abc',
      name: '作業員B',
      status: 'ACTIVE',
      qualifications: ['QUAL-001'],
      trainings: [],
      created_at: '',
      updated_at: '',
    },
  ]);
  const MockWorkerRepository = vi.fn().mockImplementation(() => ({
    getWorkersByContractor: mockGetWorkersByContractor,
  }));
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockGetWorkersByContractor,
    MockWorkerRepository,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/lib/auth/mockAuth', () => ({
  getSessionUser: vi.fn(),
  setSessionUser: vi.fn(),
  clearSessionUser: vi.fn(),
}));

vi.mock('@/features/attendance/repository/workerRepository', () => ({
  WorkerRepository: MockWorkerRepository,
}));

vi.mock('@/lib/db/indexedDB', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
  initDB: vi.fn(),
}));

describe('SCR-004 作業員選択画面', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkerSelectStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: [],
    });

    vi.mocked(getSessionUser).mockReturnValue({
      user_id: 'user-manager-1',
      contractor_id: 'cont-abc',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'manager1',
      password_hash: 'dummy',
      display_name: '山田 太郎',
      status: 'ACTIVE',
      created_at: '',
      updated_at: '',
    });
  });

  it('未ログイン時にログイン画面にリダイレクトされること', async () => {
    vi.mocked(getSessionUser).mockReturnValue(null);

    await act(async () => {
      render(<WorkerSelectPage />);
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('作業員リストが正しく表示されること', async () => {
    await act(async () => {
      render(<WorkerSelectPage />);
    });

    expect(screen.getByText('作業員A')).toBeInTheDocument();
    expect(screen.getByText('作業員B')).toBeInTheDocument();
    expect(screen.getByText('☀️ 出勤モード')).toBeInTheDocument();
  });

  it('個別チェックボックスを選択できること', async () => {
    await act(async () => {
      render(<WorkerSelectPage />);
    });

    const checkboxes = screen.getAllByRole('checkbox');
    // インデックス0は一括選択用、1が作業員A
    const workerACheckbox = checkboxes[1];

    await act(async () => {
      fireEvent.click(workerACheckbox);
    });

    expect(useWorkerSelectStore.getState().selectedWorkerIds).toContain('w-1');
  });

  it('一括選択チェックボックスが動作すること', async () => {
    await act(async () => {
      render(<WorkerSelectPage />);
    });

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];

    await act(async () => {
      fireEvent.click(selectAllCheckbox);
    });

    expect(useWorkerSelectStore.getState().selectedWorkerIds).toContain('w-1');
    expect(useWorkerSelectStore.getState().selectedWorkerIds).toContain('w-2');
  });

  it('誰も選択せずに「次へ進む」を押下したとき、エラーメッセージが表示されること', async () => {
    await act(async () => {
      render(<WorkerSelectPage />);
    });

    const nextBtn = screen.getByText('次へ進む (カメラ起動)');

    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(screen.getByText('作業員を1名以上選択してください。')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith('/worker-select/photo');
  });

  it('作業員を選択して「次へ進む」を押下したとき、撮影画面へ遷移すること', async () => {
    await act(async () => {
      render(<WorkerSelectPage />);
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await act(async () => {
      fireEvent.click(checkboxes[1]); // 作業員Aを選択
    });

    const nextBtn = screen.getByText('次へ進む (カメラ起動)');
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(mockPush).toHaveBeenCalledWith('/worker-select/photo');
  });

  it('「戻る」ボタン押下時に、打刻モード選択画面へ戻ること', async () => {
    await act(async () => {
      render(<WorkerSelectPage />);
    });

    const backBtn = screen.getByText('戻る');
    await act(async () => {
      fireEvent.click(backBtn);
    });

    expect(mockPush).toHaveBeenCalledWith('/punch-mode');
  });
});
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkerListPage from '@/app/(contractor)/worker-list/page';
import { WorkerUseCase } from '@/features/worker/usecase/workerUseCase';

// Hoist mock logic with a single stable object to prevent uninitialized reference or binding loss
const mocks = vi.hoisted(() => {
  return {
    mockPush: vi.fn(),
    mockGetWorkers: vi.fn(),
    mockDeleteWorker: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.mockPush,
  }),
}));

vi.mock('@/features/worker/usecase/workerUseCase', () => {
  return {
    WorkerUseCase: vi.fn().mockImplementation(() => {
      return {
        getWorkers: mocks.mockGetWorkers,
        deleteWorker: mocks.mockDeleteWorker,
      };
    }),
  };
});

// Mock Auth system
const mockGetSession = vi.fn();
const mockIsAuthenticated = vi.fn();
const mockIsContractorManager = vi.fn();

vi.mock('@/lib/auth/mockAuth', () => ({
  getSession: () => mockGetSession(),
  isAuthenticated: () => mockIsAuthenticated(),
  isContractorManager: () => mockIsContractorManager(),
}));

describe('WorkerListPage (SCR-007)', () => {
  const dummyUser = {
    user_id: 'U001',
    contractor_id: 'C001',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'meiwa-mgr',
    display_name: '佐藤 健二（明和建設）',
    status: 'ACTIVE',
  };

  const dummyWorkers = [
    {
      worker_id: 'W001',
      contractor_id: 'C001',
      name: '山田 太郎',
      contact: '090-1111-2222',
      qualifications: ['Q01'],
      trainings: [{ code: 'T01', taken_at: '2026-04-01' }],
      status: 'ACTIVE',
    },
    {
      worker_id: 'W002',
      contractor_id: 'C001',
      name: '佐藤 次郎',
      contact: '080-3333-4444',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup: authenticated contractor manager
    mockIsAuthenticated.mockReturnValue(true);
    mockIsContractorManager.mockReturnValue(true);
    mockGetSession.mockReturnValue(dummyUser);
    mocks.mockGetWorkers.mockResolvedValue({ success: true, data: dummyWorkers });
  });

  it('TS-SCR-007-001: 自社の作業員一覧が正しく取得され表示されること', async () => {
    render(<WorkerListPage />);

    // Verify initial load sequence calls UseCase with contractor_id
    await waitFor(() => {
      expect(mocks.mockGetWorkers).toHaveBeenCalledWith('C001');
    });

    // Check display values
    expect(screen.getByText('山田 太郎')).toBeDefined();
    expect(screen.getByText('佐藤 次郎')).toBeDefined();
    expect(screen.getByText('090-1111-2222')).toBeDefined();
  });

  it('TS-SCR-007-002: 新規追加ボタンをクリックした際に、新規追加画面へ遷移すること', async () => {
    render(<WorkerListPage />);
    await waitFor(() => expect(mocks.mockGetWorkers).toHaveBeenCalled());

    const addBtn = screen.getByTestId('add-worker-btn');
    fireEvent.click(addBtn);

    expect(mocks.mockPush).toHaveBeenCalledWith('/worker-edit');
  });

  it('TS-SCR-007-003: 編集ボタンをクリックした際に、該当作業員のIDを付与して編集画面に遷移すること', async () => {
    render(<WorkerListPage />);
    await waitFor(() => expect(mocks.mockGetWorkers).toHaveBeenCalled());

    const editBtn = screen.getByTestId('edit-btn-W001');
    fireEvent.click(editBtn);

    expect(mocks.mockPush).toHaveBeenCalledWith('/worker-edit?id=W001');
  });

  it('TS-SCR-007-004: 削除ボタン押下し、確認ダイアログで確定した際、削除APIが呼ばれ、一覧が更新されトーストが表示されること', async () => {
    mocks.mockDeleteWorker.mockResolvedValue({ success: true, data: undefined });

    render(<WorkerListPage />);
    await waitFor(() => expect(mocks.mockGetWorkers).toHaveBeenCalled());

    // Click delete to open dialog
    const deleteBtn = screen.getByTestId('delete-btn-W001');
    fireEvent.click(deleteBtn);

    // Verify dialog presence
    expect(screen.getByTestId('delete-confirm-dialog')).toBeDefined();

    // Click confirm in dialog
    const confirmBtn = screen.getByTestId('dialog-confirm-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mocks.mockDeleteWorker).toHaveBeenCalledWith('W001', 'C001');
    });

    // Toast message validation
    await waitFor(() => {
      expect(screen.getByTestId('toast-notification')).toBeDefined();
      expect(screen.getByText('作業員を削除しました。')).toBeDefined();
    });

    // Worker W001 should be removed from view
    expect(screen.queryByText('山田 太郎')).toBeNull();
  });

  it('TS-SCR-007-005: 戻るボタンをクリックした際に、ホーム画面に遷移すること', async () => {
    render(<WorkerListPage />);
    await waitFor(() => expect(mocks.mockGetWorkers).toHaveBeenCalled());

    const backBtn = screen.getByTestId('back-btn');
    fireEvent.click(backBtn);

    expect(mocks.mockPush).toHaveBeenCalledWith('/contractor-home');
  });

  it('TS-SCR-007-006: 未認証アクセスまたは別ロール時に、ログイン画面へ自動リダイレクトされること', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-SCR-007-007: 削除確認ダイアログでキャンセルをクリックした際、データが削除されないこと', async () => {
    render(<WorkerListPage />);
    await waitFor(() => expect(mocks.mockGetWorkers).toHaveBeenCalled());

    const deleteBtn = screen.getByTestId('delete-btn-W001');
    fireEvent.click(deleteBtn);

    // Click cancel in dialog
    const cancelBtn = screen.getByTestId('dialog-cancel-btn');
    fireEvent.click(cancelBtn);

    // Dialog should close, and mockDeleteWorker should NOT have been called
    expect(screen.queryByTestId('delete-confirm-dialog')).toBeNull();
    expect(mocks.mockDeleteWorker).not.toHaveBeenCalled();
    expect(screen.getByText('山田 太郎')).toBeDefined(); // still in list
  });
});
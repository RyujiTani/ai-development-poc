import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkerListPage from '../../app/(contractor)/contractor/workers/page';
import { ToastProvider } from '../../components/ui/toast';

// モック関数の準備（Vitestの巻き上げに対応するため vi.hoisted を使用）
const mocks = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockExecuteGetWorkers = vi.fn();
  const mockExecuteDeleteWorker = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockExecuteGetWorkers,
    mockExecuteDeleteWorker,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.mockRouter,
}));

vi.mock('../../features/worker/usecase/getWorkersUseCase', () => {
  return {
    GetWorkersUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mocks.mockExecuteGetWorkers,
      };
    }),
  };
});

vi.mock('../../features/worker/usecase/deleteWorkerUseCase', () => {
  return {
    DeleteWorkerUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mocks.mockExecuteDeleteWorker,
      };
    }),
  };
});

describe('SCR-007: 作業員一覧画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <WorkerListPage />
      </ToastProvider>
    );
  };

  it('TST-SCR-007-001: ログイン中の外注先に所属するアクティブな作業員のみが正しく表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    const mockWorkers = [
      {
        worker_id: 'w111',
        contractor_id: 'c1111111-1111-1111-1111-111111111111',
        name: '大島 太郎',
        contact: '090-1111-1111',
        qualifications: ['Q001'],
        trainings: [{ code: 'T001', taken_at: '2026-04-13' }],
        status: 'ACTIVE',
      },
    ];

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: mockWorkers,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('大島 太郎')).toBeInTheDocument();
    expect(screen.getByText('090-1111-1111')).toBeInTheDocument();
    expect(screen.getByText('Q001')).toBeInTheDocument();
    expect(screen.getByText('講習済 (1)')).toBeInTheDocument();
  });

  it('TST-SCR-007-002: 未ログイン状態で直接アクセスした際、ログイン画面（/login）へリダイレクトされること', async () => {
    sessionStorage.clear(); // 未セッション状態

    renderComponent();

    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-SCR-007-003: 「新規追加」ボタンをクリックした際、新規追加用のパスへ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /新規追加/ });
    fireEvent.click(addButton);

    expect(mocks.mockPush).toHaveBeenCalledWith('/contractor/workers/add');
  });

  it('TST-SCR-007-004: 特定の作業員の「編集」ボタンをクリックした際、該当作業員の編集用パスへ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    const mockWorkers = [
      {
        worker_id: 'w111',
        contractor_id: 'c1111111',
        name: '大島 太郎',
        status: 'ACTIVE',
      },
    ];

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: mockWorkers,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: '編集' });
    fireEvent.click(editButton);

    expect(mocks.mockPush).toHaveBeenCalledWith('/contractor/workers/edit?id=w111');
  });

  it('TST-SCR-007-005: 「削除」ボタンをクリックした際、確認モーダルが表示され、決定時に削除APIが呼ばれてトーストが表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    const mockWorkers = [
      {
        worker_id: 'w111',
        contractor_id: 'c1111111',
        name: '大島 太郎',
        status: 'ACTIVE',
      },
    ];

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: mockWorkers,
    });

    mocks.mockExecuteDeleteWorker.mockResolvedValue({
      success: true,
      value: undefined,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 削除確認前はダイアログは非表示
    expect(screen.queryByText('作業員の削除確認')).not.toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteButton);

    // ダイアログが出現することを確認
    expect(screen.getByText('作業員の削除確認')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: '削除する' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mocks.mockExecuteDeleteWorker).toHaveBeenCalledWith('w111');
    });

    await waitFor(() => {
      expect(screen.getByText('作業員データを削除しました。')).toBeInTheDocument();
    });
  });

  it('TST-SCR-007-006: 「メニューに戻る」ボタンをクリックした際、外注先ホーム画面（/contractor）へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111');

    mocks.mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /メニューに戻る/ });
    fireEvent.click(backButton);

    expect(mocks.mockPush).toHaveBeenCalledWith('/contractor');
  });
});
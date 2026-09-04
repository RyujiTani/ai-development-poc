import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkerSelectPage from '../../../app/(contractor)/contractor/worker-select/page';
import { ToastProvider } from '../../../components/ui/toast';
import { useAttendanceStore } from '../../../features/attendance/store/useAttendanceStore';

// Next.js ナビゲーションおよびUseCaseの安定したモック
const { mockPush, mockRouter, mockExecuteGetWorkers } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockExecuteGetWorkers = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockExecuteGetWorkers,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('../../../features/worker/usecase/getWorkersUseCase', () => {
  return {
    GetWorkersUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteGetWorkers,
      };
    }),
  };
});

describe('SCR-004: 作業員選択画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAttendanceStore.getState().clearAttendanceSession();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <WorkerSelectPage />
      </ToastProvider>
    );
  };

  it('TST-004-004: 未ログイン状態でアクセスした際、/login にリダイレクトされること', async () => {
    sessionStorage.clear();

    renderComponent();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-004-001: ログイン中の外注先に紐づく有効な作業員のみが一覧に表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    useAttendanceStore.getState().setPunchType('CLOCK_IN');

    const mockWorkers = [
      {
        worker_id: 'w111',
        contractor_id: 'c1111111-1111-1111-1111-111111111111',
        name: '大島 太郎',
        contact: '090-1111-1111',
        qualifications: ['Q001'],
        trainings: [],
        status: 'ACTIVE',
      },
      {
        worker_id: 'w222',
        contractor_id: 'c1111111-1111-1111-1111-111111111111',
        name: '大島 次郎',
        contact: '090-2222-2222',
        qualifications: [],
        trainings: [],
        status: 'ACTIVE',
      },
    ];

    mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: mockWorkers,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('大島 太郎')).toBeInTheDocument();
    expect(screen.getByText('大島 次郎')).toBeInTheDocument();
    expect(screen.getByText('Q001')).toBeInTheDocument();
  });

  it('TST-004-002: チェックボックスを個別、一括でON/OFF切り替えできること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    useAttendanceStore.getState().setPunchType('CLOCK_IN');

    const mockWorkers = [
      {
        worker_id: 'w111',
        contractor_id: 'c1111111-1111-1111-1111-111111111111',
        name: '大島 太郎',
        status: 'ACTIVE',
        qualifications: [],
        trainings: [],
      },
      {
        worker_id: 'w222',
        contractor_id: 'c1111111-1111-1111-1111-111111111111',
        name: '大島 次郎',
        status: 'ACTIVE',
        qualifications: [],
        trainings: [],
      },
    ];

    mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: mockWorkers,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 1. 個別選択
    const row1 = screen.getByText('大島 太郎').closest('tr');
    fireEvent.click(row1!);

    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(['w111']);

    // 2. 一括選択
    const allCheckbox = document.getElementById('select-all-checkbox');
    fireEvent.click(allCheckbox!);

    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(['w111', 'w222']);

    // 3. 一括解除
    fireEvent.click(allCheckbox!);
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual([]);
  });

  it('TST-004-003: 1名も選択していない状態で次へ進もうとした際、エラーが表示され遷移しないこと', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    useAttendanceStore.getState().setPunchType('CLOCK_IN');

    const mockWorkers = [
      {
        worker_id: 'w111',
        contractor_id: 'c1111111-1111-1111-1111-111111111111',
        name: '大島 太郎',
        status: 'ACTIVE',
        qualifications: [],
        trainings: [],
      },
    ];

    mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: mockWorkers,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /次へ/ });
    fireEvent.click(nextButton);

    expect(screen.getByText('作業員を1名以上選択してください。')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('TST-004-005: 1名以上選択状態で次へ進むと、状態が保持され撮影・送信画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    useAttendanceStore.getState().setPunchType('CLOCK_IN');

    const mockWorkers = [
      {
        worker_id: 'w111',
        contractor_id: 'c1111111-1111-1111-1111-111111111111',
        name: '大島 太郎',
        status: 'ACTIVE',
        qualifications: [],
        trainings: [],
      },
    ];

    mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: mockWorkers,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const row1 = screen.getByText('大島 太郎').closest('tr');
    fireEvent.click(row1!);

    const nextButton = screen.getByRole('button', { name: /次へ/ });
    fireEvent.click(nextButton);

    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(['w111']);
    expect(useAttendanceStore.getState().punchType).toBe('CLOCK_IN');
    expect(mockPush).toHaveBeenCalledWith('/contractor/punch-photo');
  });

  it('TST-004-006: 戻るボタンをクリックした際、打刻モード選択画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    useAttendanceStore.getState().setPunchType('CLOCK_IN');

    mockExecuteGetWorkers.mockResolvedValue({
      success: true,
      value: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const backButton = screen.getAllByRole('button', { name: '戻る' })[0];
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor/punch-mode');
  });
});
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WorkerSelectPage from '../app/(contractor)/worker-select/page';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import * as sessionStore from '@/lib/auth/sessionStore';

// Next.js Navigation Mock
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

// Mock Worker UseCase
vi.mock('@/features/worker/usecase/workerUseCase', () => {
  return {
    WorkerUseCase: class {
      getWorkersByContractor = vi.fn().mockResolvedValue([
        {
          worker_id: 'WKR-001',
          contractor_id: 'CON-001',
          name: '山田 太郎',
          status: 'ACTIVE',
          qualifications: [],
          trainings: [],
          created_at: '',
          updated_at: '',
        },
        {
          worker_id: 'WKR-002',
          contractor_id: 'CON-001',
          name: '佐藤 次郎',
          status: 'ACTIVE',
          qualifications: [],
          trainings: [],
          created_at: '',
          updated_at: '',
        },
      ]);
    },
  };
});

describe('WorkerSelectPage (SCR-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAttendanceStore.setState({
      punchMode: 'CLOCK_IN',
      selectedWorkerIds: [],
    });
  });

  it('TST-SCR-004-001: ログインユーザーの企業に紐づく作業員一覧が表示されること', async () => {
    // セッションの設定
    vi.spyOn(sessionStore, 'getSession').mockReturnValue({
      userId: 'USR-001',
      contractorId: 'CON-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: 'テスト管理者',
    });

    await act(async () => {
      render(<WorkerSelectPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤 次郎')).toBeInTheDocument();
    });
  });

  it('TST-SCR-004-002: 個別のチェックボックスを選択した際、状態が変化すること', async () => {
    vi.spyOn(sessionStore, 'getSession').mockReturnValue({
      userId: 'USR-001',
      contractorId: 'CON-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: 'テスト管理者',
    });

    await act(async () => {
      render(<WorkerSelectPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[1]; // [0]は全選択チェックボックス
    await act(async () => {
      fireEvent.click(checkbox);
    });

    expect(useAttendanceStore.getState().selectedWorkerIds).toContain('WKR-001');
  });

  it('TST-SCR-004-003: 一括選択チェックボックスで全選択・解除ができること', async () => {
    vi.spyOn(sessionStore, 'getSession').mockReturnValue({
      userId: 'USR-001',
      contractorId: 'CON-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: 'テスト管理者',
    });

    await act(async () => {
      render(<WorkerSelectPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    
    // 全選択ON
    await act(async () => {
      fireEvent.click(selectAllCheckbox);
    });
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(['WKR-001', 'WKR-002']);

    // 全選択OFF
    await act(async () => {
      fireEvent.click(selectAllCheckbox);
    });
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual([]);
  });

  it('TST-SCR-004-004: 未選択時に「次へ」ボタンを押下するとトーストが表示されること', async () => {
    vi.spyOn(sessionStore, 'getSession').mockReturnValue({
      userId: 'USR-001',
      contractorId: 'CON-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: 'テスト管理者',
    });

    await act(async () => {
      render(<WorkerSelectPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('次へ');
    await act(async () => {
      fireEvent.click(nextButton);
    });

    expect(screen.getByText('作業員を1名以上選択してください。')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith('/contractor/shoot');
  });

  it('TST-SCR-004-005: 未認証状態でアクセスした場合はログイン画面にリダイレクトされること', async () => {
    vi.spyOn(sessionStore, 'getSession').mockReturnValue(null);

    await act(async () => {
      render(<WorkerSelectPage />);
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TST-SCR-004-006: 選択済みで「次へ」を押下したとき、状態を引き継いで撮影画面へ遷移すること', async () => {
    vi.spyOn(sessionStore, 'getSession').mockReturnValue({
      userId: 'USR-001',
      contractorId: 'CON-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: 'テスト管理者',
    });

    await act(async () => {
      render(<WorkerSelectPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    // 1名選択
    const checkbox = screen.getAllByRole('checkbox')[1];
    await act(async () => {
      fireEvent.click(checkbox);
    });

    const nextButton = screen.getByText('次へ');
    await act(async () => {
      fireEvent.click(nextButton);
    });

    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(['WKR-001']);
    expect(mockPush).toHaveBeenCalledWith('/contractor/shoot');
  });

  it('TST-SCR-004-007: 「戻る」ボタンを押下したとき、打刻モード選択画面へ遷移すること', async () => {
    vi.spyOn(sessionStore, 'getSession').mockReturnValue({
      userId: 'USR-001',
      contractorId: 'CON-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: 'テスト管理者',
    });

    await act(async () => {
      render(<WorkerSelectPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    const backButton = screen.getByText('戻る');
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/contractor/punch-mode');
  });
});
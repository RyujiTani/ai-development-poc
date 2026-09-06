import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkerSelectPage from '@/app/(contractor)/workers-select/page';
import { useAttendanceStore } from '@/features/attendance/store/useAttendanceStore';
import { initDB } from '@/lib/db';
import 'fake-indexeddb/auto';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

async function setupTestDB() {
  const db = await initDB();
  
  // users
  const txU = db.transaction('users', 'readwrite');
  await txU.objectStore('users').put({
    user_id: 'usr-001',
    contractor_id: 'con-001',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'managerA',
    password_hash: 'hash',
    display_name: '管理者A',
    status: 'ACTIVE',
    created_at: '2026-04-13T00:00:00+09:00',
    updated_at: '2026-04-13T00:00:00+09:00'
  });
  await txU.done;

  // workers
  const txW = db.transaction('workers', 'readwrite');
  await txW.objectStore('workers').put({
    worker_id: 'wrk-001',
    contractor_id: 'con-001',
    name: '山田 太郎',
    qualifications: ['QUAL_001'],
    trainings: [],
    status: 'ACTIVE',
    created_at: '2026-04-13T00:00:00+09:00',
    updated_at: '2026-04-13T00:00:00+09:00'
  });
  await txW.objectStore('workers').put({
    worker_id: 'wrk-002',
    contractor_id: 'con-001',
    name: '佐藤 次郎',
    qualifications: [],
    trainings: [],
    status: 'ACTIVE',
    created_at: '2026-04-13T00:00:00+09:00',
    updated_at: '2026-04-13T00:00:00+09:00'
  });
  await txW.objectStore('workers').put({
    worker_id: 'wrk-003',
    contractor_id: 'con-002', // 他社所属
    name: '鈴木 三郎',
    qualifications: [],
    trainings: [],
    status: 'ACTIVE',
    created_at: '2026-04-13T00:00:00+09:00',
    updated_at: '2026-04-13T00:00:00+09:00'
  });
  await txW.done;
}

describe('WorkerSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAttendanceStore.getState().clear();
  });

  it('TST-001: should load and display active workers of the authenticated contractor manager', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    await setupTestDB();

    render(<WorkerSelectPage />);

    // ロード完了を待つ
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    // 自社の作業員だけが表示され、他社の作業員は非表示であることを確認
    expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    expect(screen.getByText('佐藤 次郎')).toBeInTheDocument();
    expect(screen.queryByText('鈴木 三郎')).toBeNull();
  });

  it('TST-002: should toggle checkbox state when clicked', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    await setupTestDB();

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const checkbox1 = screen.getByTestId('worker-checkbox-wrk-001') as HTMLInputElement;
    expect(checkbox1.checked).toBe(false);

    fireEvent.click(checkbox1);
    expect(checkbox1.checked).toBe(true);

    fireEvent.click(checkbox1);
    expect(checkbox1.checked).toBe(false);
  });

  it('TST-003: should toggle all checkboxes with the select-all checkbox', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    await setupTestDB();

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const selectAllCheckbox = screen.getByTestId('select-all-checkbox') as HTMLInputElement;
    const checkbox1 = screen.getByTestId('worker-checkbox-wrk-001') as HTMLInputElement;
    const checkbox2 = screen.getByTestId('worker-checkbox-wrk-002') as HTMLInputElement;

    expect(selectAllCheckbox.checked).toBe(false);
    expect(checkbox1.checked).toBe(false);
    expect(checkbox2.checked).toBe(false);

    // 全選択
    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox.checked).toBe(true);
    expect(checkbox1.checked).toBe(true);
    expect(checkbox2.checked).toBe(true);

    // 全解除
    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox.checked).toBe(false);
    expect(checkbox1.checked).toBe(false);
    expect(checkbox2.checked).toBe(false);
  });

  it('TST-004: should display the correct punch mode badge', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    await setupTestDB();

    useAttendanceStore.getState().setPunchType('CLOCK_IN');

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const badge = screen.getByTestId('punch-mode-badge');
    expect(badge).toHaveTextContent('出勤モード');
  });

  it('TST-005: should show validation error when next is clicked with no workers selected', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    await setupTestDB();

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const nextBtn = screen.getByTestId('next-btn');
    fireEvent.click(nextBtn);

    expect(screen.getByText('作業員を1名以上選択してください。')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('TST-006: should redirect to login if unauthenticated', async () => {
    // セッションなし
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-007: should save state and navigate to the shoot screen when workers are selected and next is clicked', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    await setupTestDB();

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const checkbox1 = screen.getByTestId('worker-checkbox-wrk-001');
    const checkbox2 = screen.getByTestId('worker-checkbox-wrk-002');

    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);

    const nextBtn = screen.getByTestId('next-btn');
    fireEvent.click(nextBtn);

    // Zustandの状態が更新され、遷移することを確認
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(['wrk-001', 'wrk-002']);
    expect(mockPush).toHaveBeenCalledWith('/punch-camera');
  });

  it('TST-008: should navigate back to punch mode selection on back button click', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    await setupTestDB();

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const backBtn = screen.getByRole('button', { name: '戻る' });
    fireEvent.click(backBtn);

    expect(mockPush).toHaveBeenCalledWith('/punch-mode');
  });
});
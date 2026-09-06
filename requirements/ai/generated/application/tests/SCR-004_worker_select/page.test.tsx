import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkerSelectPage from '@/app/(contractor)/worker-select/page';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import { initDB } from '@/lib/db/indexedDB';
import 'fake-indexeddb/auto';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('SCR-004 作業員選択画面テスト', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useAttendanceStore.getState().reset();
    useAttendanceStore.getState().setPunchType('CLOCK_IN');

    // sessionStorage モック
    const store: Record<string, string> = {
      user_id: 'u1-uuid',
      role: 'CONTRACTOR_MANAGER',
      contractor_id: 'c1-uuid',
    };
    
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(key => delete store[key]); }
    });

    // IndexedDB初期データ準備
    const db = await initDB();

    // contractors
    const contractorTx = db.transaction('contractors', 'readwrite');
    await contractorTx.objectStore('contractors').put({
      contractor_id: 'c1-uuid',
      name: '第一建設',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await contractorTx.done;

    // users
    const userTx = db.transaction('users', 'readwrite');
    await userTx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'c1-uuid',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await userTx.done;

    // workers
    const workerTx = db.transaction('workers', 'readwrite');
    // 自社所属 ACTIVE
    await workerTx.objectStore('workers').put({
      worker_id: 'w1-uuid',
      contractor_id: 'c1-uuid',
      name: '作業員 A',
      status: 'ACTIVE',
      qualifications: ['資格1'],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await workerTx.objectStore('workers').put({
      worker_id: 'w2-uuid',
      contractor_id: 'c1-uuid',
      name: '作業員 B',
      status: 'ACTIVE',
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    // 自社所属 RETIRED
    await workerTx.objectStore('workers').put({
      worker_id: 'w3-uuid',
      contractor_id: 'c1-uuid',
      name: '作業員 C',
      status: 'RETIRED',
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    // 他社所属 ACTIVE
    await workerTx.objectStore('workers').put({
      worker_id: 'w4-uuid',
      contractor_id: 'c2-uuid',
      name: '他社作業員 X',
      status: 'ACTIVE',
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await workerTx.done;
  });

  it('ログイン中の外注先に紐づくACTIVEな作業員のみが氏名順で表示されること', async () => {
    render(<WorkerSelectPage />);

    // 読み込み完了まで待つ
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 田中職長の名前が表示される
    expect(screen.getByText('田中 職長')).toBeInTheDocument();

    // 自社所属ACTIVE作業員のみ表示される
    expect(screen.getByText('作業員 A')).toBeInTheDocument();
    expect(screen.getByText('作業員 B')).toBeInTheDocument();

    // 自社所属RETIREDおよび他社所属作業員は非表示であること
    expect(screen.queryByText('作業員 C')).not.toBeInTheDocument();
    expect(screen.queryByText('他社作業員 X')).not.toBeInTheDocument();
  });

  it('チェックボックスをクリックして個別選択および全選択ができること', async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    // 全選択、作業員A、作業員Bの合計3つ
    expect(checkboxes.length).toBe(3);

    const selectAllCheckbox = checkboxes[0];
    const workerACheckbox = checkboxes[1];

    // 作業員Aを選択
    fireEvent.click(workerACheckbox);
    expect(useAttendanceStore.getState().selectedWorkerIds).toContain('w1-uuid');

    // 全選択をON
    fireEvent.click(selectAllCheckbox);
    expect(useAttendanceStore.getState().selectedWorkerIds).toContain('w1-uuid');
    expect(useAttendanceStore.getState().selectedWorkerIds).toContain('w2-uuid');

    // 全選択をOFF
    fireEvent.click(selectAllCheckbox);
    expect(useAttendanceStore.getState().selectedWorkerIds).not.toContain('w1-uuid');
    expect(useAttendanceStore.getState().selectedWorkerIds).not.toContain('w2-uuid');
  });

  it('1名も選択せずに「次へ」を押下したとき、エラーメッセージが表示され、画面遷移しないこと', async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /次へ/ });
    fireEvent.click(nextButton);

    // エラーメッセージ確認
    expect(screen.getByText('作業員を1名以上選択してください')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('1名以上選択して「次へ」を押下したとき、次の画面へ遷移し状態が保持されること', async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const workerACheckbox = checkboxes[1];

    // 作業員Aを選択
    fireEvent.click(workerACheckbox);

    const nextButton = screen.getByRole('button', { name: /次へ/ });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/attendance-capture/capture');
    });

    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(['w1-uuid']);
  });

  it('「戻る」ボタンを押下したとき、選択状態が初期化されてモード選択画面へ戻ること', async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const workerACheckbox = checkboxes[1];
    fireEvent.click(workerACheckbox);

    const backButton = screen.getAllByRole('button', { name: '戻る' })[0];
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor/punch-mode');
    });

    // 状態がリセットされること
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual([]);
    expect(useAttendanceStore.getState().punchType).toBeNull();
  });
});
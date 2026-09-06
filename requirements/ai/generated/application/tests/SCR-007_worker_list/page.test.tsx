import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import WorkerListPage from '@/app/(contractor)/workers/page';
import { workerRepository } from '@/features/worker/repository/workerRepository';
import { initDB } from '@/lib/db/indexedDB';
import 'fake-indexeddb/auto';

// next/navigation のモック
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

// logger のモック
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SCR-007 Worker List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupSession = (userId = 'u1-uuid', role = 'CONTRACTOR_MANAGER', contractorId = 'C01') => {
    window.sessionStorage.setItem('user_id', userId);
    window.sessionStorage.setItem('role', role);
    window.sessionStorage.setItem('contractor_id', contractorId);
  };

  it('TST-007-007: Unauthenticated access redirects instantly to /login', async () => {
    // sessionStorage 空
    render(<WorkerListPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-007-001: Renders active workers belonging to logged-in contractor C01', async () => {
    setupSession('u1-uuid', 'CONTRACTOR_MANAGER', 'C01');

    const mockWorkers = [
      {
        worker_id: 'W01',
        contractor_id: 'C01',
        name: '山田 太郎',
        contact: '090-0000-0000',
        qualifications: ['溶接', 'クレーン'],
        trainings: [{ code: '安全衛生', taken_at: '2026-04-10' }],
        status: 'ACTIVE' as const,
        created_at: '2026-04-13T00:00:00Z',
        updated_at: '2026-04-13T00:00:00Z',
      },
      {
        worker_id: 'W02',
        contractor_id: 'C01',
        name: '鈴木 次郎',
        contact: '080-1111-1111',
        qualifications: [],
        trainings: [],
        status: 'ACTIVE' as const,
        created_at: '2026-04-13T00:00:00Z',
        updated_at: '2026-04-13T00:00:00Z',
      },
      {
        worker_id: 'W03',
        contractor_id: 'C02',
        name: '佐藤 三郎',
        contact: '070-2222-2222',
        qualifications: ['玉掛け'],
        trainings: [],
        status: 'ACTIVE' as const,
        created_at: '2026-04-13T00:00:00Z',
        updated_at: '2026-04-13T00:00:00Z',
      },
    ];

    // DB セットアップ
    const db = await initDB();
    const tx = db.transaction(['users', 'workers'], 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    for (const w of mockWorkers) {
      await tx.objectStore('workers').put(w);
    }
    await tx.done;

    // スパイ
    const getSpy = vi.spyOn(workerRepository, 'getWorkersByContractor');

    render(<WorkerListPage />);

    // ロード完了待機
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('C01');
    });

    // C01 の作業員のみ表示されていること
    expect(screen.getAllByText('山田 太郎')[0]).toBeInTheDocument();
    expect(screen.getAllByText('鈴木 次郎')[0]).toBeInTheDocument();
    expect(screen.queryByText('佐藤 三郎')).not.toBeInTheDocument();

    // 詳細チェック
    expect(screen.getAllByText('090-0000-0000')[0]).toBeInTheDocument();
    expect(screen.getAllByText('溶接')[0]).toBeInTheDocument();
    expect(screen.getAllByText('クレーン')[0]).toBeInTheDocument();
    expect(screen.getAllByText('安全衛生 (2026-04-10)')[0]).toBeInTheDocument();
  });

  it('TST-007-002: Click on 新規追加 navigates to SCR-008 new mode', async () => {
    setupSession('u1-uuid', 'CONTRACTOR_MANAGER', 'C01');
    
    // DB にユーザーを用意
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.done;

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText('新規追加')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新規追加'));
    expect(mockPush).toHaveBeenCalledWith('/contractor/workers/new');
  });

  it('TST-007-003: Click on 編集 navigates to SCR-008 edit mode pointing to W007', async () => {
    setupSession('u1-uuid', 'CONTRACTOR_MANAGER', 'C01');

    const db = await initDB();
    const tx = db.transaction(['users', 'workers'], 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.objectStore('workers').put({
      worker_id: 'W007',
      contractor_id: 'C01',
      name: 'ボンド 作業員',
      contact: '007',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.done;

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('ボンド 作業員')[0]).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/contractor/workers/W007');
  });

  it('TST-007-004: Click on 削除 with confirm true deletes worker', async () => {
    setupSession('u1-uuid', 'CONTRACTOR_MANAGER', 'C01');

    const db = await initDB();
    const tx = db.transaction(['users', 'workers'], 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.objectStore('workers').put({
      worker_id: 'W007',
      contractor_id: 'C01',
      name: 'ボンド 作業員',
      contact: '007',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.done;

    // confirmをtrueにモック
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteSpy = vi.spyOn(workerRepository, 'deleteWorker');

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('ボンド 作業員')[0]).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith('W007');

    await waitFor(() => {
      expect(screen.queryByText('ボンド 作業員')).not.toBeInTheDocument();
    });
  });

  it('TST-007-005: Click on 削除 with confirm false keeps worker', async () => {
    setupSession('u1-uuid', 'CONTRACTOR_MANAGER', 'C01');

    const db = await initDB();
    const tx = db.transaction(['users', 'workers'], 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.objectStore('workers').put({
      worker_id: 'W007',
      contractor_id: 'C01',
      name: 'ボンド 作業員',
      contact: '007',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.done;

    // confirmをfalseにモック
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const deleteSpy = vi.spyOn(workerRepository, 'deleteWorker');

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('ボンド 作業員')[0]).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();

    // 画面に残ったままになること
    expect(screen.getAllByText('ボンド 作業員')[0]).toBeInTheDocument();
  });

  it('TST-007-006: Click on 戻る navigates back to contractor home', async () => {
    setupSession('u1-uuid', 'CONTRACTOR_MANAGER', 'C01');

    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'C01',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.done;

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText('戻る')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('戻る'));
    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
  });
});
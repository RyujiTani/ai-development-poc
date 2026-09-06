import 'fake-indexeddb/auto';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkerAddEditPage from '@/app/(contractor)/workers/[id]/page';
import { workerRepository } from '@/features/worker/repository/workerRepository';
import { initDB } from '@/lib/db/indexedDB';

const { mockPush, mockParams } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockParams: { id: 'new' },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

vi.mock('@/features/worker/repository/workerRepository', () => ({
  workerRepository: {
    getWorkerById: vi.fn(),
    createWorker: vi.fn(),
    updateWorker: vi.fn(),
  },
}));

describe('SCR-008 Worker Add/Edit Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockParams.id = 'new';

    const store: Record<string, string> = {
      user_id: 'u1-uuid',
      role: 'CONTRACTOR_MANAGER',
      contractor_id: 'c1-uuid',
    };

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); }
      },
      writable: true,
      configurable: true,
    });

    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
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
    await tx.done;
  });

  it('TST-001 & ACP-001: should show error when name is empty and submit is clicked', async () => {
    render(<WorkerAddEditPage />);

    // ロード完了を待つ
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 連絡先だけ入力し、氏名を空にする
    fireEvent.change(screen.getByLabelText('連絡先 *'), { target: { value: '090-1234-5678' } });

    // 保存ボタンクリック
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByText('氏名を入力してください')).toBeInTheDocument();
    });

    expect(workerRepository.createWorker).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('TST-002 & ACP-002: should show error when contact is empty and submit is clicked', async () => {
    render(<WorkerAddEditPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 氏名だけ入力
    fireEvent.change(screen.getByLabelText('氏名 *'), { target: { value: 'テスト作業員' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByText('連絡先を入力してください')).toBeInTheDocument();
    });

    expect(workerRepository.createWorker).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('TST-003 & ACP-003: should redirect to login if session does not exist', async () => {
    // セッションをクリア
    window.sessionStorage.removeItem('user_id');
    window.sessionStorage.removeItem('role');

    render(<WorkerAddEditPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-004 & ACP-004: should submit new worker successfully and redirect', async () => {
    vi.mocked(workerRepository.createWorker).mockResolvedValue({ success: true, worker_id: 'new-worker-id' });

    render(<WorkerAddEditPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('氏名 *'), { target: { value: 'テスト作業員' } });
    fireEvent.change(screen.getByLabelText('連絡先 *'), { target: { value: '090-0000-0000' } });

    // 資格のチェックボックスをONに
    const checkbox = screen.getByLabelText('フォークリフト運転技能講習');
    fireEvent.click(checkbox);

    // 保存
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(workerRepository.createWorker).toHaveBeenCalledWith({
        contractor_id: 'c1-uuid',
        name: 'テスト作業員',
        contact: '090-0000-0000',
        qualifications: ['QUAL_A'],
        trainings: [],
        status: 'ACTIVE',
      });
      expect(mockPush).toHaveBeenCalledWith('/contractor/workers');
    });
  });

  it('TST-005 & ACP-005: should edit worker successfully and redirect', async () => {
    mockParams.id = 'worker-xyz-789';
    const mockWorker = {
      worker_id: 'worker-xyz-789',
      contractor_id: 'c1-uuid',
      name: '既存の作業員',
      contact: '090-1111-1111',
      qualifications: ['QUAL_A'],
      trainings: [],
      status: 'ACTIVE' as const,
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    };

    vi.mocked(workerRepository.getWorkerById).mockResolvedValue(mockWorker);
    vi.mocked(workerRepository.updateWorker).mockResolvedValue({ success: true });

    render(<WorkerAddEditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('既存の作業員')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('氏名 *'), { target: { value: '更新テスト作業員' } });
    fireEvent.change(screen.getByLabelText('連絡先 *'), { target: { value: '090-2222-2222' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(workerRepository.updateWorker).toHaveBeenCalledWith('worker-xyz-789', {
        name: '更新テスト作業員',
        contact: '090-2222-2222',
        qualifications: ['QUAL_A'],
        trainings: [],
        status: 'ACTIVE',
      });
      expect(mockPush).toHaveBeenCalledWith('/contractor/workers');
    });
  });

  it('TST-006 & ACP-006: should discard changes and go back on cancel', async () => {
    render(<WorkerAddEditPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'キャンセル' })[0]);

    expect(workerRepository.createWorker).not.toHaveBeenCalled();
    expect(workerRepository.updateWorker).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/contractor/workers');
  });

  it('TST-007 & ACP-007: should load and display worker info correctly in edit mode', async () => {
    mockParams.id = 'worker-xyz-789';
    const mockWorker = {
      worker_id: 'worker-xyz-789',
      contractor_id: 'c1-uuid',
      name: '太郎',
      contact: '080-9999-9999',
      qualifications: ['QUAL_B'],
      trainings: [{ code: 'TRAIN_01', taken_at: '2026-04-01' }],
      status: 'ACTIVE' as const,
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    };

    vi.mocked(workerRepository.getWorkerById).mockResolvedValue(mockWorker);

    render(<WorkerAddEditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('太郎')).toBeInTheDocument();
      expect(screen.getByDisplayValue('080-9999-9999')).toBeInTheDocument();
      const checkbox = screen.getByLabelText('玉掛け技能講習') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });
});
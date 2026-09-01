import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkerForm from '@/features/worker/ui/WorkerForm';
import { setSession, clearSession } from '@/lib/auth/session';
import React from 'react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/features/worker/repository/workerRepository', () => {
  return {
    WorkerRepository: vi.fn().mockImplementation(() => ({
      getById: mockGetById,
      create: mockCreate,
      update: mockUpdate
    }))
  };
});

describe('WorkerForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
    setSession({
      user_id: 'user-abc',
      contractor_id: 'contractor-xyz',
      role: 'CONTRACTOR_MANAGER',
      display_name: 'テスト管理者'
    });
  });

  it('未ログイン状態の時はログイン画面へリダイレクトされること', async () => {
    clearSession();
    render(<WorkerForm />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('新規登録モードで正しくフォームが表示されること', async () => {
    render(<WorkerForm />);
    expect(await screen.findByText('新規作業員登録')).toBeInTheDocument();
    expect(screen.getByLabelText(/氏名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/連絡先/)).toBeInTheDocument();
  });

  it('必須入力バリデーションが機能すること', async () => {
    render(<WorkerForm />);
    const submitButton = await screen.findByRole('button', { name: '作業員を保存' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('氏名を入力してください。')).toBeInTheDocument();
    expect(await screen.findByText('連絡先を入力してください。')).toBeInTheDocument();
  });

  it('新規作業員が正しく保存され、一覧へ遷移すること', async () => {
    mockCreate.mockResolvedValueOnce({
      worker_id: 'new-worker-id',
      name: '山田 太郎',
      contact: '090-0000-0000',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE'
    });

    render(<WorkerForm />);
    
    const nameInput = await screen.findByPlaceholderText('例：テスト 太郎');
    const contactInput = screen.getByPlaceholderText('例：090-1234-5678');
    
    fireEvent.change(nameInput, { target: { value: '山田 太郎' } });
    fireEvent.change(contactInput, { target: { value: '090-0000-0000' } });

    const submitButton = screen.getByRole('button', { name: '作業員を保存' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        contractor_id: 'contractor-xyz',
        name: '山田 太郎',
        contact: '090-0000-0000',
        qualifications: [],
        trainings: [],
        status: 'ACTIVE'
      });
      expect(mockPush).toHaveBeenCalledWith('/workers');
    });
  });

  it('編集モードで既存データをロードして更新できること', async () => {
    mockGetById.mockResolvedValueOnce({
      worker_id: 'worker-123',
      contractor_id: 'contractor-xyz',
      name: '既存 太郎',
      contact: '090-1111-2222',
      qualifications: ['QUAL_001'],
      trainings: [{ code: 'TRAIN_001', taken_at: '2025-04-01' }],
      status: 'ACTIVE'
    });

    mockUpdate.mockResolvedValueOnce({
      worker_id: 'worker-123'
    });

    render(<WorkerForm workerId="worker-123" />);

    expect(await screen.findByText('作業員情報編集')).toBeInTheDocument();
    
    const nameInput = screen.getByPlaceholderText('例：テスト 太郎');
    expect(nameInput).toHaveValue('既存 太郎');

    fireEvent.change(nameInput, { target: { value: '既存 太郎(更新)' } });

    const submitButton = screen.getByRole('button', { name: '変更を保存' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('worker-123', 'contractor-xyz', {
        name: '既存 太郎(更新)',
        contact: '090-1111-2222',
        qualifications: ['QUAL_001'],
        trainings: [{ code: 'TRAIN_001', taken_at: '2025-04-01' }],
        status: 'ACTIVE'
      });
      expect(mockPush).toHaveBeenCalledWith('/workers');
    });
  });

  it('キャンセルボタンをクリックしたとき、ダイアログなしで一覧に遷移すること', async () => {
    render(<WorkerForm />);
    const cancelButton = await screen.findByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);
    expect(mockPush).toHaveBeenCalledWith('/workers');
  });
});
"
    }
  ]
}
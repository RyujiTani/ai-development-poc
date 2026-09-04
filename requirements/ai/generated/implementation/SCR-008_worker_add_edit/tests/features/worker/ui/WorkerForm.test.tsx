import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkerForm from '@/features/worker/ui/WorkerForm';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { workerUseCase } from '@/features/worker/usecase/workerUsecase';

// next/navigation のモックを hoisted を使用して安定化する
const { mockPush, mockRouter, mockParams } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn()
    },
    mockParams: { worker_id: 'worker-123' }
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams
}));

describe('WorkerForm Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockSession = {
      userId: 'user-manager',
      contractorId: 'contractor-abc',
      role: 'CONTRACTOR_MANAGER' as const,
      displayName: '佐藤 所長'
    };

    // 初期化処理でセッションがクリアされるのを防ぐため、sessionStorageをモック
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('session', JSON.stringify(mockSession));
    }

    // 既定の認証セッションモックを設定
    useSessionStore.setState({
      session: mockSession,
      isLoading: false
    });
  });

  it('正常に画面がマウントされ、初期項目が表示されること', () => {
    render(<WorkerForm mode="CREATE" />);
    expect(screen.getByLabelText(/氏名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/連絡先/)).toBeInTheDocument();
    expect(screen.getByText('保存')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
  });

  it('必須項目未入力時に適切なバリデーションエラーが発生すること', async () => {
    render(<WorkerForm mode="CREATE" />);
    const submitBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('氏名は必須です。')).toBeInTheDocument();
    expect(await screen.findByText('連絡先は必須です。')).toBeInTheDocument();
  });

  it('無効な連絡先形式のときにバリデーションエラーを検知すること', async () => {
    render(<WorkerForm mode="CREATE" />);
    const contactInput = screen.getByLabelText(/連絡先/);
    fireEvent.change(contactInput, { target: { value: 'invalid-phone-num' } });

    const submitBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('有効な形式で入力してください（数字とハイフン10〜13桁。例: 090-1234-5678）')).toBeInTheDocument();
  });

  it('資格情報を複数選択した際に値が保持されること', async () => {
    render(<WorkerForm mode="CREATE" />);
    const qualCheckbox = screen.getByLabelText('玉掛け技能講習');
    fireEvent.click(qualCheckbox);
    expect(qualCheckbox).toBeChecked();
  });

  it('講習受講履歴の追加および削除がダイナミックに行えること', async () => {
    render(<WorkerForm mode="CREATE" />);
    const addHistoryBtn = screen.getByRole('button', { name: '＋ 受講履歴を追加' });
    fireEvent.click(addHistoryBtn);

    // 追加された入力枠の検知
    expect(screen.getByLabelText('講習種別')).toBeInTheDocument();
    expect(screen.getByLabelText('受講日')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteBtn);

    // 削除されたことを確認
    expect(screen.queryByLabelText('講習種別')).not.toBeInTheDocument();
  });

  it('編集モード時に既存の作業員データが初期ロードされること', async () => {
    const mockWorker = {
      worker_id: 'worker-123',
      contractor_id: 'contractor-abc',
      name: '佐藤 三郎',
      contact: '080-9999-8888',
      qualifications: ['QUAL_002'],
      trainings: [{ code: 'TR_001', taken_at: '2026-04-10' }],
      status: 'ACTIVE' as const,
      created_at: '2026-04-10T00:00:00Z',
      updated_at: '2026-04-10T00:00:00Z'
    };

    const getSpy = vi.spyOn(workerUseCase, 'getWorker').mockResolvedValue({
      success: true,
      data: mockWorker
    });

    render(<WorkerForm mode="EDIT" workerId="worker-123" />);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('worker-123');
      expect(screen.getByDisplayValue('佐藤 三郎')).toBeInTheDocument();
      expect(screen.getByDisplayValue('080-9999-8888')).toBeInTheDocument();
    });
  });

  it('未認証のユーザーがアクセスした場合にログインへリダイレクトされること', async () => {
    // セッションを空にする
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('session');
    }
    useSessionStore.setState({ session: null, isLoading: false });

    render(<WorkerForm mode="CREATE" />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('キャンセルボタンがクリックされた場合、前画面に戻ること', async () => {
    render(<WorkerForm mode="CREATE" />);
    const cancelBtn = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelBtn);

    expect(mockPush).toHaveBeenCalledWith('/workers');
  });
});
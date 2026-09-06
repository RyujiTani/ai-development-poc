import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import ContractorsPage from '@/app/(factory)/contractors/page';
import { attendanceRepository } from '@/features/attendance/repository/attendanceRepository';

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
};
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockContractors = [
  {
    contractor_id: 'c1-uuid',
    name: '第一建設',
    status: 'ACTIVE' as const,
    created_at: '2026-04-13T00:00:00Z',
    updated_at: '2026-04-13T00:00:00Z',
  },
  {
    contractor_id: 'c2-uuid',
    name: '第二電気',
    status: 'ACTIVE' as const,
    created_at: '2026-04-13T10:00:00Z',
    updated_at: '2026-04-13T10:00:00Z',
  },
];

describe('SCR-014 外注先企業登録画面テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    // SessionStorageモック化
    const store: Record<string, string> = {
      user_id: 'u2-uuid',
      role: 'FACTORY_ADMIN',
    };
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    });

    // RepositoryメソッドのSpy/Mock定義
    vi.spyOn(attendanceRepository, 'getAllContractors').mockResolvedValue(mockContractors);
    vi.spyOn(attendanceRepository, 'createContractor').mockImplementation(async (name) => ({
      contractor_id: 'new-uuid',
      name,
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    vi.spyOn(attendanceRepository, 'updateContractor').mockImplementation(async (id, name, status) => ({
      contractor_id: id,
      name,
      status,
      created_at: '2026-04-13T00:00:00Z',
      updated_at: new Date().toISOString(),
    }));
    vi.spyOn(attendanceRepository, 'deleteContractor').mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('test-scr-014-vl-003-unauthorized: 未ログイン状態でのアクセス時に /admin-login へリダイレクトされること', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
    });

    render(<ContractorsPage />);

    expect(mockPush).toHaveBeenCalledWith('/admin-login');
  });

  it('test-scr-014-fn-001: 工場側管理者としてログイン時、登録済みの企業データが一覧に正しく表示されること', async () => {
    render(<ContractorsPage />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('第一建設')[0]).toBeInTheDocument();
      expect(screen.getAllByText('第二電気')[0]).toBeInTheDocument();
    });

    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
  });

  it('test-scr-014-ui: テーブルヘッダーに必要な項目(企業ID, 企業名, ステータス, 登録日時)が揃っていること', async () => {
    render(<ContractorsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('第一建設')[0]).toBeInTheDocument();
    });

    expect(screen.getByText('企業ID')).toBeInTheDocument();
    expect(screen.getByText('企業名')).toBeInTheDocument();
    expect(screen.getByText('ステータス')).toBeInTheDocument();
    expect(screen.getByText('登録日時')).toBeInTheDocument();
  });

  it('test-scr-014-fn-002: 新規登録モーダルから企業名「新規テスト企業X」を新規登録できること', async () => {
    render(<ContractorsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('第一建設')[0]).toBeInTheDocument();
    });

    const addBtn = screen.getByTestId('add-contractor-btn');
    fireEvent.click(addBtn);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('外注先企業の新規登録');

    const input = screen.getByTestId('contractor-name-input');
    fireEvent.change(input, { target: { value: '新規テスト企業X' } });

    const saveBtn = screen.getByTestId('modal-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(attendanceRepository.createContractor).toHaveBeenCalledWith('新規テスト企業X');
      expect(screen.getByTestId('toast-notification')).toHaveTextContent('登録が完了しました');
    });
  });

  it('test-scr-014-vl-001: 企業名を空（またはスペースのみ）にした状態で保存した際、保存が実行されず「企業名は必須入力です」とエラーが表示されること', async () => {
    render(<ContractorsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('第一建設')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-contractor-btn'));

    const input = screen.getByTestId('contractor-name-input');
    fireEvent.change(input, { target: { value: '   ' } });

    fireEvent.click(screen.getByTestId('modal-save-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('name-error-message')).toHaveTextContent('企業名は必須入力です');
    });

    expect(attendanceRepository.createContractor).not.toHaveBeenCalled();
  });

  it('test-scr-014-fn-003: 既存外注先企業の編集ボタン押下時に現在値がプリセットされ、変更を保存できること', async () => {
    render(<ContractorsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('第一建設')[0]).toBeInTheDocument();
    });

    const editBtn = screen.getByTestId('edit-btn-c1-uuid');
    fireEvent.click(editBtn);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('外注先企業情報の編集');
    const input = screen.getByTestId('contractor-name-input');
    expect(input).toHaveValue('第一建設');

    fireEvent.change(input, { target: { value: '第一建設（改）' } });
    fireEvent.click(screen.getByTestId('modal-save-btn'));

    await waitFor(() => {
      expect(attendanceRepository.updateContractor).toHaveBeenCalledWith('c1-uuid', '第一建設（改）', 'ACTIVE');
      expect(screen.getByTestId('toast-notification')).toHaveTextContent('更新が完了しました');
    });
  });

  it('test-scr-014-fn-004 & test-scr-014-vl-002: 削除時の確認ダイアログのキャンセルで処理中断、OKで正常に削除完了し一覧から消失すること', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    // 1. キャンセル操作時
    confirmSpy.mockReturnValueOnce(false);

    render(<ContractorsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('第一建設')[0]).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('delete-btn-c1-uuid');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(attendanceRepository.deleteContractor).not.toHaveBeenCalled();

    // 2. OK操作時
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(attendanceRepository.deleteContractor).toHaveBeenCalledWith('c1-uuid');
      expect(screen.getByTestId('toast-notification')).toHaveTextContent('削除が完了しました');
    });
  });
});
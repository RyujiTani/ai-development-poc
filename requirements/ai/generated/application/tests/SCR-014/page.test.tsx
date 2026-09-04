import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractorRegisterPage from '../../app/(factory)/contractors/page';
import { ToastProvider } from '../../components/ui/toast';

const {
  mockReplace,
  mockPush,
  mockRouter,
  mockExecuteSaveContractor,
  mockExecuteDeleteContractor,
  mockFindAllContractors,
} = vi.hoisted(() => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();
  const mockExecuteSaveContractor = vi.fn();
  const mockExecuteDeleteContractor = vi.fn();
  const mockFindAllContractors = vi.fn();
  return {
    mockReplace,
    mockPush,
    mockRouter: {
      replace: mockReplace,
      push: mockPush,
    },
    mockExecuteSaveContractor,
    mockExecuteDeleteContractor,
    mockFindAllContractors,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// UseCase のモック
vi.mock('../../features/contractor/usecase/saveContractorUseCase', () => {
  return {
    SaveContractorUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteSaveContractor,
      };
    }),
  };
});

vi.mock('../../features/contractor/usecase/deleteContractorUseCase', () => {
  return {
    DeleteContractorUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteDeleteContractor,
      };
    }),
  };
});

// Repository のモック
vi.mock('../../features/contractor/repository/contractorRepository', () => {
  return {
    IndexedDBContractorRepository: vi.fn().mockImplementation(() => {
      return {
        findAll: mockFindAllContractors,
      };
    }),
  };
});

describe('SCR-014: 外注先企業登録画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <ContractorRegisterPage />
      </ToastProvider>
    );
  };

  it('SCR-014-UT-001: 登録済みの企業一覧が正しくテーブルにレンダリングされていること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    const mockContractors = [
      {
        contractor_id: 'c111',
        name: '株式会社テスト企業A',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00.000Z',
        updated_at: '2026-04-13T00:00:00.000Z',
      },
      {
        contractor_id: 'c222',
        name: '有限会社テスト企業B',
        status: 'INACTIVE',
        created_at: '2026-04-13T01:00:00.000Z',
        updated_at: '2026-04-13T01:00:00.000Z',
      },
    ];

    mockFindAllContractors.mockResolvedValue(mockContractors);

    renderComponent();

    // 読み込み完了を待つ
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('株式会社テスト企業A')).toBeInTheDocument();
    expect(screen.getByText('有限会社テスト企業B')).toBeInTheDocument();
    expect(screen.getByText('活性')).toBeInTheDocument();
    expect(screen.getByText('非活性')).toBeInTheDocument();
  });

  it('SCR-014-UT-002: 新規登録ボタンのクリックイベントから保存までのフローが正常に動作すること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockFindAllContractors.mockResolvedValue([]);
    mockExecuteSaveContractor.mockResolvedValue({
      success: true,
      value: {
        contractor_id: 'c333',
        name: '新規企業X',
        status: 'ACTIVE',
        created_at: '2026-04-13T02:00:00.000Z',
        updated_at: '2026-04-13T02:00:00.000Z',
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /新規登録/ });
    fireEvent.click(newBtn);

    // 新規登録ダイアログが表示されることを確認
    expect(screen.getByText('外注先企業の新規登録')).toBeInTheDocument();

    const nameInput = screen.getByLabelText('企業名');
    fireEvent.change(nameInput, { target: { value: '新規企業X' } });

    const saveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockExecuteSaveContractor).toHaveBeenCalledWith({
        contractorId: undefined,
        name: '新規企業X',
        status: 'ACTIVE',
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('外注先企業の新規登録')).not.toBeInTheDocument();
    });
  });

  it('SCR-014-UT-003: 企業名が空欄のまま保存しようとした際、バリデーションエラーが発生すること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockFindAllContractors.mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /新規登録/ });
    fireEvent.click(newBtn);

    const saveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('企業名は必須入力です。')).toBeInTheDocument();
    });

    expect(mockExecuteSaveContractor).not.toHaveBeenCalled();
  });

  it('SCR-014-UT-004: 削除ボタン押下で確認ダイアログが表示され、削除処理を実行・キャンセルできること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    const mockContractors = [
      {
        contractor_id: 'c111',
        name: '株式会社テスト企業A',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00.000Z',
        updated_at: '2026-04-13T00:00:00.000Z',
      },
    ];

    mockFindAllContractors.mockResolvedValue(mockContractors);
    mockExecuteDeleteContractor.mockResolvedValue({ success: true });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 削除確認ダイアログは初期状態では非表示
    expect(screen.queryByText('外注先企業の削除確認')).not.toBeInTheDocument();

    const deleteBtn = screen.getAllByRole('button', { name: '削除' })[0];
    fireEvent.click(deleteBtn);

    // ダイアログ表示の確認
    expect(screen.getByText('外注先企業の削除確認')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelBtn);

    // 閉じることの確認
    await waitFor(() => {
      expect(screen.queryByText('外注先企業の削除確認')).not.toBeInTheDocument();
    });

    expect(mockExecuteDeleteContractor).not.toHaveBeenCalled();

    // もう一度削除を押して決定
    fireEvent.click(deleteBtn);
    const confirmBtn = screen.getByRole('button', { name: '削除する' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockExecuteDeleteContractor).toHaveBeenCalledWith('c111');
    });
  });

  it('SCR-014-UT-005: 工場側管理者以外のセッション情報、または未ログインの場合にログイン画面へリダイレクトされること', async () => {
    sessionStorage.clear(); // 未ログイン

    renderComponent();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    });
  });
});
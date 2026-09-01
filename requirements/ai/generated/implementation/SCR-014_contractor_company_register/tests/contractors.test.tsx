import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ContractorsPage from '../app/(factory)/contractors/page';
import { IndexedDBContractorRepository } from '../features/contractor/repository/contractorRepository';

// Mock router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

// Mock Repository
vi.mock('../features/contractor/repository/contractorRepository', () => {
  const mockFindAll = vi.fn().mockResolvedValue([
    {
      contractor_id: '1',
      name: 'Company X',
      status: 'ACTIVE',
      created_at: '2026-04-10T08:00:00+09:00',
      updated_at: '2026-04-10T08:00:00+09:00',
    },
    {
      contractor_id: '2',
      name: 'Company Y',
      status: 'INACTIVE',
      created_at: '2026-04-11T09:00:00+09:00',
      updated_at: '2026-04-11T09:00:00+09:00',
    },
  ]);
  const mockSave = vi.fn().mockResolvedValue(undefined);
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockResolvedValue(undefined);

  return {
    IndexedDBContractorRepository: vi.fn().mockImplementation(() => ({
      findAll: mockFindAll,
      save: mockSave,
      update: mockUpdate,
      delete: mockDelete,
    })),
  };
});

describe('SCR-014 外注先企業登録画面 テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup standard mock sessionStorage
    const store: Record<string, string> = {
      user_id: 'test-user-id',
      role: 'FACTORY_ADMIN',
    };
    global.sessionStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {},
      length: 0,
      key: () => null,
    };
  });

  // TS-SCR-014-001
  test('正常系：認証が通っている状態で初期ロードと一覧表示が行われること', async () => {
    render(<ContractorsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Company X')).toBeInTheDocument();
      expect(screen.getByText('Company Y')).toBeInTheDocument();
    });
  });

  // TS-SCR-014-002
  test('バリデーション：空欄保存でエラーメッセージが表示されること、かつ正しく入力して保存できること', async () => {
    render(<ContractorsPage />);

    // Wait until screen is loaded
    await waitFor(() => {
      expect(screen.getByText('Company X')).toBeInTheDocument();
    });

    const createBtn = screen.getByText('新規登録');
    fireEvent.click(createBtn);

    const saveBtn = screen.getByText('保存');
    fireEvent.click(saveBtn);

    // Should display validation error
    expect(screen.getByText('企業名を入力してください')).toBeInTheDocument();

    // Input valid contractor name
    const nameInput = screen.getByPlaceholderText('例: 株式会社テスト興業');
    fireEvent.change(nameInput, { target: { value: 'Company New' } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      const repo = new IndexedDBContractorRepository();
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // TS-SCR-014-003
  test('削除フロー：削除ボタン押下で削除確認モーダルが開き、実行すると削除が機能すること', async () => {
    render(<ContractorsPage />);

    await waitFor(() => {
      expect(screen.getByText('Company X')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]); // delete first record

    expect(screen.getByText('外注先企業の削除')).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByText('削除する');
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      const repo = new IndexedDBContractorRepository();
      expect(repo.delete).toHaveBeenCalledWith('1');
    });
  });

  // TS-SCR-014-004
  test('認可エラー：FACTORY_ADMIN以外のロールはログイン画面へリダイレクトされること', async () => {
    global.sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    render(<ContractorsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});

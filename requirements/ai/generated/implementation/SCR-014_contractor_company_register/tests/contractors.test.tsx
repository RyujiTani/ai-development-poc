import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractorsPage from '../app/(factory)/contractors/page';
import { getSession } from '../lib/auth/auth';

const {
  mockPush,
  mockRouter,
  mockGetContractors,
  mockCreateContractor,
  mockUpdateContractor,
  mockDeleteContractor,
} = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockGetContractors: vi.fn(),
    mockCreateContractor: vi.fn(),
    mockUpdateContractor: vi.fn(),
    mockDeleteContractor: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('../lib/auth/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('../features/contractor/usecase/contractorUseCase', () => {
  return {
    ContractorUseCase: vi.fn().mockImplementation(() => ({
      getContractors: mockGetContractors,
      createContractor: mockCreateContractor,
      updateContractor: mockUpdateContractor,
      deleteContractor: mockDeleteContractor,
    })),
  };
});

vi.mock('../lib/db/idb', () => ({
  seedInitialData: vi.fn().mockResolvedValue(undefined),
  getIndexedDB: vi.fn(),
}));

describe('SCR-014 外注先企業登録画面 テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TST-014-005 未認証時にログイン画面へリダイレクトされること', async () => {
    vi.mocked(getSession).mockReturnValue(null);

    render(<ContractorsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-014-001 正常に登録済みの外注先企業一覧を取得して表示できること', async () => {
    vi.mocked(getSession).mockReturnValue({
      userId: 'admin-1',
      role: 'FACTORY_ADMIN',
      displayName: '工場管理者',
    });

    mockGetContractors.mockResolvedValue({
      success: true,
      value: [
        {
          contractor_id: '1',
          name: 'A建設',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          contractor_id: '2',
          name: 'B電設',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });

    render(<ContractorsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('A建設')[0]).toBeInTheDocument();
      expect(screen.getAllByText('B電設')[0]).toBeInTheDocument();
    });
  });

  it('TST-014-002 新規登録でバリデーションが働き、正常入力時に登録成功すること', async () => {
    vi.mocked(getSession).mockReturnValue({
      userId: 'admin-1',
      role: 'FACTORY_ADMIN',
      displayName: '工場管理者',
    });

    mockGetContractors.mockResolvedValue({
      success: true,
      value: [],
    });

    render(<ContractorsPage />);

    await screen.findByText('外注先企業登録管理');

    const createBtn = screen.getByRole('button', { name: '新規企業登録' });
    fireEvent.click(createBtn);

    expect(screen.getByText('外注先企業の新規登録')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: '保存する' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('企業名は必須入力です')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('例: 株式会社サンプル建設');
    fireEvent.change(nameInput, { target: { value: '新規外注会社' } });

    mockCreateContractor.mockResolvedValue({
      success: true,
      value: {
        contractor_id: '3',
        name: '新規外注会社',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreateContractor).toHaveBeenCalledWith('新規外注会社');
      expect(screen.queryByText('外注先企業の新規登録')).not.toBeInTheDocument();
    });
  });

  it('TST-014-003 既存の企業情報を編集・更新できること', async () => {
    vi.mocked(getSession).mockReturnValue({
      userId: 'admin-1',
      role: 'FACTORY_ADMIN',
      displayName: '工場管理者',
    });

    const mockItem = {
      contractor_id: '1',
      name: 'A建設',
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockGetContractors.mockResolvedValue({
      success: true,
      value: [mockItem],
    });

    render(<ContractorsPage />);

    await screen.findAllByText('A建設');

    const editBtn = screen.getAllByRole('button', { name: '編集' })[0];
    fireEvent.click(editBtn);

    expect(screen.getByText('外注先企業情報の編集')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('例: 株式会社サンプル建設');
    expect(nameInput).toHaveValue('A建設');
    fireEvent.change(nameInput, { target: { value: 'A建設・改' } });

    mockUpdateContractor.mockResolvedValue({
      success: true,
      value: {
        ...mockItem,
        name: 'A建設・改',
      },
    });

    const saveBtn = screen.getByRole('button', { name: '保存する' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateContractor).toHaveBeenCalledWith('1', 'A建設・改', 'ACTIVE');
    });
  });

  it('TST-014-004 外注先企業を削除できること', async () => {
    vi.mocked(getSession).mockReturnValue({
      userId: 'admin-1',
      role: 'FACTORY_ADMIN',
      displayName: '工場管理者',
    });

    const mockItem = {
      contractor_id: '1',
      name: 'A建設',
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockGetContractors.mockResolvedValue({
      success: true,
      value: [mockItem],
    });

    render(<ContractorsPage />);

    await screen.findAllByText('A建設');

    const deleteBtn = screen.getAllByRole('button', { name: '削除' })[0];
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('本当に「A建設」を削除しますか？'));

    mockDeleteContractor.mockResolvedValue({
      success: true,
    });

    await waitFor(() => {
      expect(mockDeleteContractor).toHaveBeenCalledWith('1');
    });
  });
});
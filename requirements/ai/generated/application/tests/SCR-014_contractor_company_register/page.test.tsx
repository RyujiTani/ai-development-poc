import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ContractorRegisterPage from '@/app/(factory)/contractors/page';
import { GetContractorsUseCase } from '@/features/contractor/usecase/getContractorsUseCase';
import { CreateContractorUseCase } from '@/features/contractor/usecase/createContractorUseCase';
import { UpdateContractorUseCase } from '@/features/contractor/usecase/updateContractorUseCase';
import { DeleteContractorUseCase } from '@/features/contractor/usecase/deleteContractorUseCase';

// Next.js Navigation Mock
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

const mocks = vi.hoisted(() => {
  const contractors = [
    {
      contractor_id: 'con-111',
      name: '既存企業A',
      status: 'ACTIVE' as const,
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00',
    },
    {
      contractor_id: 'con-222',
      name: '既存企業B',
      status: 'ACTIVE' as const,
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00',
    },
    {
      contractor_id: 'con-333',
      name: '無効企業C',
      status: 'INACTIVE' as const,
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00',
    },
  ];

  return {
    mockContractors: contractors,
    mockGetContractorsExecute: vi.fn().mockResolvedValue({ success: true, value: contractors }),
    mockCreateContractorExecute: vi.fn().mockImplementation(({ name, status }) => {
      if (!name || !name.trim()) {
        return Promise.resolve({
          success: false,
          error: { message: '企業名は必須入力です。' },
        });
      }
      return Promise.resolve({
        success: true,
        value: {
          contractor_id: 'con-new',
          name,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }),
    mockUpdateContractorExecute: vi.fn().mockImplementation(({ contractorId, name, status }) => {
      if (!name || !name.trim()) {
        return Promise.resolve({
          success: false,
          error: { message: '企業名は必須入力です。' },
        });
      }
      return Promise.resolve({
        success: true,
        value: {
          contractor_id: contractorId,
          name,
          status,
          created_at: '2026-04-13T00:00:00+09:00',
          updated_at: new Date().toISOString(),
        },
      });
    }),
    mockDeleteContractorExecute: vi.fn().mockResolvedValue({ success: true, value: undefined }),
  };
});

vi.mock('@/features/contractor/usecase/getContractorsUseCase', () => {
  return {
    GetContractorsUseCase: vi.fn().mockImplementation(() => ({
      execute: mocks.mockGetContractorsExecute,
    })),
  };
});

vi.mock('@/features/contractor/usecase/createContractorUseCase', () => {
  return {
    CreateContractorUseCase: vi.fn().mockImplementation(() => ({
      execute: mocks.mockCreateContractorExecute,
    })),
  };
});

vi.mock('@/features/contractor/usecase/updateContractorUseCase', () => {
  return {
    UpdateContractorUseCase: vi.fn().mockImplementation(() => ({
      execute: mocks.mockUpdateContractorExecute,
    })),
  };
});

vi.mock('@/features/contractor/usecase/deleteContractorUseCase', () => {
  return {
    DeleteContractorUseCase: vi.fn().mockImplementation(() => ({
      execute: mocks.mockDeleteContractorExecute,
    })),
  };
});

describe('外注先企業登録画面 (SCR-014)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate FACTORY_ADMIN logged in
    sessionStorage.setItem('user_id', 'admin-user');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    
    // 毎回デフォルトに戻す
    mocks.mockGetContractorsExecute.mockResolvedValue({ success: true, value: mocks.mockContractors });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('TS-014-001: 企業名空文字で保存時、バリデーションエラーが表示されAPI保存要求が発生しないこと', async () => {
    render(<ContractorRegisterPage />);

    // Wait for load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    // Open register modal
    const registerBtn = screen.getByTestId('contractor-register-btn');
    fireEvent.click(registerBtn);

    // Enter empty name and submit
    const nameInput = screen.getByTestId('contractor-name-input');
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitBtn = screen.getByTestId('form-submit-btn');
    fireEvent.click(submitBtn);

    // Error message displayed
    await waitFor(() => {
      expect(screen.getByTestId('contractor-name-error')).toHaveTextContent('企業名は必須入力です。');
    });

    // Ensure createUseCase execution is not triggered for invalid empty name
    expect(mocks.mockCreateContractorExecute).not.toHaveBeenCalled();
  });

  it('TS-014-002: 非管理者ロールや未認証でのアクセス時にリダイレクトが呼ばれること', async () => {
    // Override role to be contractor manager
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<ContractorRegisterPage />);

    // Redirect to login screen expected
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-014-003: シードデータが正しくテーブルに描画されること', async () => {
    render(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(screen.getByText('既存企業A')).toBeInTheDocument();
    expect(screen.getByText('既存企業B')).toBeInTheDocument();
    expect(screen.getByText('無効企業C')).toBeInTheDocument();
  });

  it('TS-014-004: 新規登録が成功してモーダルが閉じ、一覧に反映されること', async () => {
    const { rerender } = render(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    // Open Modal
    const registerBtn = screen.getByTestId('contractor-register-btn');
    fireEvent.click(registerBtn);

    // Enter Name and submit
    const nameInput = screen.getByTestId('contractor-name-input');
    fireEvent.change(nameInput, { target: { value: '新規テスト協力企業X' } });

    const submitBtn = screen.getByTestId('form-submit-btn');
    fireEvent.click(submitBtn);

    // Simulate after creation, fetch contractors returns the newly added contractor
    const updatedContractors = [
      ...mocks.mockContractors,
      {
        contractor_id: 'con-new',
        name: '新規テスト協力企業X',
        status: 'ACTIVE' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    mocks.mockGetContractorsExecute.mockResolvedValueOnce({ success: true, value: updatedContractors });

    // Expect modal closes and reload happens
    await waitFor(() => {
      expect(screen.queryByTestId('form-modal')).toBeNull();
    });

    rerender(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.getByText('新規テスト協力企業X')).toBeInTheDocument();
    });
  });

  it('TS-014-005: 編集ボタンで既存企業データが初期値としてフォームにロードされること', async () => {
    render(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    // Click edit button for first record (con-111, 既存企業A)
    const editBtn = screen.getByTestId('edit-btn-con-111');
    fireEvent.click(editBtn);

    // Check pre-loaded values in form modal
    expect(screen.getByTestId('form-modal')).toBeInTheDocument();
    const nameInput = screen.getByTestId('contractor-name-input') as HTMLInputElement;
    expect(nameInput.value).toBe('既存企業A');
  });

  it('TS-014-006: 削除ボタンクリックとconfirmのOK応答で削除が呼び出され、一覧に反映されること', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { rerender } = render(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    // Delete "既存企業B" (con-222)
    const deleteBtn = screen.getByTestId('delete-btn-con-222');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith('本当に削除しますか？');

    // Simulate list after deleting con-222
    const remainingContractors = mocks.mockContractors.filter(c => c.contractor_id !== 'con-222');
    mocks.mockGetContractorsExecute.mockResolvedValueOnce({ success: true, value: remainingContractors });

    // Ensure delete use case execute was called
    await waitFor(() => {
      expect(mocks.mockDeleteContractorExecute).toHaveBeenCalledWith('con-222');
    });

    rerender(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('既存企業B')).toBeNull();
    });

    confirmSpy.mockRestore();
  });
});
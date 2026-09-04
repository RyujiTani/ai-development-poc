import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkerAddPage from '../../app/(contractor)/contractor/workers/add/page';
import WorkerEditPage from '../../app/(contractor)/contractor/workers/edit/page';
import { ToastProvider } from '../../components/ui/toast';

const { mockPush, mockGet, mockRouter, mockSearchParams } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockGet = vi.fn();
  return {
    mockPush,
    mockGet,
    mockRouter: {
      push: mockPush,
    },
    mockSearchParams: {
      get: mockGet,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

const mockExecuteSaveWorker = vi.fn();
vi.mock('../../features/worker/usecase/saveWorkerUseCase', () => {
  return {
    SaveWorkerUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteSaveWorker,
      };
    }),
  };
});

const mockExecuteGetWorkerById = vi.fn();
vi.mock('../../features/worker/usecase/getWorkerByIdUseCase', () => {
  return {
    GetWorkerByIdUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteGetWorkerById,
      };
    }),
  };
});

describe('SCR-008: 作業員追加・編集画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('新規追加モード (WorkerAddPage)', () => {
    const renderAddPage = () => {
      return render(
        <ToastProvider>
          <WorkerAddPage />
        </ToastProvider>
      );
    };

    it('TS-SCR-008-006: 未ログイン状態でアクセスした際、/login にリダイレクトされること', async () => {
      renderAddPage();
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('TS-SCR-008-001: 氏名未入力の際、バリデーションエラーが表示されること', async () => {
      sessionStorage.setItem('user_id', 'u1111111');
      sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
      sessionStorage.setItem('display_name', '大島 茂');

      renderAddPage();

      await screen.findByRole('heading', { name: '作業員新規追加' });

      const saveButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('氏名は必須入力です。')).toBeInTheDocument();
      });
    });

    it('TS-SCR-008-002: 連絡先未入力の際、バリデーションエラーが表示されること', async () => {
      sessionStorage.setItem('user_id', 'u1111111');
      sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
      sessionStorage.setItem('display_name', '大島 茂');

      renderAddPage();

      await screen.findByRole('heading', { name: '作業員新規追加' });

      const nameInput = screen.getByLabelText('氏名');
      fireEvent.change(nameInput, { target: { value: 'テスト作業員' } });

      const saveButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('連絡先は必須入力です。')).toBeInTheDocument();
      });
    });

    it('TS-SCR-008-004: 正常な入力値で保存した際、SaveWorkerUseCaseが呼ばれ、一覧へ遷移すること', async () => {
      sessionStorage.setItem('user_id', 'u1111111');
      sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
      sessionStorage.setItem('display_name', '大島 茂');
      sessionStorage.setItem('contractor_id', 'c1111111');

      mockExecuteSaveWorker.mockResolvedValue({
        success: true,
        value: {
          worker_id: 'w123',
          contractor_id: 'c1111111',
          name: '新規作業員',
          contact: '090-0000-0000',
          qualifications: [],
          trainings: [],
          status: 'ACTIVE',
        },
      });

      renderAddPage();

      await screen.findByRole('heading', { name: '作業員新規追加' });

      const nameInput = screen.getByLabelText('氏名');
      const contactInput = screen.getByLabelText('連絡先 (電話番号またはメール)');
      fireEvent.change(nameInput, { target: { value: '新規作業員' } });
      fireEvent.change(contactInput, { target: { value: '090-0000-0000' } });

      const saveButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockExecuteSaveWorker).toHaveBeenCalledWith({
          contractorId: 'c1111111',
          name: '新規作業員',
          contact: '090-0000-0000',
          qualifications: [],
          trainings: [],
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/contractor/workers');
      });
    });
  });

  describe('編集モード (WorkerEditPage)', () => {
    const renderEditPage = () => {
      return render(
        <ToastProvider>
          <WorkerEditPage />
        </ToastProvider>
      );
    };

    it('TS-SCR-008-003: 既存データの読み込みが完了した際、初期値がフォームにロードされていること', async () => {
      sessionStorage.setItem('user_id', 'u1111111');
      sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
      sessionStorage.setItem('display_name', '大島 茂');
      sessionStorage.setItem('contractor_id', 'c1111111');

      mockGet.mockReturnValue('w123');
      mockExecuteGetWorkerById.mockResolvedValue({
        success: true,
        value: {
          worker_id: 'w123',
          contractor_id: 'c1111111',
          name: '既存太郎',
          contact: '090-9999-9999',
          qualifications: ['Q001'],
          trainings: [{ code: 'T001', taken_at: '2026-04-01' }],
          status: 'ACTIVE',
        },
      });

      renderEditPage();

      await screen.findByRole('heading', { name: '作業員編集' });

      expect(screen.getByLabelText('氏名')).toHaveValue('既存太郎');
      expect(screen.getByLabelText('連絡先 (電話番号またはメール)')).toHaveValue('090-9999-9999');
      expect(screen.getByText('T001')).toBeInTheDocument();
    });
  });
});
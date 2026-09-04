import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { WorkerForm } from '@/features/worker/ui/WorkerForm';

// routers, session, database mocks
const { mockPush, mockReplace } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  return { mockPush, mockReplace };
});

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
  useParams() {
    return { worker_id: 'W-TEST-999' };
  },
}));

vi.mock('@/features/worker/repository/workerRepository', () => {
  return {
    IndexedDBWorkerRepository: vi.fn().mockImplementation(() => {
      return {
        getById: vi.fn().mockResolvedValue({
          worker_id: 'W-TEST-999',
          contractor_id: 'C001',
          name: 'テスト 太郎',
          contact: '090-1234-5678',
          qualifications: ['QA01'],
          trainings: [{ code: 'TR01', taken_at: '2026-04-01' }],
          status: 'ACTIVE',
        }),
        save: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('WorkerForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock sessionStorage
    const store: Record<string, string> = {
      mock_session: JSON.stringify({
        userId: 'U001',
        contractorId: 'C001',
        role: 'CONTRACTOR_MANAGER',
        displayName: 'テスト管理者',
      }),
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          for (const k in store) delete store[k];
        },
      },
      writable: true,
    });
  });

  it('renders form with empty fields in new mode', () => {
    render(
      <WorkerForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByLabelText(/氏名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/連絡先/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  });

  it('shows error messages for required fields on empty submit', async () => {
    render(
      <WorkerForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
      />
    );

    const saveButton = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('氏名を入力してください')).toBeInTheDocument();
      expect(screen.getByText('連絡先を入力してください')).toBeInTheDocument();
    });
  });

  it('submits valid data when all fields are correctly filled', async () => {
    const handleSubmitMock = vi.fn();
    render(
      <WorkerForm
        onSubmit={handleSubmitMock}
        onCancel={vi.fn()}
        isSubmitting={false}
      />
    );

    fireEvent.change(screen.getByLabelText(/氏名/), { target: { value: '新規 作業員' } });
    fireEvent.change(screen.getByLabelText(/連絡先/), { target: { value: '080-9999-8888' } });

    const saveButton = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(handleSubmitMock).toHaveBeenCalledWith({
        name: '新規 作業員',
        contact: '080-9999-8888',
        qualifications: [],
        trainings: [],
      });
    });
  });

  it('calls cancel function when cancel button is clicked', () => {
    const handleCancelMock = vi.fn();
    render(
      <WorkerForm
        onSubmit={vi.fn()}
        onCancel={handleCancelMock}
        isSubmitting={false}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(handleCancelMock).toHaveBeenCalled();
  });
});
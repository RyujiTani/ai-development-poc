import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LaborTimeSummaryPage from '../app/(factory)/labor-time-summary/page';

const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const globalFetch = vi.fn();
global.fetch = globalFetch;

describe('LaborTimeSummaryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('非ログイン状態でアクセスしたときにログイン画面へリダイレクトすること', async () => {
    render(<LaborTimeSummaryPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('FACTORY_ADMINロールでログイン済みのとき、正しく労働時間集計画面が描画されること', async () => {
    sessionStorage.setItem('user_id', 'u1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          workerId: 'w1',
          workerName: '山田 太郎',
          contractorId: 'c1',
          contractorName: '大和建設',
          dateOrMonth: '2026-04-01',
          totalHours: 9.0,
        },
      ],
    });

    render(<LaborTimeSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('労働時間集計')).toBeInTheDocument();
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('大和建設')).toBeInTheDocument();
      expect(screen.getByText('9.0 時間')).toBeInTheDocument();
    });
  });

  it('開始日・終了日を未入力の状態で集計を押下した際、バリデーションエラーが表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    globalFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<LaborTimeSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('労働時間集計')).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText('開始日') as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '' } });

    const submitButton = screen.getByText('集計する');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('開始日を入力してください')).toBeInTheDocument();
    });
  });

  it('終了日が開始日より過去の日付に設定された場合、バリデーションエラーが表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    globalFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<LaborTimeSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('労働時間集計')).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText('開始日') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('終了日') as HTMLInputElement;

    fireEvent.change(startDateInput, { target: { value: '2026-04-15' } });
    fireEvent.change(endDateInput, { target: { value: '2026-04-10' } });

    const submitButton = screen.getByText('集計する');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('終了日は開始日以降の日付を指定してください')).toBeInTheDocument();
    });
  });
});
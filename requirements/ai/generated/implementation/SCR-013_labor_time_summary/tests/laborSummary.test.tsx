import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LaborSummaryPage from '@/app/(factory)/labor-summary/page';
import { getSession } from '@/lib/auth/authStore';

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      replace: mockReplace,
      push: mockPush,
    };
  }
}));

vi.mock('@/lib/auth/authStore', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/authStore')>('@/lib/auth/authStore');
  return {
    ...actual,
    getSession: vi.fn(),
  };
});

describe('SCR-013 労働時間集計画面 テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未ログイン時は権限不足画面が表示されること', () => {
    vi.mocked(getSession).mockReturnValue(null);
    render(<LaborSummaryPage />);
    expect(screen.getByText('管理者権限（FACTORY_ADMIN）が必要です')).toBeInTheDocument();
  });

  it('管理者でログイン時は集計条件フォームが表示されること', () => {
    vi.mocked(getSession).mockReturnValue({
      user_id: 'u1',
      role: 'FACTORY_ADMIN',
      display_name: '工場管理者A'
    });

    render(<LaborSummaryPage />);
    expect(screen.getByText('労働時間集計条件設定')).toBeInTheDocument();
  });

  it('開始日・終了日のバリデーションエラーチェック', async () => {
    vi.mocked(getSession).mockReturnValue({
      user_id: 'u1',
      role: 'FACTORY_ADMIN',
      display_name: '工場管理者A'
    });

    render(<LaborSummaryPage />);
    
    const startInput = screen.getByLabelText('開始日 *') as HTMLInputElement;
    const endInput = screen.getByLabelText('終了日 *') as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2026-04-15' } });
    fireEvent.change(endInput, { target: { value: '2026-04-10' } });

    const submitBtn = screen.getByRole('button', { name: '集計を実行する' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('⚠ 終了日は開始日以降の日付を指定してください')).toBeInTheDocument();
    });
  });
});

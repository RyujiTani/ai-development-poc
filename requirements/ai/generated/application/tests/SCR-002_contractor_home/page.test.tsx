import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractorHomePage from '../../app/(contractor)/contractor/page';
import { ToastProvider } from '../../components/ui/toast';

// Next.js ナビゲーションの安定したモック
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

describe('SCR-002: 外注先ホーム画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <ContractorHomePage />
      </ToastProvider>
    );
  };

  it('TEST-SCR-002-007: 未認証状態での直接遷移試行時に /login へリダイレクトされること', async () => {
    sessionStorage.clear();

    renderComponent();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TEST-SCR-002-006: ユーザー名表示検証 (大島 茂 様が表示されること)', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getAllByText(/大島 茂 様/)[0]).toBeInTheDocument();
  });

  it('TEST-SCR-002-001 & TEST-SCR-002-008: 「打刻」ボタンをクリックした際、打刻モード選択画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const punchButton = screen.getByRole('button', { name: /打刻（出勤・退勤）/ });
    fireEvent.click(punchButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor/punch-mode');
  });

  it('TEST-SCR-002-002 & TEST-SCR-002-009: 「作業員管理」ボタンをクリックした際、作業員一覧画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const workerButton = screen.getByRole('button', { name: /作業員管理/ });
    fireEvent.click(workerButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor/workers');
  });

  it('TEST-SCR-002-003 & TEST-SCR-002-010: ログアウトボタンをクリックした際、セッションがクリアされログイン画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButton);

    expect(sessionStorage.getItem('user_id')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();
    expect(sessionStorage.getItem('display_name')).toBeNull();

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TEST-SCR-002-004: 適用されているスタイルがタップしやすい十分な大きさを指定していること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const punchButton = screen.getByRole('button', { name: /打刻（出勤・退勤）/ });
    const workerButton = screen.getByRole('button', { name: /作業員管理/ });

    expect(punchButton.className).toContain('p-6');
    expect(workerButton.className).toContain('p-6');
  });
});
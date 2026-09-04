import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractorHomePage from '../app/(contractor)/home/page';
import { AuthProvider } from '../lib/auth/authContext';

// Next.js のナビゲーションモックを安定した参照で作成
const { mockPush, mockPathname, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockPathname = vi.fn().mockReturnValue('/home');
  return {
    mockPush,
    mockPathname,
    mockRouter: {
      push: mockPush,
      prefetch: vi.fn(),
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname(),
}));

// UserRepositoryのIndexedDB実装を簡易モック（vi.mockより先に初期化されるようvi.hoistedで定義）
const { mockUser } = vi.hoisted(() => {
  return {
    mockUser: {
      user_id: 'user-contractor-1',
      contractor_id: 'contractor-1',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'sub1',
      password_hash: 'mock_hash',
      display_name: '山田 太郎',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    }
  };
});

vi.mock('../features/user/repository/userRepository', () => {
  return {
    IndexedDBUserRepository: class {
      findById = vi.fn().mockResolvedValue(mockUser);
    },
  };
});

describe('SCR-002 外注先ホーム画面', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('TS-SCR-002-001: 未認証状態の場合はログイン画面へリダイレクトされること', async () => {
    render(
      <AuthProvider>
        <ContractorHomePage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-SCR-002-002: 認証済みの場合はログインユーザー名が正しく表示されること', async () => {
    sessionStorage.setItem('USER_ID', 'user-contractor-1');
    sessionStorage.setItem('USER_ROLE', 'CONTRACTOR_MANAGER');

    render(
      <AuthProvider>
        <ContractorHomePage />
      </AuthProvider>
    );

    // 読み込み完了後に表示されることを確認
    const userNameElement = await screen.findByText('山田 太郎 様');
    expect(userNameElement).toBeInTheDocument();
    expect(screen.getByText('外注先管理者メニュー')).toBeInTheDocument();
  });

  it('TS-SCR-002-003: 「打刻する」ボタンをクリックすると打刻モード選択画面へ遷移すること', async () => {
    sessionStorage.setItem('USER_ID', 'user-contractor-1');
    sessionStorage.setItem('USER_ROLE', 'CONTRACTOR_MANAGER');

    render(
      <AuthProvider>
        <ContractorHomePage />
      </AuthProvider>
    );

    const punchButton = await screen.findByText('打刻する');
    fireEvent.click(punchButton);

    expect(mockPush).toHaveBeenCalledWith('/punch-mode');
  });

  it('TS-SCR-002-004: 「作業員管理」ボタンをクリックすると作業員一覧画面へ遷移すること', async () => {
    sessionStorage.setItem('USER_ID', 'user-contractor-1');
    sessionStorage.setItem('USER_ROLE', 'CONTRACTOR_MANAGER');

    render(
      <AuthProvider>
        <ContractorHomePage />
      </AuthProvider>
    );

    const workerButton = await screen.findByText('作業員管理');
    fireEvent.click(workerButton);

    expect(mockPush).toHaveBeenCalledWith('/workers');
  });

  it('TS-SCR-002-005: 「ログアウト」ボタンをクリックするとセッションが破棄されログイン画面へ遷移すること', async () => {
    sessionStorage.setItem('USER_ID', 'user-contractor-1');
    sessionStorage.setItem('USER_ROLE', 'CONTRACTOR_MANAGER');

    render(
      <AuthProvider>
        <ContractorHomePage />
      </AuthProvider>
    );

    const logoutButton = await screen.findByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButton);

    expect(sessionStorage.getItem('USER_ID')).toBeNull();
    expect(sessionStorage.getItem('USER_ROLE')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
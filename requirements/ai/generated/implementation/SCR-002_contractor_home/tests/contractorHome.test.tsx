import { vi, describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ContractorHomePage from '@/app/(contractor)/home/page';
import { useAuthStore } from '@/lib/auth/authStore';

// Next.js useRouter モック
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

describe('ContractorHomePage (SCR-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    useAuthStore.setState({
      session: null,
      isLoading: false,
    });
  });

  it('SCR-002-UT-001: 認証済みのときユーザー名とメニューボタンが正しく表示されること', () => {
    const sessionData = {
      user_id: 'user-1',
      role: 'CONTRACTOR_MANAGER',
      display_name: 'Test Manager',
      contractor_id: 'contractor-1',
    };
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_session', JSON.stringify(sessionData));
    }
    useAuthStore.setState({
      session: sessionData,
      isLoading: false,
    });

    render(<ContractorHomePage />);

    // 表示名の確認
    expect(screen.getByTestId('user-display-name')).toHaveTextContent('Test Manager 様');

    // 「打刻」と「作業員管理」ボタンが存在することを確認
    expect(screen.getByText('打刻')).toBeInTheDocument();
    expect(screen.getByText('作業員管理')).toBeInTheDocument();
  });

  it('SCR-002-UT-002: 未認証のときログイン画面へリダイレクトされること', () => {
    useAuthStore.setState({
      session: null,
      isLoading: false,
    });

    render(<ContractorHomePage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('SCR-002-IT-001: 打刻ボタン押下で打刻モード選択画面へ遷移すること', () => {
    const sessionData = {
      user_id: 'user-1',
      role: 'CONTRACTOR_MANAGER',
      display_name: 'Test Manager',
      contractor_id: 'contractor-1',
    };
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_session', JSON.stringify(sessionData));
    }
    useAuthStore.setState({
      session: sessionData,
      isLoading: false,
    });

    render(<ContractorHomePage />);

    const punchButton = screen.getByRole('button', { name: '打刻画面へ進む' });
    fireEvent.click(punchButton);

    expect(mockPush).toHaveBeenCalledWith('/punch/mode');
  });

  it('SCR-002-IT-002: 作業員管理ボタン押下で作業員一覧画面へ遷移すること', () => {
    const sessionData = {
      user_id: 'user-1',
      role: 'CONTRACTOR_MANAGER',
      display_name: 'Test Manager',
      contractor_id: 'contractor-1',
    };
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_session', JSON.stringify(sessionData));
    }
    useAuthStore.setState({
      session: sessionData,
      isLoading: false,
    });

    render(<ContractorHomePage />);

    const workersButton = screen.getByRole('button', { name: '作業員管理画面へ進む' });
    fireEvent.click(workersButton);

    expect(mockPush).toHaveBeenCalledWith('/workers');
  });

  it('SCR-002-IT-003: ログアウトボタン押下でセッションがクリアされログイン画面へ遷移すること', () => {
    const sessionData = {
      user_id: 'user-1',
      role: 'CONTRACTOR_MANAGER',
      display_name: 'Test Manager',
      contractor_id: 'contractor-1',
    };
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_session', JSON.stringify(sessionData));
    }
    useAuthStore.setState({
      session: sessionData,
      isLoading: false,
    });

    render(<ContractorHomePage />);

    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButton);

    // セッションが破棄されていることを確認
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
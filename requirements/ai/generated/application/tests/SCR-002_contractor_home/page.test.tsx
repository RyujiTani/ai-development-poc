import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ContractorHomePage from '@/app/(contractor)/home/page';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';

// useRouterのモック
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
}));

// UserRepositoryの自動モック
vi.mock('@/features/user/repository/indexedDBUserRepository');

describe('SCR-002_contractor_home (外注先ホーム画面)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('TS-SCR-002-001: sessionStorageが空（未ログイン）の場合、ログイン画面へリダイレクトされること', async () => {
    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-SCR-002-001: roleがCONTRACTOR_MANAGER以外の場合、ログイン画面へリダイレクトされること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-SCR-002-002: ログインセッションが存在し、ユーザー情報取得に成功した場合、ユーザー名が表示されること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'valid_contractor',
      display_name: '外注先管理者A',
      status: 'ACTIVE',
    } as any);

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByText('外注先管理者A')).toBeInTheDocument();
    });

    expect(screen.getByText('打刻')).toBeInTheDocument();
    expect(screen.getByText('作業員管理')).toBeInTheDocument();
  });

  it('TS-SCR-002-003: 「打刻」メニューをクリックしたとき、打刻モード選択画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'valid_contractor',
      display_name: '外注先管理者A',
      status: 'ACTIVE',
    } as any);

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByText('外注先管理者A')).toBeInTheDocument();
    });

    const punchButton = screen.getByRole('button', { name: /打刻/ });
    fireEvent.click(punchButton);

    expect(mockPush).toHaveBeenCalledWith('/punch-mode');
  });

  it('TS-SCR-002-004: 「作業員管理」メニューをクリックしたとき、作業員一覧画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'valid_contractor',
      display_name: '外注先管理者A',
      status: 'ACTIVE',
    } as any);

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByText('外注先管理者A')).toBeInTheDocument();
    });

    const workersButton = screen.getByRole('button', { name: /作業員管理/ });
    fireEvent.click(workersButton);

    expect(mockPush).toHaveBeenCalledWith('/workers');
  });

  it('TS-SCR-002-005: 「ログアウト」ボタンをクリックしたとき、セッションが破棄され、ログイン画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    vi.mocked(IndexedDBUserRepository.prototype.findById).mockResolvedValue({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'valid_contractor',
      display_name: '外注先管理者A',
      status: 'ACTIVE',
    } as any);

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByText('外注先管理者A')).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /ログアウト/ });
    fireEvent.click(logoutButton);

    expect(sessionStorage.getItem('user_id')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
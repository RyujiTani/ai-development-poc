import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import AdminDashboardPage from '../app/(factory)/dashboard/page';
import * as getDashboardDataModule from '../features/report/usecase/getDashboardData';

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

describe('AdminDashboardPage (SCR-011)', () => {
  const originalSessionStorage = global.sessionStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Stub sessionStorage
    const store: Record<string, string> = {};
    const mockSessionStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    };

    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'sessionStorage', {
      value: originalSessionStorage,
    });
    vi.restoreAllMocks();
  });

  it('TS-SCR-011-001: should redirect to login if session is empty or not FACTORY_ADMIN', async () => {
    sessionStorage.clear();

    await act(async () => {
      render(<AdminDashboardPage />);
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TS-SCR-011-002 & 003: should fetch dashboard summary and alerts on correct credentials', async () => {
    sessionStorage.setItem('userId', 'admin-user');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', 'テスト管理者');

    const mockDashboardData: getDashboardDataModule.DashboardData = {
      summary: {
        total_active_workers: 10,
        working_contractors_count: 2,
      },
      alerts: [
        {
          alert_id: 'alert-1',
          type: 'WARNING',
          message: '打刻漏れが発生しています',
          occurred_at: '2026-04-13T10:00:00.000Z',
        },
      ],
    };

    const spyGetDashboard = vi
      .spyOn(getDashboardDataModule, 'getDashboardData')
      .mockResolvedValue(mockDashboardData);

    await act(async () => {
      render(<AdminDashboardPage />);
    });

    await waitFor(() => {
      expect(spyGetDashboard).toHaveBeenCalled();
    });

    // Worker Count Check
    expect(screen.getByTestId('active-workers-count').textContent).toBe('10');
    // Contractor Count Check
    expect(screen.getByTestId('working-contractors-count').textContent).toBe('2');
    // Alert Message Render Check
    expect(screen.getByText('打刻漏れが発生しています')).toBeDefined();
  });

  it('TS-SCR-011-005: should contain all navigation menus', async () => {
    sessionStorage.setItem('userId', 'admin-user');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    await act(async () => {
      render(<AdminDashboardPage />);
    });

    expect(screen.getByRole('button', { name: /打刻履歴確認/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /労働時間集計/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /外注先企業登録/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /管理者ユーザー登録/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeDefined();
  });

  it('TS-SCR-011-006: should navigate to attendance history screen', async () => {
    sessionStorage.setItem('userId', 'admin-user');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    await act(async () => {
      render(<AdminDashboardPage />);
    });

    const button = screen.getByRole('button', { name: /打刻履歴確認/ });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/attendance-history');
  });

  it('TS-SCR-011-007: should navigate to labor summary screen', async () => {
    sessionStorage.setItem('userId', 'admin-user');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    await act(async () => {
      render(<AdminDashboardPage />);
    });

    const button = screen.getByRole('button', { name: /労働時間集計/ });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/labor-summary');
  });

  it('TS-SCR-011-008: should navigate to contractor register screen', async () => {
    sessionStorage.setItem('userId', 'admin-user');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    await act(async () => {
      render(<AdminDashboardPage />);
    });

    const button = screen.getByRole('button', { name: /外注先企業登録/ });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/contractors');
  });

  it('TS-SCR-011-009: should navigate to user register screen', async () => {
    sessionStorage.setItem('userId', 'admin-user');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    await act(async () => {
      render(<AdminDashboardPage />);
    });

    const button = screen.getByRole('button', { name: /管理者ユーザー登録/ });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/users');
  });

  it('TS-SCR-011-010: should log out and clear session', async () => {
    sessionStorage.setItem('userId', 'admin-user');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    await act(async () => {
      render(<AdminDashboardPage />);
    });

    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButton);

    expect(sessionStorage.getItem('userId')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
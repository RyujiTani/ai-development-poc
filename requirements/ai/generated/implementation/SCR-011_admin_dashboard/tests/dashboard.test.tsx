import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboardPage from '../app/(factory)/dashboard/page';
import * as sessionModule from '../lib/auth/session';
import { DashboardRepository } from '../features/dashboard/repository/dashboardRepository';
import { DashboardData } from '../features/dashboard/domain/dashboard';

// Setup routing and repository mocks using stable hoisted objects to avoid issues
const { mockPush, mockRouter, mockGetDashboardData } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockDashboardData: DashboardData = {
    summary: {
      total_active_workers: 4,
      clocked_in_today: 4,
      contractor_breakdown: [
        { contractor_id: 'c1', name: '外注A社', active_count: 3 },
        { contractor_id: 'c2', name: '外注B社', active_count: 1 }
      ]
    },
    alerts: [
      {
        alert_id: 'alt-1',
        level: 'warning',
        message: '無資格作業員による打刻を検出しました',
        occurred_at: '2026-04-13T08:30:00+09:00'
      }
    ]
  };
  const mockGetDashboardData = vi.fn().mockResolvedValue(mockDashboardData);
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
    mockGetDashboardData,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('../features/dashboard/repository/dashboardRepository', () => {
  return {
    IndexedDBDashboardRepository: class {
      getDashboardData = mockGetDashboardData;
    }
  };
});

describe('AdminDashboardPage (SCR-011)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login if user session does not exist (SCR-011-VL-001)', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(null);

    render(<AdminDashboardPage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('redirects to login if the authenticated user is not FACTORY_ADMIN', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      userId: 'user-contractor',
      role: 'CONTRACTOR_MANAGER',
      displayName: '外注管理者',
      contractorId: 'c1'
    });

    render(<AdminDashboardPage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('renders correctly with loaded dashboard data (SCR-011-FN-001, SCR-011-FN-002, SCR-011-DT-001)', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      userId: 'user-admin',
      role: 'FACTORY_ADMIN',
      displayName: '鈴木総括',
      contractorId: null
    });

    render(<AdminDashboardPage />);

    // Initially loading
    expect(screen.getByText('ダッシュボードを読み込み中...')).toBeDefined();

    // Check loading complete state
    await waitFor(() => {
      expect(screen.getByText('鈴木総括')).toBeDefined();
      expect(screen.getByText('4')).toBeDefined(); // Total active workers
      expect(screen.getByText('外注A社')).toBeDefined();
      expect(screen.getByText('3名')).toBeDefined();
      expect(screen.getByText('外注B社')).toBeDefined();
      expect(screen.getByText('1名')).toBeDefined();
      expect(screen.getByText('無資格作業員による打刻を検出しました')).toBeDefined();
    });
  });

  it('handles menus click and triggers routing (SCR-011-FN-003, SCR-011-EV-001)', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      userId: 'user-admin',
      role: 'FACTORY_ADMIN',
      displayName: '鈴木総括',
      contractorId: null
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('鈴木総括')).toBeDefined();
    });

    // Tap '打刻履歴確認' menu item button
    const historyButton = screen.getByText('打刻履歴確認').closest('button');
    expect(historyButton).not.toBeNull();
    fireEvent.click(historyButton!);
    expect(mockPush).toHaveBeenCalledWith('/attendance-history');

    // Tap '労働時間集計' menu item button
    const laborButton = screen.getByText('労働時間集計').closest('button');
    expect(laborButton).not.toBeNull();
    fireEvent.click(laborButton!);
    expect(mockPush).toHaveBeenCalledWith('/labor-summary');
  });

  it('handles logout flow and purges auth session data (SCR-011-FN-004, SCR-011-EV-005)', async () => {
    const clearSessionSpy = vi.spyOn(sessionModule, 'clearSession');
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      userId: 'user-admin',
      role: 'FACTORY_ADMIN',
      displayName: '鈴木総括',
      contractorId: null
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('鈴木総括')).toBeDefined();
    });

    const logoutBtn = screen.getByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutBtn);

    expect(clearSessionSpy).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AttendanceHistoryPage from '@/app/(factory)/attendance-history/page';
import { attendanceRepository } from '@/features/attendance/repository/attendanceRepository';

// navigation モック
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// repository モック
vi.mock('@/features/attendance/repository/attendanceRepository', () => ({
  attendanceRepository: {
    getPhotoBlob: vi.fn(),
    getActiveContractors: vi.fn(),
    getAttendanceHistory: vi.fn(),
    saveCorrection: vi.fn(),
  },
}));

describe('SCR-012_punch_history: 打刻履歴確認画面', () => {
  const originalSessionStorage = global.sessionStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // sessionStorage モック
    const store: Record<string, string> = {};
    const mockSessionStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      length: 0,
      key: (index: number) => '',
    };
    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
    });
  });

  it('TST-012-006: 未ログインまたは一般外注先管理者ロールでアクセスした場合、管理者ログイン画面へリダイレクトされること', () => {
    sessionStorage.setItem('user_id', 'user_contractor_1');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER'); // 不正なロール

    render(<AttendanceHistoryPage />);

    expect(mockPush).toHaveBeenCalledWith('/admin-login');
  });

  it('TST-012-001: 工場管理者でログインしている場合、初期状態で履歴一覧が読み込まれてテーブル表示されること', async () => {
    sessionStorage.setItem('user_id', 'user_admin_1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    const mockContractors = [
      { contractor_id: 'c1-uuid', name: '第一建設', status: 'ACTIVE', created_at: '', updated_at: '' },
    ];
    const mockHistory = [
      {
        attendance_id: 'att-1',
        worker_id: 'w1',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_IN',
        clocked_at: '2026-04-13T08:00:00Z',
        punched_by: 'u1',
        photo_object_id: 'photo-123',
        created_at: '2026-04-13T08:00:00Z',
        worker_name: '山田太郎',
        contractor_name: '第一建設',
      },
    ];

    vi.mocked(attendanceRepository.getActiveContractors).mockResolvedValue(mockContractors as any);
    vi.mocked(attendanceRepository.getAttendanceHistory).mockResolvedValue(mockHistory as any);

    render(<AttendanceHistoryPage />);

    expect(screen.getByText('打刻履歴確認')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('山田太郎').length).toBeGreaterThan(0);
      expect(screen.getAllByText('第一建設').length).toBeGreaterThan(0);
      expect(screen.getAllByText('出勤').length).toBeGreaterThan(0);
    });
  });

  it('TST-012-002: 日付フィルタを変更して更新ボタンを押した際、条件に合わせた打刻履歴が再取得されること', async () => {
    sessionStorage.setItem('user_id', 'user_admin_1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    vi.mocked(attendanceRepository.getActiveContractors).mockResolvedValue([]);
    vi.mocked(attendanceRepository.getAttendanceHistory).mockResolvedValue([]);

    render(<AttendanceHistoryPage />);

    // 最初の読み込み完了を待機して非同期処理の競合を防ぐ
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const dateInput = screen.getByTestId('filter-date-input');
    fireEvent.change(dateInput, { target: { value: '2026-04-14' } });

    const searchBtn = screen.getByTestId('search-btn');
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(attendanceRepository.getAttendanceHistory).toHaveBeenCalledWith({
        date: '2026-04-14',
        contractorId: 'all',
      });
    });
  });

  it('TST-012-004: 打刻修正モーダルで、修正理由を入力せずに保存ボタンを押した場合、必須エラーメッセージが表示されること', async () => {
    sessionStorage.setItem('user_id', 'user_admin_1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    const mockHistory = [
      {
        attendance_id: 'att-1',
        worker_id: 'w1',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_IN',
        clocked_at: '2026-04-13T08:00:00Z',
        punched_by: 'u1',
        photo_object_id: 'photo-123',
        created_at: '2026-04-13T08:00:00Z',
        worker_name: '山田太郎',
        contractor_name: '第一建設',
      },
    ];

    vi.mocked(attendanceRepository.getActiveContractors).mockResolvedValue([]);
    vi.mocked(attendanceRepository.getAttendanceHistory).mockResolvedValue(mockHistory as any);

    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getAllByText('山田太郎').length).toBeGreaterThan(0);
    });

    const correctBtn = screen.getByTestId('correct-btn-att-1');
    fireEvent.click(correctBtn);

    // 修正モーダル出現
    expect(screen.getByText('打刻データの修正')).toBeInTheDocument();

    const saveBtn = screen.getByTestId('save-correction-btn');
    fireEvent.click(saveBtn);

    expect(screen.getByText('修正理由を入力してください')).toBeInTheDocument();
    expect(attendanceRepository.saveCorrection).not.toHaveBeenCalled();
  });

  it('TST-012-005: 修正フォームに正しくデータを入力して保存した際、保存APIが呼ばれて成功メッセージが表示されること', async () => {
    sessionStorage.setItem('user_id', 'user_admin_1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    const mockHistory = [
      {
        attendance_id: 'att-1',
        worker_id: 'w1',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_IN',
        clocked_at: '2026-04-13T08:00:00Z',
        punched_by: 'u1',
        photo_object_id: 'photo-123',
        created_at: '2026-04-13T08:00:00Z',
        worker_name: '山田太郎',
        contractor_name: '第一建設',
      },
    ];

    vi.mocked(attendanceRepository.getActiveContractors).mockResolvedValue([]);
    vi.mocked(attendanceRepository.getAttendanceHistory).mockResolvedValue(mockHistory as any);
    vi.mocked(attendanceRepository.saveCorrection).mockResolvedValue({ success: true, correctionId: 'corr-1' });

    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getAllByText('山田太郎').length).toBeGreaterThan(0);
    });

    const correctBtn = screen.getByTestId('correct-btn-att-1');
    fireEvent.click(correctBtn);

    const reasonTextarea = screen.getByPlaceholderText('例: 打刻忘れのため代理入力');
    fireEvent.change(reasonTextarea, { target: { value: '打刻修正テストの理由記載' } });

    const saveBtn = screen.getByTestId('save-correction-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(attendanceRepository.saveCorrection).toHaveBeenCalledWith(expect.objectContaining({
        attendanceId: 'att-1',
        reason: '打刻修正テストの理由記載',
      }));
    });
  });
});
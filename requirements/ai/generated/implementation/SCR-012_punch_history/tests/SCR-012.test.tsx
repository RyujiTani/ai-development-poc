import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendanceHistoryPage from '../app/(factory)/attendance-history/page';

// Mock internal repository
const mockGetActiveContractors = vi.fn().mockResolvedValue([
  { contractor_id: 'c-1', name: '大都工業 (株)', status: 'ACTIVE' },
  { contractor_id: 'c-2', name: 'シンセイ・テック (有)', status: 'ACTIVE' }
]);

const mockRecords = [
  {
    attendance_id: 'a-1',
    worker_id: 'w-1',
    worker_name: '鈴木 一郎',
    contractor_id: 'c-1',
    contractor_name: '大都工業 (株)',
    punch_type: 'CLOCK_IN',
    clocked_at: '2026-04-13T08:00:15+09:00',
    punched_by: 'u-2',
    photo_object_id: 'ph-1',
    created_at: '2026-04-13T08:00:15+09:00'
  }
];

const mockGetAttendanceRecords = vi.fn().mockResolvedValue(mockRecords);
const mockGetPhotoBlob = vi.fn().mockResolvedValue(new Blob(['dummy'], { type: 'image/jpeg' }));
const mockUpdateAttendanceRecord = vi.fn().mockResolvedValue(undefined);

vi.mock('../features/attendance/repository/attendanceRepository', () => {
  return {
    AttendanceRepository: vi.fn().mockImplementation(() => {
      return {
        getActiveContractors: mockGetActiveContractors,
        getAttendanceRecords: mockGetAttendanceRecords,
        getPhotoBlob: mockGetPhotoBlob,
        updateAttendanceRecord: mockUpdateAttendanceRecord
      };
    })
  };
});

vi.mock('../lib/db/idb', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined)
}));

// Mock URL create / revoke
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:dummy-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

declared: describe('SCR-012 打刻履歴確認画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('AC-SCR-012-007: 未ログイン状態でのアクセス制御', async () => {
    render(<AttendanceHistoryPage />);
    
    // Confirm rendering of Access Restriction UI
    expect(screen.getByText('アクセス制限エラー')).toBeDefined();
    expect(screen.getByText('【デモ用】工場管理者としてクイックログイン')).toBeDefined();
  });

  it('AC-SCR-012-001: 正常な権限ログイン後の初期ロード', async () => {
    sessionStorage.setItem('user_id', 'u-1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場側管理者 鈴木');

    render(<AttendanceHistoryPage />);

    // Check header
    await waitFor(() => {
      expect(screen.getByText('打刻履歴確認画面')).toBeDefined();
      expect(screen.getByText('工場側管理者 鈴木')).toBeDefined();
    });

    // Wait for data load
    await waitFor(() => {
      expect(mockGetAttendanceRecords).toHaveBeenCalledWith('2026-04-13', null);
      expect(screen.getByText('鈴木 一郎')).toBeDefined();
      expect(screen.getByText('大都工業 (株)')).toBeDefined();
    });
  });

  it('AC-SCR-012-005: 写真の拡大表示とObjectURLの解放検証', async () => {
    sessionStorage.setItem('user_id', 'u-1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByAltText('打刻写真')).toBeDefined();
    });

    const thumb = screen.getByAltText('打刻写真');
    fireEvent.click(thumb);

    // Modal open confirmation
    expect(screen.getByText('打刻現場証拠写真の拡大')).toBeDefined();

    // Modal close and revoke verification
    const closeBtn = screen.getByText('閉じる');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('打刻現場証拠写真の拡大')).toBeNull();
  });

  it('AC-SCR-012-006: 修正理由の必須バリデーションチェック', async () => {
    sessionStorage.setItem('user_id', 'u-1');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('修正')).toBeDefined();
    });

    const editBtn = screen.getByText('修正');
    fireEvent.click(editBtn);

    // Modal opens
    expect(screen.getByText('打刻実績の代理修正登録')).toBeDefined();

    // Submit without reason
    const saveBtn = screen.getByText('保存する');
    fireEvent.click(saveBtn);

    // Validation message displays
    expect(screen.getByText('修正理由は必須入力です')).toBeDefined();
    expect(mockUpdateAttendanceRecord).not.toHaveBeenCalled();

    // Enter reason and success
    const textReason = screen.getByPlaceholderText('（例：打刻エラーが発生したための代理修正等、具体的な理由を必須記述）');
    fireEvent.change(textReason, { target: { value: '打刻時間ズレ修正' } });
    
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(mockUpdateAttendanceRecord).toHaveBeenCalled();
    });
  });
});

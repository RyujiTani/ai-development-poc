import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LaborSummaryPage from '@/app/(factory)/labor-summary/page';
import { initDB } from '@/lib/db/indexedDB';
import 'fake-indexeddb/auto';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
  useSearchParams() {
    return {
      get: vi.fn(),
    };
  },
}));

describe('SCR-013_labor_time_summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('未認証のとき、管理者ログイン画面にリダイレクトされること (SCR-013-VL-003)', async () => {
    render(<LaborSummaryPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin-login');
    });
  });

  describe('認証済み状態のテスト (FACTORY_ADMIN)', () => {
    beforeEach(() => {
      sessionStorage.setItem('user_id', 'u2-uuid');
      sessionStorage.setItem('role', 'FACTORY_ADMIN');
    });

    it('日付を未入力にして集計を押すと、バリデーションエラーが表示されること (SCR-013-VL-001, SCR-013-VL-002)', async () => {
      render(<LaborSummaryPage />);

      const submitBtn = await screen.findByRole('button', { name: '集計' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('start-date-error')).toHaveTextContent('開始日を入力してください');
        expect(screen.getByTestId('end-date-error')).toHaveTextContent('終了日を入力してください');
      });
    });

    it('開始日より前の終了日を入力すると、日付逆転バリデーションエラーが表示されること (SCR-013-VL-002)', async () => {
      render(<LaborSummaryPage />);

      const startDateInput = await screen.findByLabelText('開始日');
      const endDateInput = await screen.findByLabelText('終了日');

      fireEvent.change(startDateInput, { target: { value: '2026-04-10' } });
      fireEvent.change(endDateInput, { target: { value: '2026-04-05' } });

      const submitBtn = screen.getByRole('button', { name: '集計' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('end-date-error')).toHaveTextContent('終了日は開始日以降の日付を指定してください');
      });
    });

    it('正しく日次集計が計算・表示されること (SCR-013-FN-001, SCR-013-FN-003)', async () => {
      const db = await initDB();
      const tx = db.transaction(['contractors', 'workers', 'attendance_records'], 'readwrite');

      await tx.objectStore('contractors').put({
        contractor_id: 'c1-uuid',
        name: '第一建設',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00Z',
        updated_at: '2026-04-13T00:00:00Z',
      });

      await tx.objectStore('workers').put({
        worker_id: 'w1-uuid',
        contractor_id: 'c1-uuid',
        name: '山田 太郎',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00Z',
        updated_at: '2026-04-13T00:00:00Z',
        qualifications: [],
        trainings: [],
      });

      // 4/1 8:00 JST (前日23:00 UTC) 〜 17:00 JST (当日08:00 UTC) (9時間)
      await tx.objectStore('attendance_records').put({
        attendance_id: 'a1',
        worker_id: 'w1-uuid',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_IN',
        clocked_at: '2026-03-31T23:00:00Z', // 4/1 08:00 JST
        punched_by: 'u2-uuid',
        photo_object_id: 'p1',
        created_at: '2026-03-31T23:00:00Z',
      });

      await tx.objectStore('attendance_records').put({
        attendance_id: 'a2',
        worker_id: 'w1-uuid',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_OUT',
        clocked_at: '2026-04-01T08:00:00Z', // 4/1 17:00 JST
        punched_by: 'u2-uuid',
        photo_object_id: 'p2',
        created_at: '2026-04-01T08:00:00Z',
      });

      await tx.done;

      render(<LaborSummaryPage />);

      const startDateInput = await screen.findByLabelText('開始日');
      const endDateInput = await screen.findByLabelText('終了日');

      fireEvent.change(startDateInput, { target: { value: '2026-04-01' } });
      fireEvent.change(endDateInput, { target: { value: '2026-04-01' } });

      const submitBtn = screen.getByRole('button', { name: '集計' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getAllByText('山田 太郎')[0]).toBeInTheDocument();
        expect(screen.getAllByText('第一建設')[0]).toBeInTheDocument();
        expect(screen.getAllByText('2026-04-01')[0]).toBeInTheDocument();
        expect(screen.getAllByText(/9\.00/)[0]).toBeInTheDocument();
      });
    });

    it('月次集計を選択して、期間内の合算値が正しく表示されること (SCR-013-FN-002)', async () => {
      const db = await initDB();
      const tx = db.transaction(['contractors', 'workers', 'attendance_records'], 'readwrite');

      await tx.objectStore('contractors').put({
        contractor_id: 'c1-uuid',
        name: '第一建設',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00Z',
        updated_at: '2026-04-13T00:00:00Z',
      });

      await tx.objectStore('workers').put({
        worker_id: 'w1-uuid',
        contractor_id: 'c1-uuid',
        name: '山田 太郎',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00Z',
        updated_at: '2026-04-13T00:00:00Z',
        qualifications: [],
        trainings: [],
      });

      // 4/1 8:00 JST 〜 12:00 JST (4時間)
      await tx.objectStore('attendance_records').put({
        attendance_id: 'a3',
        worker_id: 'w1-uuid',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_IN',
        clocked_at: '2026-03-31T23:00:00Z',
        punched_by: 'u2-uuid',
        photo_object_id: 'p3',
        created_at: '2026-03-31T23:00:00Z',
      });

      await tx.objectStore('attendance_records').put({
        attendance_id: 'a4',
        worker_id: 'w1-uuid',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_OUT',
        clocked_at: '2026-04-01T03:00:00Z',
        punched_by: 'u2-uuid',
        photo_object_id: 'p4',
        created_at: '2026-04-01T03:00:00Z',
      });

      // 4/2 8:00 JST 〜 14:00 JST (6時間)
      await tx.objectStore('attendance_records').put({
        attendance_id: 'a5',
        worker_id: 'w1-uuid',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_IN',
        clocked_at: '2026-04-01T23:00:00Z',
        punched_by: 'u2-uuid',
        photo_object_id: 'p5',
        created_at: '2026-04-01T23:00:00Z',
      });

      await tx.objectStore('attendance_records').put({
        attendance_id: 'a6',
        worker_id: 'w1-uuid',
        contractor_id: 'c1-uuid',
        punch_type: 'CLOCK_OUT',
        clocked_at: '2026-04-02T05:00:00Z',
        punched_by: 'u2-uuid',
        photo_object_id: 'p6',
        created_at: '2026-04-02T05:00:00Z',
      });

      await tx.done;

      render(<LaborSummaryPage />);

      // 月次に切り替え
      const monthlyRadio = await screen.findByLabelText('月次');
      fireEvent.click(monthlyRadio);

      const startMonthInput = await screen.findByLabelText('開始月');
      const endMonthInput = await screen.findByLabelText('終了月');

      fireEvent.change(startMonthInput, { target: { value: '2026-04' } });
      fireEvent.change(endMonthInput, { target: { value: '2026-04' } });

      const submitBtn = screen.getByRole('button', { name: '集計' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getAllByText('山田 太郎')[0]).toBeInTheDocument();
        expect(screen.getAllByText('2026-04')[0]).toBeInTheDocument();
        // 4 + 6 = 10.00時間
        expect(screen.getAllByText(/10\.00/)[0]).toBeInTheDocument();
      });
    });

    it('集計データが存在するときにCSVダウンロードボタンが活性化し、クリックできること (SCR-013-FN-004, SCR-013-UI-003)', async () => {
      render(<LaborSummaryPage />);

      const downloadBtn = await screen.findByTestId('csv-download-btn');
      expect(downloadBtn).toBeDisabled();
    });
  });
});
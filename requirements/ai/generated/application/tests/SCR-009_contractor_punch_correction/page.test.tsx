import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PunchCorrectionPage from '@/app/(contractor)/punch-correction/page';
import { initDB } from '@/lib/db/indexedDB';
import React from 'react';
import 'fake-indexeddb/auto';

const mockPush = vi.fn();
const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
  useSearchParams() {
    return {
      get: mockGet,
    };
  },
}));

describe('SCR-009_contractor_punch_correction', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.sessionStorage.clear();

    const db = await initDB();

    window.sessionStorage.setItem('user_id', 'u1-uuid');
    window.sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    window.sessionStorage.setItem('contractor_id', 'c1-uuid');
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('CONTRACTOR_MANAGERではない、または未ログインの場合、ログイン画面にリダイレクトされること', async () => {
    window.sessionStorage.clear();

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('対象作業員を未選択のままで送信を試みた場合、バリデーションエラーが表示されること', async () => {
    mockGet.mockReturnValue(null);
    render(<PunchCorrectionPage />);

    await screen.findByText('手動打刻登録');

    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    const error = await screen.findByTestId('worker_id-error');
    expect(error.textContent).toContain('対象作業員は必須選択です');
  });

  it('打刻日時が空、または無効な形式の場合、バリデーションエラーが表示されること', async () => {
    mockGet.mockReturnValue(null);
    render(<PunchCorrectionPage />);
    await screen.findByText('手動打刻登録');

    const dateInput = screen.getByLabelText(/打刻日時/);
    fireEvent.change(dateInput, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    const error = await screen.findByTestId('clocked_at-error');
    expect(error.textContent).toContain('打刻日時を入力してください');
  });

  it('修正理由が空、または半角全角スペースのみの場合、バリデーションエラーが表示されること', async () => {
    mockGet.mockReturnValue(null);
    render(<PunchCorrectionPage />);
    await screen.findByText('手動打刻登録');

    const reasonInput = screen.getByLabelText(/修正理由/);
    fireEvent.change(reasonInput, { target: { value: '   ' } });

    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    const error = await screen.findByTestId('reason-error');
    expect(error.textContent).toContain('修正理由は必須入力です');
  });

  it('有効な入力を入力して送信した際、IndexedDB にデータが保存され、ホーム画面に遷移すること', async () => {
    mockGet.mockReturnValue(null);

    const db = await initDB();
    const tx = db.transaction('workers', 'readwrite');
    await tx.objectStore('workers').put({
      worker_id: 'test-worker-id',
      contractor_id: 'c1-uuid',
      name: 'テスト作業員',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      qualifications: [],
      trainings: []
    });
    await tx.done;

    render(<PunchCorrectionPage />);
    await screen.findByText('手動打刻登録');

    const workerSelect = screen.getByLabelText(/対象作業員/);
    fireEvent.change(workerSelect, { target: { value: 'test-worker-id' } });

    const dateInput = screen.getByLabelText(/打刻日時/);
    fireEvent.change(dateInput, { target: { value: '2026-04-13T08:00' } });

    const typeInRadio = screen.getByLabelText('出勤') as HTMLInputElement;
    fireEvent.click(typeInRadio);

    const reasonInput = screen.getByLabelText(/修正理由/);
    fireEvent.change(reasonInput, { target: { value: '打刻忘れのため手動追加' } });

    const submitButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(submitButton);

    const successMsg = await screen.findByTestId('success-message');
    expect(successMsg.textContent).toContain('手動打刻の登録を完了しました');

    await waitFor(async () => {
      const dbCheck = await initDB();
      const records = await dbCheck.transaction('attendance_records', 'readonly').objectStore('attendance_records').getAll();
      const corrections = await dbCheck.transaction('attendance_corrections', 'readonly').objectStore('attendance_corrections').getAll();

      expect(records.length).toBeGreaterThan(0);
      expect(corrections.length).toBeGreaterThan(0);

      const manualRecord = records.find(r => r.worker_id === 'test-worker-id');
      expect(manualRecord).toBeDefined();
      expect(manualRecord?.punch_type).toBe('CLOCK_IN');
      expect(manualRecord?.photo_object_id).toBe('MANUAL');

      const correction = corrections.find(c => c.attendance_id === manualRecord?.attendance_id);
      expect(correction).toBeDefined();
      expect(correction?.reason).toBe('打刻忘れのため手動追加');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor/home');
    }, { timeout: 2000 });
  });

  it('キャンセルボタンをクリックした際、入力内容を破棄して直ちにホーム画面へ遷移すること', async () => {
    mockGet.mockReturnValue(null);
    render(<PunchCorrectionPage />);
    await screen.findByText('手動打刻登録');

    const cancelButton = screen.getAllByRole('button', { name: 'キャンセル' })[0];
    fireEvent.click(cancelButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor/home');
  });
});
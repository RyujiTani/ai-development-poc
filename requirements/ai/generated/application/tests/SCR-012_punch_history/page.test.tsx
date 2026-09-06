import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { initDB } from '@/lib/db';
import AttendanceHistoryPage from '@/app/(factory)/attendance-history/page';

// Next.js Navigation モック
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

describe('SCR-012 打刻履歴確認画面', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // システム時刻を固定 (Dateのみフェイクに設定して、fake-indexeddbが非同期処理でフリーズするのを防ぐ)
    const mockDate = new Date('2026-04-13T10:00:00.000Z');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(mockDate);

    // fake-indexeddb ストアデータの初期化・クリア
    const db = await initDB();
    const tx = db.transaction(
      ['users', 'contractors', 'workers', 'attendance_records', 'attendance_corrections'],
      'readwrite'
    );
    await tx.objectStore('users').delete('usr-admin-001');
    await tx.objectStore('contractors').delete('con-001');
    await tx.objectStore('workers').delete('wrk-001');
    await tx.done;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('認証ガードロジックの動作検証テスト (TST-SCR-012-004)', async () => {
    // 1. 未ログイン状態
    render(<AttendanceHistoryPage />);
    expect(mockReplace).toHaveBeenCalledWith('/login');

    // 2. 異なる管理者ロール (一般外注先管理者)
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    render(<AttendanceHistoryPage />);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('シードデータが設定されたモック環境での打刻履歴画面の表示 (TST-SCR-012-001)', async () => {
    // 正しい管理者権限をセッションにセット
    sessionStorage.setItem('user_id', 'usr-admin-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    // IndexedDB にモックデータ格納
    const db = await initDB();
    const tx = db.transaction(['contractors', 'workers', 'attendance_records'], 'readwrite');
    await tx.objectStore('contractors').put({
      contractor_id: 'con-001',
      name: 'テスト第一工業',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00',
    });
    await tx.objectStore('workers').put({
      worker_id: 'wrk-001',
      contractor_id: 'con-001',
      name: '山田 太郎',
      qualifications: ['有機溶剤作業主任者'],
      trainings: [],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00',
    });
    await tx.objectStore('attendance_records').put({
      attendance_id: 'att-001',
      worker_id: 'wrk-001',
      contractor_id: 'con-001',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:00:00.000Z',
      punched_by: 'usr-001',
      photo_object_id: 'pho-001',
      created_at: '2026-04-13T08:00:00.000Z',
    });
    await tx.done;

    render(<AttendanceHistoryPage />);

    // ロードが完了し、打刻レコードが描画されたことを確認
    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    expect(screen.getByText('テスト第一工業')).toBeInTheDocument();
    expect(screen.getByText('出勤')).toBeInTheDocument();
  });

  it('日付変更イベントのシミュレートと再クエリ呼び出しのテスト (TST-SCR-012-002)', async () => {
    sessionStorage.setItem('user_id', 'usr-admin-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    const db = await initDB();
    const tx = db.transaction(['contractors', 'workers', 'attendance_records'], 'readwrite');
    await tx.objectStore('contractors').put({
      contractor_id: 'con-001',
      name: 'テスト第一工業',
      status: 'ACTIVE',
    });
    await tx.objectStore('workers').put({
      worker_id: 'wrk-001',
      contractor_id: 'con-001',
      name: '山田 太郎',
      status: 'ACTIVE',
    });
    // 2026-04-12 のレコード
    await tx.objectStore('attendance_records').put({
      attendance_id: 'att-001',
      worker_id: 'wrk-001',
      contractor_id: 'con-001',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-12T08:00:00.000Z',
      punched_by: 'usr-001',
      photo_object_id: 'pho-001',
      created_at: '2026-04-12T08:00:00.000Z',
    });
    // 2026-04-13 のレコード
    await tx.objectStore('attendance_records').put({
      attendance_id: 'att-002',
      worker_id: 'wrk-001',
      contractor_id: 'con-001',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:00:00.000Z',
      punched_by: 'usr-001',
      photo_object_id: 'pho-002',
      created_at: '2026-04-13T08:00:00.000Z',
    });
    await tx.done;

    render(<AttendanceHistoryPage />);

    // フィルタの日付を変更する
    const dateInput = await screen.findByTestId('date-filter-input');
    fireEvent.change(dateInput, { target: { value: '2026-04-12' } });

    // 2026-04-12 のみの打刻履歴が表示される
    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    // 2026-04-14 (打刻なし) に変更
    fireEvent.change(dateInput, { target: { value: '2026-04-14' } });
    await waitFor(() => {
      expect(screen.queryByText('山田 太郎')).not.toBeInTheDocument();
    });
  });

  it('修正理由の必須入力バリデーションおよび更新保存テスト (TST-SCR-012-003)', async () => {
    sessionStorage.setItem('user_id', 'usr-admin-001');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');

    const db = await initDB();
    const tx = db.transaction(['contractors', 'workers', 'attendance_records'], 'readwrite');
    await tx.objectStore('contractors').put({
      contractor_id: 'con-001',
      name: 'テスト第一工業',
      status: 'ACTIVE',
    });
    await tx.objectStore('workers').put({
      worker_id: 'wrk-001',
      contractor_id: 'con-001',
      name: '山田 太郎',
      status: 'ACTIVE',
    });
    await tx.objectStore('attendance_records').put({
      attendance_id: 'att-001',
      worker_id: 'wrk-001',
      contractor_id: 'con-001',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:00:00.000Z',
      punched_by: 'usr-001',
      photo_object_id: 'pho-001',
      created_at: '2026-04-13T08:00:00.000Z',
    });
    await tx.done;

    render(<AttendanceHistoryPage />);

    // 行内の「修正」ボタンクリック
    const editBtn = await screen.findByTestId('edit-btn-att-001');
    fireEvent.click(editBtn);

    // 修正用フォームモーダルの展開を確認
    const reasonTextarea = await screen.findByTestId('reason-textarea');
    const submitBtn = await screen.findByTestId('form-submit-btn');

    // 理由を入力せずに送信をシミュレート
    fireEvent.change(reasonTextarea, { target: { value: '' } });
    fireEvent.click(submitBtn);

    // 必須エラー検証
    await waitFor(() => {
      expect(screen.getByText('理由を入力してください。')).toBeInTheDocument();
    });

    // 正しく理由を入力して送信
    fireEvent.change(reasonTextarea, { target: { value: '打刻時間入力補正' } });
    fireEvent.click(submitBtn);

    // モーダルが閉じて一覧が更新されるのを待機
    await waitFor(() => {
      expect(screen.queryByTestId('reason-textarea')).not.toBeInTheDocument();
    });

    // DB に修正実績 (attendance_corrections) が追加されたことを確認
    const finalDb = await initDB();
    const checkTx = finalDb.transaction('attendance_corrections', 'readonly');
    const correctionsList = await checkTx.objectStore('attendance_corrections').getAll();
    await checkTx.done;

    expect(correctionsList.length).toBe(1);
    expect(correctionsList[0].reason).toBe('打刻時間入力補正');
  });
});
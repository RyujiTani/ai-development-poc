import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkerNewPage from '@/app/(contractor)/workers/new/page';
import WorkerEditPage from '@/app/(contractor)/workers/[id]/page';
import { initDB } from '@/lib/db';
import 'fake-indexeddb/auto';

// useRouter などのモック
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
  useParams() {
    return { id: 'wrk-123' };
  },
}));

describe('SCR-008_worker_add_edit', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    mockPush.mockClear();
    mockReplace.mockClear();

    // モックDBの初期化とシード
    const db = await initDB();
    const writeTx = db.transaction(['users', 'workers'], 'readwrite');
    await writeTx.objectStore('users').put({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'valid_contractor',
      password_hash: 'correct_password',
      display_name: '外注先管理者A',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    });
    await writeTx.objectStore('workers').put({
      worker_id: 'wrk-123',
      contractor_id: 'con-001',
      name: '山田 太郎',
      contact: '090-1234-5678',
      qualifications: ['有機溶剤作業主任者'],
      trainings: [{ code: 'TR-01', taken_at: '2026-04-01' }],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    });
    await writeTx.done;
  });

  it('SCR-008-TS-005: 認証キーがない場合はログイン画面にリダイレクトされること', async () => {
    render(<WorkerNewPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('SCR-008-TS-001: 氏名が未入力のときにエラーが表示されること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<WorkerNewPage />);

    // 読み込み完了まで待つ
    const nameInput = await screen.findByTestId('name-input');
    const submitBtn = screen.getByTestId('submit-btn');

    // 氏名クリア、連絡先入力
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.change(screen.getByTestId('contact-input'), { target: { value: '090-0000-0000' } });

    fireEvent.click(submitBtn);

    const nameError = await screen.findByTestId('name-error');
    expect(nameError).toHaveTextContent('氏名は必須入力です');
  });

  it('SCR-008-TS-002: 連絡先が未入力または不正な形式のときにエラーが表示されること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<WorkerNewPage />);

    const nameInput = await screen.findByTestId('name-input');
    const contactInput = screen.getByTestId('contact-input');
    const submitBtn = screen.getByTestId('submit-btn');

    // 空値
    fireEvent.change(nameInput, { target: { value: '鈴木 一郎' } });
    fireEvent.change(contactInput, { target: { value: '' } });
    fireEvent.click(submitBtn);

    let contactError = await screen.findByTestId('contact-error');
    expect(contactError).toHaveTextContent('連絡先は必須入力です');

    // 不正形式
    fireEvent.change(contactInput, { target: { value: 'invalid-phone-number' } });
    fireEvent.click(submitBtn);

    contactError = await screen.findByTestId('contact-error');
    expect(contactError).toHaveTextContent('適切な電話番号の形式で入力してください。');
  });

  it('SCR-008-TS-003: 編集モードのときに既存データが初期ロードされること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<WorkerEditPage />);

    const nameInput = await screen.findByTestId('name-input') as HTMLInputElement;
    const contactInput = screen.getByTestId('contact-input') as HTMLInputElement;

    expect(nameInput.value).toBe('山田 太郎');
    expect(contactInput.value).toBe('090-1234-5678');
  });

  it('SCR-008-TS-004: キャンセルボタンクリックで一覧画面に戻ること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<WorkerNewPage />);

    const cancelBtn = await screen.findByTestId('cancel-btn');
    fireEvent.click(cancelBtn);

    expect(mockPush).toHaveBeenCalledWith('/workers');
  });

  it('SCR-008-TS-006: 新規登録が成功して一覧画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<WorkerNewPage />);

    const nameInput = await screen.findByTestId('name-input');
    const contactInput = screen.getByTestId('contact-input');
    const submitBtn = screen.getByTestId('submit-btn');

    fireEvent.change(nameInput, { target: { value: '佐藤 花子' } });
    fireEvent.change(contactInput, { target: { value: '080-9876-5432' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/workers');
    });
  });

  it('SCR-008-TS-007: 編集登録が成功して一覧画面へ遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    render(<WorkerEditPage />);

    const nameInput = await screen.findByTestId('name-input');
    const submitBtn = screen.getByTestId('submit-btn');

    fireEvent.change(nameInput, { target: { value: '山田 次郎' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/workers');
    });
  });
});
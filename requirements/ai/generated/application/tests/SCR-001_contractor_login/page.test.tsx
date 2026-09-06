import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LoginPage from '@/app/(auth)/login/page';
import { initDB } from '@/lib/db';

import 'fake-indexeddb/auto';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      prefetch: () => null,
    };
  },
}));

const mockFetch = vi.fn();
window.fetch = mockFetch;

describe('外注先ログイン画面 (SCR-001)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();

    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'valid_contractor',
      password_hash: 'correct_password',
      display_name: '外注先管理者A',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00',
    });
    await tx.done;
    db.close();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          {
            user_id: 'usr-001',
            contractor_id: 'con-001',
            role: 'CONTRACTOR_MANAGER',
            login_id: 'valid_contractor',
            password_hash: 'correct_password',
            display_name: '外注先管理者A',
            status: 'ACTIVE',
            created_at: '2026-04-13T00:00:00+09:00',
            updated_at: '2026-04-13T00:00:00+09:00',
          },
        ],
      }),
    });
  });

  it('初期表示でID入力欄・パスワード入力欄・ログインボタンが配置されていること', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('ログインID')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('未入力で送信したときにバリデーションエラーが発生すること', async () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ログインIDを入力してください。')).toBeInTheDocument();
      expect(screen.getByText('パスワードを入力してください。')).toBeInTheDocument();
    });
  });

  it('不正な認証情報を入力したときに認証エラーメッセージが表示されること', async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText('ログインID');
    const passInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'unknown_user' } });
    fireEvent.change(passInput, { target: { value: 'bad_password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('IDまたはパスワードが正しくありません。')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('正しい認証情報を入力してログインすると、sessionStorageに値が格納され、/homeへ遷移すること', async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText('ログインID');
    const passInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'valid_contractor' } });
    fireEvent.change(passInput, { target: { value: 'correct_password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(sessionStorage.getItem('user_id')).toBe('usr-001');
      expect(sessionStorage.getItem('role')).toBe('CONTRACTOR_MANAGER');
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });
});
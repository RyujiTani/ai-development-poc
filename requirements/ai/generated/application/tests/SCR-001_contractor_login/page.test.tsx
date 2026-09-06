import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '@/app/(auth)/login/page';
import { getDB } from '@/lib/db';
import 'fake-indexeddb/auto';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LoginPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    const db = await getDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').clear();
    await tx.objectStore('users').put({
      user_id: 'user-1',
      contractor_id: 'contractor-1',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'valid_contractor_manager',
      password_hash: 'Y29ycmVjdF9wYXNzd29yZA==', // btoa('correct_password')
      display_name: '外注先 太郎',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    });
    await tx.done;
  });

  it('TST-SCR-001-001: ID必須エラー文言が画面上に描画されること', async () => {
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText('パスワードを入力してください');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(passwordInput, { target: { value: 'any_password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('IDを入力してください')).toBeInTheDocument();
    });
  });

  it('TST-SCR-001-002: パスワード必須エラー文言が画面上に描画されること', async () => {
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText('IDを入力してください');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'any_user' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
    });
  });

  it('TST-SCR-001-003: 誤ったログイン情報で認証エラーメッセージが表示されること', async () => {
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText('IDを入力してください');
    const passwordInput = screen.getByPlaceholderText('パスワードを入力してください');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'wrong_user' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('IDまたはパスワードが正しくありません')).toBeInTheDocument();
    });
  });

  it('TST-SCR-001-004: 正しいログイン情報でsessionStorageに情報がセットされ、ホームへ遷移すること', async () => {
    render(<LoginPage />);

    const idInput = screen.getByPlaceholderText('IDを入力してください');
    const passwordInput = screen.getByPlaceholderText('パスワードを入力してください');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'valid_contractor_manager' } });
    fireEvent.change(passwordInput, { target: { value: 'correct_password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(sessionStorage.getItem('user_id')).toBe('user-1');
      expect(sessionStorage.getItem('role')).toBe('CONTRACTOR_MANAGER');
      expect(sessionStorage.getItem('contractor_id')).toBe('contractor-1');
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });
});
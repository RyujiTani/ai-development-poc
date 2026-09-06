import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';
import 'fake-indexeddb/auto';
import { initDB } from '@/lib/db/indexedDB';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

describe('SCR-001_contractor_login', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
    }

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ contractors: [], users: [] }),
      })
    ) as any;

    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'c1-uuid',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
    });
    await tx.done;
  });

  it('TST-SCR-001-001: IDが未入力の状態でログインボタンを押下した場合、必須入力エラーが表示される', async () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(await screen.findByText('IDを入力してください')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('TST-SCR-001-002: パスワードが未入力の状態でログインボタンを押下した場合、必須入力エラーが表示される', async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText('ログインID');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'subcon1' } });
    fireEvent.click(submitButton);

    expect(await screen.findByText('パスワードを入力してください')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('TST-SCR-001-003: 登録されていないユーザー情報を入力した場合、認証エラーが表示される', async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText('ログインID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'invalid_user' } });
    fireEvent.change(passwordInput, { target: { value: 'invalid_pass' } });
    fireEvent.click(submitButton);

    expect(await screen.findByText('IDまたはパスワードが正しくありません')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('TST-SCR-001-004 / TST-SCR-001-005: 正しいログイン情報でログイン成功し、sessionStorageが保存され遷移する', async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText('ログインID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'subcon1' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor/home');
    });

    expect(window.sessionStorage.getItem('user_id')).toBe('u1-uuid');
    expect(window.sessionStorage.getItem('role')).toBe('CONTRACTOR_MANAGER');
    expect(window.sessionStorage.getItem('contractor_id')).toBe('c1-uuid');
  });
});
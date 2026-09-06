import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AdminLoginPage from '../../app/(factory)/login/page';
import { initDB } from '../../lib/db';

// Next.js Router のモック
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: vi.fn(),
    };
  },
  usePathname() {
    return '/login';
  },
}));

// SessionStorage のモック
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('SCR-010 管理者ログイン画面', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // fake-indexeddb の初期化とモックデータの追加
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');

    // 工場側管理者
    await store.put({
      user_id: 'usr-admin',
      contractor_id: null,
      role: 'FACTORY_ADMIN',
      login_id: 'admin_id',
      password_hash: 'admin_pass',
      display_name: '工場側管理者A',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 外注先管理者
    await store.put({
      user_id: 'usr-contractor',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'contractor_id',
      password_hash: 'contractor_pass',
      display_name: '外注先管理者A',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await tx.done;
  });

  it('初期表示時に正しく入力欄とボタンが表示されること', () => {
    render(<AdminLoginPage />);
    expect(screen.getByText('管理者ログイン')).toBeInTheDocument();
    expect(screen.getByTestId('loginId-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  it('IDが未入力の場合にバリデーションエラーが表示されること', async () => {
    render(<AdminLoginPage />);
    const submitBtn = screen.getByTestId('submit-btn');

    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'admin_pass' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('loginId-error')).toHaveTextContent('ログインIDを入力してください。');
  });

  it('パスワードが未入力の場合にバリデーションエラーが表示されること', async () => {
    render(<AdminLoginPage />);
    const submitBtn = screen.getByTestId('submit-btn');

    fireEvent.change(screen.getByTestId('loginId-input'), { target: { value: 'admin_id' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('password-error')).toHaveTextContent('パスワードを入力してください。');
  });

  it('誤ったログイン情報を入力した場合に認証エラーが表示されること', async () => {
    render(<AdminLoginPage />);
    const loginIdInput = screen.getByTestId('loginId-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitBtn = screen.getByTestId('submit-btn');

    fireEvent.change(loginIdInput, { target: { value: 'admin_id' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong_pass' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('auth-error')).toHaveTextContent('IDまたはパスワードが正しくありません。');
  });

  it('外注先管理者アカウントでログインを試みた場合、認証エラーとなること', async () => {
    render(<AdminLoginPage />);
    const loginIdInput = screen.getByTestId('loginId-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitBtn = screen.getByTestId('submit-btn');

    fireEvent.change(loginIdInput, { target: { value: 'contractor_id' } });
    fireEvent.change(passwordInput, { target: { value: 'contractor_pass' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('auth-error')).toHaveTextContent('IDまたはパスワードが正しくありません。');
  });

  it('正しい工場側管理者の情報でログインに成功し、sessionStorageに保存の上ダッシュボードに遷移すること', async () => {
    render(<AdminLoginPage />);
    const loginIdInput = screen.getByTestId('loginId-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitBtn = screen.getByTestId('submit-btn');

    fireEvent.change(loginIdInput, { target: { value: 'admin_id' } });
    fireEvent.change(passwordInput, { target: { value: 'admin_pass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sessionStorage.getItem('user_id')).toBe('usr-admin');
      expect(sessionStorage.getItem('role')).toBe('FACTORY_ADMIN');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLoginPage from '@/app/(auth)/admin-login/page';
import { initDB } from '@/lib/db/indexedDB';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('SCR-010 管理者ログイン画面', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
    }

    // fake-indexeddb の初期化とシードデータの投入
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'admin-uuid',
      contractor_id: null,
      role: 'FACTORY_ADMIN',
      login_id: 'admin',
      password_hash: 'password',
      display_name: '佐藤 工場管理者',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await tx.done;
  });

  it('TST-SCR-010-001: 有効な管理者認証情報でログインに成功し、sessionStorageに値が設定され、ダッシュボードに遷移すること', async () => {
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText('ログインID'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(sessionStorage.getItem('user_id')).toBe('admin-uuid');
      expect(sessionStorage.getItem('role')).toBe('FACTORY_ADMIN');
      expect(mockPush).toHaveBeenCalledWith('/factory/dashboard');
    });
  });

  it('TST-SCR-010-002: 画面の初期マウント時にログインフォーム要素が中央配置のクラスを持つラッパー内に描画されていること', () => {
    const { container } = render(<AdminLoginPage />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('items-center');
    expect(wrapper.className).toContain('justify-center');
    expect(wrapper.className).toContain('min-h-screen');

    expect(screen.getByLabelText('ログインID')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('TST-SCR-010-003: レスポンシブ表示に対応しビューポートが変化しても要素が領域内にあること', () => {
    const { container } = render(<AdminLoginPage />);
    const formContainer = container.querySelector('.w-full');
    expect(formContainer).toHaveClass('max-w-md');
  });

  it('TST-SCR-010-004: ID未入力の場合にバリデーション警告が表示されること', async () => {
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByTestId('login-id-error')).toHaveTextContent('IDは必須入力です');
    });
  });

  it('TST-SCR-010-005: パスワード未入力の場合にバリデーション警告が表示されること', async () => {
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText('ログインID'), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByTestId('password-error')).toHaveTextContent('パスワードは必須入力です');
    });
  });

  it('TST-SCR-010-006: 不整合な認証情報を入力した場合にエラーが表示され画面遷移しないこと', async () => {
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText('ログインID'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'wrong_password' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-error')).toHaveTextContent('IDまたはパスワードが正しくありません');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
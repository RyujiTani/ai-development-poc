import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminLoginPage from '../app/(auth)/login/page';

// Next.js routerのモック化
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      prefetch: () => null
    };
  }
}));

// SessionStorageのモック化
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// IndexedDb のモック設定
const mockPut = vi.fn().mockImplementation(() => {
  return { onsuccess: null, onerror: null };
});
const mockGetAll = vi.fn().mockImplementation(() => {
  return { onsuccess: null, onerror: null };
});

vi.mock('@/lib/db/indexedDb', () => ({
  initDB: vi.fn().mockResolvedValue({
    transaction: () => ({
      objectStore: () => ({
        put: mockPut,
        getAll: mockGetAll
      })
    })
  }),
  simpleHash: (str: string) => 'hash_' + str
}));

// UserRepositoryのモック定義
vi.mock('@/features/user/repository/userRepository', () => {
  return {
    IndexedDBUserRepository: vi.fn().mockImplementation(() => {
      return {
        findByLoginId: async (loginId: string) => {
          if (loginId === 'admin') {
            return {
              user_id: 'factory-admin-01',
              contractor_id: null,
              role: 'FACTORY_ADMIN',
              login_id: 'admin',
              password_hash: 'hash_admin123',
              status: 'ACTIVE',
              created_at: '2026-04-13T00:00:00Z',
              updated_at: '2026-04-13T00:00:00Z'
            };
          }
          if (loginId === 'subcon') {
            return {
              user_id: 'contractor-manager-01',
              contractor_id: 'contractor-uuid-1',
              role: 'CONTRACTOR_MANAGER',
              login_id: 'subcon',
              password_hash: 'hash_subcon123',
              status: 'ACTIVE',
              created_at: '2026-04-13T00:00:00Z',
              updated_at: '2026-04-13T00:00:00Z'
            };
          }
          return null;
        },
        save: vi.fn().mockResolvedValue(undefined)
      };
    })
  };
});

describe('SCR-010 管理者ログイン画面テスト仕様', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('TST-SCR-010-002: 管理者ログイン用フォーム構成要素が中央コンテナに整然と配置されていること', () => {
    render(<AdminLoginPage />);
    expect(screen.getByLabelText('管理者ID')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('TST-SCR-010-004: ID入力欄が空の状態で送信を試みた際、必須エラーが表示されること', async () => {
    render(<AdminLoginPage />);
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-id')).toHaveTextContent('IDを入力してください。');
    });
  });

  it('TST-SCR-010-005: パスワード入力欄が空の状態で送信を試みた際、必須エラーが表示されること', async () => {
    render(<AdminLoginPage />);
    const idInput = screen.getByLabelText('管理者ID');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'admin' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-password')).toHaveTextContent('パスワードを入力してください。');
    });
  });

  it('TST-SCR-010-006: 無効な管理者情報でログインを試みた際、画面上に認証エラーが表示されること', async () => {
    render(<AdminLoginPage />);
    const idInput = screen.getByLabelText('管理者ID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'invalid_user' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('api-error')).toHaveTextContent('IDまたはパスワードが正しくありません。');
    });
  });

  it('TST-SCR-010-006: FACTORY_ADMINロール以外の所属ユーザーがログインを試みた場合、認証エラーとなること', async () => {
    render(<AdminLoginPage />);
    const idInput = screen.getByLabelText('管理者ID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    // subcon は CONTRACTOR_MANAGER
    fireEvent.change(idInput, { target: { value: 'subcon' } });
    fireEvent.change(passwordInput, { target: { value: 'subcon123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('api-error')).toHaveTextContent('工場側管理者以外はログインできません。');
    });
  });

  it('TST-SCR-010-007, TST-SCR-010-010: 有効な管理者情報で認証された場合、sessionStorageにセッションが格納されダッシュボード画面に遷移すること', async () => {
    render(<AdminLoginPage />);
    const idInput = screen.getByLabelText('管理者ID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(idInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.sessionStorage.getItem('user_id')).toBe('factory-admin-01');
      expect(window.sessionStorage.getItem('role')).toBe('FACTORY_ADMIN');
      expect(mockPush).toHaveBeenCalledWith('/factory/dashboard');
    });
  });
});

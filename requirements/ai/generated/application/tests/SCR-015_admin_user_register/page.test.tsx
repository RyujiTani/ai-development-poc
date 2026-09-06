import 'fake-indexeddb/auto';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { initDB } from '@/lib/db/indexedDB';
import AdminUsersPage from '@/app/(factory)/users/page';

// ルーターとナビゲーションのモック
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
  usePathname() {
    return '/factory/users';
  },
}));

// SessionStorageのモック
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

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('SCR-015_admin_user_register - 管理者ユーザー登録画面の検証', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorageMock.clear();

    // インメモリの IndexedDB 構造クリアとテスト用のデータシード
    const db = await initDB();

    // Contractors 初期データ準備
    const txCont = db.transaction('contractors', 'readwrite');
    await txCont.objectStore('contractors').put({
      contractor_id: 'test-c1-uuid',
      name: 'テスト外注先企業 A',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await txCont.objectStore('contractors').put({
      contractor_id: 'test-c2-uuid',
      name: 'テスト外注先企業 B',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await txCont.done;

    // Users 初期データ準備
    const txUser = db.transaction('users', 'readwrite');
    await txUser.objectStore('users').put({
      user_id: 'admin-01',
      contractor_id: null,
      role: 'FACTORY_ADMIN',
      login_id: 'main_admin',
      password_hash: 'admin123',
      display_name: '管理者 佐藤',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await txUser.objectStore('users').put({
      user_id: 'subcon-01',
      contractor_id: 'test-c1-uuid',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'sub_tanaka',
      password_hash: 'subcon123',
      display_name: '田中 職長',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await txUser.done;
  });

  it('[TST-SCR-015-001] 工場側管理者でログイン中、登録ユーザー一覧が正しく取得されて表示されること', async () => {
    sessionStorageMock.setItem('user_id', 'admin-01');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    render(<AdminUsersPage />);

    // 認証が成功し画面が表示されるのを待つ
    await screen.findByText('管理者ユーザー登録');
    // その後、読み込み中表示が消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByTestId('loading-text')).toBeNull();
    });

    // ユーザー情報がテーブル（およびカード）に存在するかの確認
    expect(screen.getAllByText('管理者 佐藤')[0]).toBeInTheDocument();
    expect(screen.getAllByText('田中 職長')[0]).toBeInTheDocument();
    expect(screen.getByText('main_admin')).toBeInTheDocument();
    expect(screen.getByText('sub_tanaka')).toBeInTheDocument();
    expect(screen.getByText('テスト外注先企業 A')).toBeInTheDocument();
  });

  it('[TST-SCR-015-002] 新規登録時に未入力項目がある場合に適切なエラーメッセージが表示されること', async () => {
    sessionStorageMock.setItem('user_id', 'admin-01');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    render(<AdminUsersPage />);

    await screen.findByText('管理者ユーザー登録');
    await waitFor(() => {
      expect(screen.queryByTestId('loading-text')).toBeNull();
    });

    // 新規登録ボタンをクリック
    const addBtn = screen.getByTestId('add-user-btn');
    fireEvent.click(addBtn);

    // モーダルオープン確認
    expect(screen.getByTestId('modal-title')).toHaveTextContent('管理者ユーザーの新規登録');

    // 空の状態で保存
    const saveBtn = screen.getByTestId('modal-save-btn');
    fireEvent.click(saveBtn);

    // バリデーションエラー検証
    await waitFor(() => {
      expect(screen.getByTestId('user-id-error')).toHaveTextContent('ユーザーIDは必須入力です');
      expect(screen.getByTestId('login-id-error')).toHaveTextContent('ログインIDは必須入力です');
      expect(screen.getByTestId('password-error')).toHaveTextContent('パスワードは必須入力です');
      expect(screen.getByTestId('display-name-error')).toHaveTextContent('表示名は必須入力です');
    });
  });

  it('[TST-SCR-015-003] 外注先管理者を選択した際、所属外注先企業が必須選択になること', async () => {
    sessionStorageMock.setItem('user_id', 'admin-01');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    render(<AdminUsersPage />);

    await screen.findByText('管理者ユーザー登録');
    await waitFor(() => {
      expect(screen.queryByTestId('loading-text')).toBeNull();
    });

    const addBtn = screen.getByTestId('add-user-btn');
    fireEvent.click(addBtn);

    // 外注先管理者のラジオボタンを選択
    const contractorRadio = screen.getByTestId('role-contractor-radio');
    fireEvent.click(contractorRadio);

    // 企業選択プルダウンが出現していること
    expect(screen.getByTestId('contractor-select')).toBeInTheDocument();

    // 企業を選択しないまま保存ボタンをクリック
    const saveBtn = screen.getByTestId('modal-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('contractor-error')).toHaveTextContent('所属外注先企業は必須です');
    });
  });

  it('[TST-SCR-015-004] 正常な入力パラメータで新規管理者ユーザーが登録できること', async () => {
    sessionStorageMock.setItem('user_id', 'admin-01');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    render(<AdminUsersPage />);

    await screen.findByText('管理者ユーザー登録');
    await waitFor(() => {
      expect(screen.queryByTestId('loading-text')).toBeNull();
    });

    fireEvent.click(screen.getByTestId('add-user-btn'));

    // フィールドに入力
    fireEvent.change(screen.getByTestId('user-id-input'), { target: { value: 'new_admin_99' } });
    fireEvent.change(screen.getByTestId('login-id-input'), { target: { value: 'login_99' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'pass999' } });
    fireEvent.change(screen.getByTestId('display-name-input'), { target: { value: '新規テスト管理者' } });

    // 工場側管理者（デフォルト）の状態で保存
    fireEvent.click(screen.getByTestId('modal-save-btn'));

    // 登録完了後に、一覧がリロードされて追加された表示名が存在することを確認
    await waitFor(() => {
      expect(screen.getAllByText('新規テスト管理者')[0]).toBeInTheDocument();
      expect(screen.getByTestId('toast-notification')).toHaveTextContent('新規ユーザーを登録しました');
    });
  });

  it('[TST-SCR-015-005] 既存のユーザー情報を編集して更新できること', async () => {
    sessionStorageMock.setItem('user_id', 'admin-01');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    render(<AdminUsersPage />);

    await screen.findByText('管理者ユーザー登録');
    await waitFor(() => {
      expect(screen.queryByTestId('loading-text')).toBeNull();
    });

    // 「田中 職長」の編集ボタンをクリック
    const editBtn = screen.getByTestId('edit-btn-subcon-01');
    fireEvent.click(editBtn);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('管理者ユーザー情報の編集');

    // 表示名を「田中 職長(更新)」に変更
    const nameInput = screen.getByTestId('display-name-input');
    fireEvent.change(nameInput, { target: { value: '田中 職長(更新)' } });

    // 保存
    fireEvent.click(screen.getByTestId('modal-save-btn'));

    // 更新結果の検証
    await waitFor(() => {
      expect(screen.getAllByText('田中 職長(更新)')[0]).toBeInTheDocument();
      expect(screen.getByTestId('toast-notification')).toHaveTextContent('ユーザー情報を更新しました');
    });
  });

  it('[TST-SCR-015-006] ユーザーを削除した際、一覧から消失すること (ただし自分自身は削除不可)', async () => {
    sessionStorageMock.setItem('user_id', 'admin-01');
    sessionStorageMock.setItem('role', 'FACTORY_ADMIN');

    // confirm ダイアログを True としてモック
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<AdminUsersPage />);

    await screen.findByText('管理者ユーザー登録');
    await waitFor(() => {
      expect(screen.queryByTestId('loading-text')).toBeNull();
    });

    // 自分自身の削除ボタンが非活性であることを確認
    const selfDeleteBtn = screen.getByTestId('delete-btn-admin-01');
    expect(selfDeleteBtn).toBeDisabled();

    // 他のユーザーの削除ボタンをクリック
    const targetDeleteBtn = screen.getByTestId('delete-btn-subcon-01');
    fireEvent.click(targetDeleteBtn);

    expect(confirmSpy).toHaveBeenCalled();

    // 削除が完了して一覧から消えていることを検証
    await waitFor(() => {
      expect(screen.queryByText('田中 職長')).toBeNull();
      expect(screen.getByTestId('toast-notification')).toHaveTextContent('ユーザーを削除しました');
    });

    confirmSpy.mockRestore();
  });

  it('[TST-SCR-015-007] 未認証状態、または外注先管理者の場合にログイン画面へ自動リダイレクトされること', async () => {
    // FACTORY_ADMIN ではない権限でアクセス
    sessionStorageMock.setItem('user_id', 'subcon-01');
    sessionStorageMock.setItem('role', 'CONTRACTOR_MANAGER');

    render(<AdminUsersPage />);

    // リダイレクトされることを確認
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin-login');
    });
  });
});
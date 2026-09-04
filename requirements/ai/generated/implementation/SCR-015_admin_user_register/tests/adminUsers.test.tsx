import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminUserRegisterPage from '../app/(factory)/admin-users/page.tsx';
import { UserRepository, setUserRepository } from '../features/user/repository/userRepository';
import { ContractorRepository, setContractorRepository } from '../features/contractor/repository/contractorRepository';
import { setSession, clearSession } from '../lib/auth/mockAuth';

// router mock setup with stable reference to avoid infinite rendering loops
const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
  };
  return {
    mockPush,
    mockRouter,
  };
});

vi.mock('next/navigation', () => ({
  useRouter() {
    return mockRouter;
  },
}));

// mock database classes
class MockUserRepository implements UserRepository {
  private usersList = [
    {
      user_id: 'admin_test_1',
      login_id: 'admin_test_1',
      contractor_id: null,
      role: 'FACTORY_ADMIN' as const,
      password_hash: 'hash1',
      display_name: 'テスト管理者1',
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      user_id: 'manager_test_1',
      login_id: 'manager_test_1',
      contractor_id: 'c1',
      role: 'CONTRACTOR_MANAGER' as const,
      password_hash: 'hash2',
      display_name: 'テスト企業担当者1',
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  async getUsers() {
    return [...this.usersList];
  }
  async createUser(user: any) {
    this.usersList.push(user);
  }
  async updateUser(user: any) {
    const idx = this.usersList.findIndex(u => u.user_id === user.user_id);
    if (idx !== -1) {
      this.usersList[idx] = user;
    }
  }
  async deleteUser(userId: string) {
    const idx = this.usersList.findIndex(u => u.user_id === userId);
    if (idx !== -1) {
      this.usersList[idx].status = 'DISABLED';
    }
  }
  async userExists(loginId: string) {
    return this.usersList.some(u => u.login_id === loginId);
  }
}

class MockContractorRepository implements ContractorRepository {
  async getContractors() {
    return [
      {
        contractor_id: 'c1',
        name: '大和建設株式会社',
        status: 'ACTIVE' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }
}

describe('SCR-015: 管理者ユーザー登録画面テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    setUserRepository(null);
    setContractorRepository(null);
  });

  it('TS-015-001: 正常なセッションを持つ工場側管理者がアクセスした際、ユーザー一覧が正しくテーブルに表示されること', async () => {
    setUserRepository(new MockUserRepository());
    setContractorRepository(new MockContractorRepository());

    setSession({
      user_id: 'admin_test_1',
      login_id: 'admin_test_1',
      display_name: 'テスト管理者1',
      role: 'FACTORY_ADMIN',
    });

    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.getAllByText('テスト管理者1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('テスト企業担当者1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('大和建設株式会社').length).toBeGreaterThan(0);
    });
  });

  it('TS-015-002: 未認証セッション、または権限がないアカウントでアクセスした場合、ログイン画面へリダイレクトされること', async () => {
    setUserRepository(new MockUserRepository());
    setContractorRepository(new MockContractorRepository());

    // セッションなし
    render(<AdminUserRegisterPage />);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TS-015-003: 「新規登録」ボタンを押下してモーダルを開き、無効な値を入力するとバリデーションエラーが発生し、有効な値を保存するとユーザーが登録されること', async () => {
    const userRepo = new MockUserRepository();
    setUserRepository(userRepo);
    setContractorRepository(new MockContractorRepository());

    setSession({
      user_id: 'admin_test_1',
      login_id: 'admin_test_1',
      display_name: 'テスト管理者1',
      role: 'FACTORY_ADMIN',
    });

    render(<AdminUserRegisterPage />);

    // 「新規登録」ボタン押下
    const createBtn = await screen.findByTestId('btn-create-user');
    fireEvent.click(createBtn);

    // モーダルが展開されていること
    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();

    // 空の値で「保存」を押して、エラーが出ることを検証
    const saveBtn = screen.getByText('保存');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('error-loginId')).toHaveTextContent('ユーザーIDは必須入力です。');
      expect(screen.getByTestId('error-displayName')).toHaveTextContent('表示名は必須入力です。');
      expect(screen.getByTestId('error-password')).toHaveTextContent('新規登録時はパスワードが必須です。');
    });

    // 正常な値のインプット
    const idInput = screen.getByPlaceholderText('ユーザーIDを入力');
    const nameInput = screen.getByPlaceholderText('表示名（氏名等）を入力');
    const passInput = screen.getByPlaceholderText('パスワードを入力');

    fireEvent.change(idInput, { target: { value: 'new_test_admin' } });
    fireEvent.change(nameInput, { target: { value: '新規テスト管理者' } });
    fireEvent.change(passInput, { target: { value: 'testpass123' } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('新規テスト管理者').length).toBeGreaterThan(0);
    });
  });

  it('TS-015-004: モーダルにおいて「外注先管理者」に変更した際、所属外注先企業選択欄が表示され、未選択時にはエラーが発生すること', async () => {
    setUserRepository(new MockUserRepository());
    setContractorRepository(new MockContractorRepository());

    setSession({
      user_id: 'admin_test_1',
      login_id: 'admin_test_1',
      display_name: 'テスト管理者1',
      role: 'FACTORY_ADMIN',
    });

    render(<AdminUserRegisterPage />);

    // 新規登録モーダルを開く
    const createBtn = await screen.findByTestId('btn-create-user');
    fireEvent.click(createBtn);

    // 権限を「外注先管理者」に切り替える
    const label = screen.getByText(/権限種別/);
    const roleSelect = label.parentElement?.querySelector('select') as HTMLSelectElement;
    fireEvent.change(roleSelect, { target: { value: 'CONTRACTOR_MANAGER' } });

    // 所属外注先企業の選択フィールドが表示されていること
    expect(screen.getByTestId('contractor-select-wrapper')).toBeInTheDocument();

    // 企業未選択のまま保存して、エラーが出ることを確認
    const saveBtn = screen.getByText('保存');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('error-contractorId')).toHaveTextContent(
        '外注先管理者の場合は所属外注先企業の選択が必須です。'
      );
    });
  });

  it('TS-015-005: 既存のユーザー行の「編集」を押下した際、情報が正しくロードされ、編集保存ができること', async () => {
    setUserRepository(new MockUserRepository());
    setContractorRepository(new MockContractorRepository());

    setSession({
      user_id: 'admin_test_1',
      login_id: 'admin_test_1',
      display_name: 'テスト管理者1',
      role: 'FACTORY_ADMIN',
    });

    render(<AdminUserRegisterPage />);

    // 「編集」ボタンを取得してクリック
    await waitFor(async () => {
      const row = screen.getByText('テスト企業担当者1').closest('tr');
      const editBtn = within(row!).getByText('編集');
      fireEvent.click(editBtn);
    });

    // モーダル表示かつ値が投入されていることをアサーション
    expect(screen.getByPlaceholderText('表示名（氏名等）を入力')).toHaveValue('テスト企業担当者1');

    // 編集
    const nameInput = screen.getByPlaceholderText('表示名（氏名等）を入力');
    fireEvent.change(nameInput, { target: { value: '更新後テスト担当者' } });

    const saveBtn = screen.getByText('保存');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('更新後テスト担当者').length).toBeGreaterThan(0);
    });
  });

  it('TS-015-006: ユーザー行の「削除」を押下した際、確認ダイアログの挙動によって適切に無効化（DISABLEDへの更新）が走ること', async () => {
    setUserRepository(new MockUserRepository());
    setContractorRepository(new MockContractorRepository());

    setSession({
      user_id: 'admin_test_1',
      login_id: 'admin_test_1',
      display_name: 'テスト管理者1',
      role: 'FACTORY_ADMIN',
    });

    // window.confirm で最初は「キャンセル」を選択
    window.confirm = vi.fn().mockReturnValueOnce(false);

    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      const row = screen.getByText('テスト企業担当者1').closest('tr');
      const deleteBtn = within(row!).getByText('削除');
      fireEvent.click(deleteBtn);
    });

    // キャンセル時はステータスがDISABLED（無効）に変化していない（PC用 2つ + スマホ用 2つ）
    await waitFor(() => {
      const statusBadges = screen.getAllByText('ACTIVE');
      expect(statusBadges.length).toBe(4);
    });

    // 次に window.confirm で「OK」を選択
    window.confirm = vi.fn().mockReturnValueOnce(true);
    const row = screen.getByText('テスト企業担当者1').closest('tr');
    const deleteBtn = within(row!).getByText('削除');
    fireEvent.click(deleteBtn);

    // OK選択時に該当ユーザーがDISABLEDに更新されること
    await waitFor(() => {
      expect(screen.getAllByText('DISABLED').length).toBeGreaterThan(0);
    });
  });
});
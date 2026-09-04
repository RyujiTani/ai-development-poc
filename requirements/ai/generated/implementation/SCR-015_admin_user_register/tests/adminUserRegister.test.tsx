import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AdminUserRegisterPage from '@/app/(factory)/admin-user-register/page';
import { setSession } from '@/lib/auth/mockAuth';

// router mock の hoisted 処理
const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('SCR-015 管理者ユーザー登録画面 テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで FACTORY_ADMIN のセッション情報を設定
    setSession({
      user_id: 'admin-test',
      role: 'FACTORY_ADMIN',
      display_name: '工場テスト管理者',
    });
  });

  it('TS-SCR-015-001: 正常表示 (初期ユーザー一覧のレンダリング)', async () => {
    render(<AdminUserRegisterPage />);

    // 画面ローディング完了を待機
    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 画面の見出しが表示されていること
    expect(screen.getByText('管理者ユーザー登録')).toBeInTheDocument();

    // モックDBにある初期ユーザー情報が含まれること（非异步データ取得の完了を待つ）
    await waitFor(() => {
      expect(screen.getByText('admin-1')).toBeInTheDocument();
    });
    expect(screen.getByText('工場管理者 鈴木')).toBeInTheDocument();
    expect(screen.getByText('contractor-admin-1')).toBeInTheDocument();
  });

  it('TS-SCR-015-002: 工場側管理者アカウントの正常新規登録', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 初期データロードを待つ
    await waitFor(() => {
      expect(screen.getByText('admin-1')).toBeInTheDocument();
    });

    // 「新規ユーザー登録」ボタン押下
    const createBtn = screen.getByText('新規ユーザー登録');
    fireEvent.click(createBtn);

    // 新規登録モーダルが起動
    expect(screen.getByText('管理者ユーザー新規登録')).toBeInTheDocument();

    // 必要項目の入力
    fireEvent.change(screen.getByLabelText(/ユーザーID/i), { target: { value: 'new-admin-99' } });
    fireEvent.change(screen.getByLabelText(/ログインID/i), { target: { value: 'new-login-99' } });
    fireEvent.change(screen.getByLabelText(/表示名/i), { target: { value: '工場テスト管理者' } });
    fireEvent.change(screen.getByLabelText(/パスワード/i), { target: { value: 'password123' } });

    // 工場側管理者(FACTORY_ADMIN)の場合、所属企業選択が存在しない（非表示である）ことをアサーション
    expect(screen.queryByLabelText(/所属外注先企業/i)).toBeNull();

    // 保存
    const saveBtn = screen.getByText('保存する');
    fireEvent.click(saveBtn);

    // 非同期でのモーダルのクローズと一覧の更新を待つ
    await waitFor(() => {
      expect(screen.queryByText('管理者ユーザー新規登録')).toBeNull();
      expect(screen.getByText('new-admin-99')).toBeInTheDocument();
    });

    // リストに新規ユーザーが追加されていること
    expect(screen.getByText('工場テスト管理者')).toBeInTheDocument();
  });

  it('TS-SCR-015-003: 外注先管理者アカウントの正常新規発行', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 初期データロードを待つ
    await waitFor(() => {
      expect(screen.getByText('admin-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新規ユーザー登録'));

    fireEvent.change(screen.getByLabelText(/ユーザーID/i), { target: { value: 'new-con-88' } });
    fireEvent.change(screen.getByLabelText(/ログインID/i), { target: { value: 'new-login-88' } });
    fireEvent.change(screen.getByLabelText(/表示名/i), { target: { value: '外注先テスト管理者' } });
    fireEvent.change(screen.getByLabelText(/パスワード/i), { target: { value: 'password123' } });

    // 権限種別を「外注先管理者」に変更
    fireEvent.change(screen.getByLabelText(/権限種別/i), { target: { value: 'CONTRACTOR_MANAGER' } });

    // 動的に所属企業選択が表示されること
    expect(screen.getByLabelText(/所属外注先企業/i)).toBeInTheDocument();

    // 所属企業を選択
    fireEvent.change(screen.getByLabelText(/所属外注先企業/i), { target: { value: 'contractor-1' } });

    // 保存
    fireEvent.click(screen.getByText('保存する'));

    // 非同期での保存完了と、データ一覧への追加を待つ
    await waitFor(() => {
      expect(screen.queryByText('管理者ユーザー新規登録')).toBeNull();
      expect(screen.getByText('new-con-88')).toBeInTheDocument();
    });

    // 新たに登録されていること
    expect(screen.getByText('外注先テスト管理者')).toBeInTheDocument();
    expect(screen.getByText('株式会社アイウエオ工業')).toBeInTheDocument();
  });

  it('TS-SCR-015-004: 既存ユーザーアカウント情報の編集', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 初期データロードを待つ
    await waitFor(() => {
      expect(screen.getByText('admin-1')).toBeInTheDocument();
    });

    // 特定のユーザーの「編集」ボタンを探してクリック
    const editBtns = screen.getAllByText('編集');
    fireEvent.click(editBtns[0]); // 最初のユーザー (admin-1) の編集

    // モーダルが編集モードとして立ち上がる
    expect(screen.getByText('ユーザーアカウント情報編集')).toBeInTheDocument();

    // ユーザーID、ログインIDは編集不可能(disabled)であることを確認
    expect(screen.getByLabelText(/ユーザーID/i)).toBeDisabled();
    expect(screen.getByLabelText(/ログインID/i)).toBeDisabled();

    // 表示名を変更
    fireEvent.change(screen.getByLabelText(/表示名/i), { target: { value: '工場管理者 鈴木（変更済）' } });

    // 保存
    fireEvent.click(screen.getByText('保存する'));

    // 編集モーダルが閉じ、変更が反映されるのを待つ
    await waitFor(() => {
      expect(screen.queryByText('ユーザーアカウント情報編集')).toBeNull();
      expect(screen.getByText('工場管理者 鈴木（変更済）')).toBeInTheDocument();
    });
  });

  it('TS-SCR-015-005: ユーザーアカウントの削除（無効化）実行', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 初期データロードを待つ
    await waitFor(() => {
      expect(screen.getByText('contractor-admin-1')).toBeInTheDocument();
    });

    // 「削除」ボタンをクリック
    const deleteBtns = screen.getAllByText('削除');
    // 自身ではない他人のアカウント「contractor-admin-1」などを想定
    fireEvent.click(deleteBtns[1]);

    // 削除確認ダイアログが起動
    expect(screen.getByText('アカウントの削除確認')).toBeInTheDocument();

    // 削除を許可
    fireEvent.click(screen.getByText('削除する'));

    // 削除完了し、一覧から消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByText('アカウントの削除確認')).toBeNull();
      expect(screen.queryByText('contractor-admin-1')).toBeNull();
    });
  });

  it('TS-SCR-015-006: ユーザーIDの既存ID重複バリデーションエラー', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 既存データのロードを待つ
    await waitFor(() => {
      expect(screen.getByText('admin-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新規ユーザー登録'));

    // 既に存在するIDを入力
    fireEvent.change(screen.getByLabelText(/ユーザーID/i), { target: { value: 'admin-1' } });
    fireEvent.change(screen.getByLabelText(/ログインID/i), { target: { value: 'admin-1' } });
    fireEvent.change(screen.getByLabelText(/表示名/i), { target: { value: '重複テスト' } });
    fireEvent.change(screen.getByLabelText(/パスワード/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByText('保存する'));

    // 重複エラーが発生し、処理が中断すること
    await waitFor(() => {
      expect(screen.getByText('このユーザーIDは既に登録されています', { selector: 'p' })).toBeInTheDocument();
    });
  });

  it('TS-SCR-015-007: 新規登録時のパスワード必須バリデーションエラー', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 初期データロードを待つ
    await waitFor(() => {
      expect(screen.getByText('admin-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新規ユーザー登録'));

    fireEvent.change(screen.getByLabelText(/ユーザーID/i), { target: { value: 'new-user-77' } });
    fireEvent.change(screen.getByLabelText(/ログインID/i), { target: { value: 'new-login-77' } });
    fireEvent.change(screen.getByLabelText(/表示名/i), { target: { value: 'パスワード空テスト' } });
    // パスワードを意図的に入力しない

    fireEvent.click(screen.getByText('保存する'));

    await waitFor(() => {
      expect(screen.getByText('パスワードは必須項目です')).toBeInTheDocument();
    });
  });

  it('TS-SCR-015-008: 外注先管理者選択かつ所属企業未指定のバリデーションエラー', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 初期データロードを待つ
    await waitFor(() => {
      expect(screen.getByText('admin-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新規ユーザー登録'));

    fireEvent.change(screen.getByLabelText(/ユーザーID/i), { target: { value: 'new-user-66' } });
    fireEvent.change(screen.getByLabelText(/ログインID/i), { target: { value: 'new-login-66' } });
    fireEvent.change(screen.getByLabelText(/表示名/i), { target: { value: '企業未指定テスト' } });
    fireEvent.change(screen.getByLabelText(/パスワード/i), { target: { value: 'password123' } });

    // 権限を外注先管理者
    fireEvent.change(screen.getByLabelText(/権限種別/i), { target: { value: 'CONTRACTOR_MANAGER' } });

    // 企業を選択せず、保存する
    fireEvent.click(screen.getByText('保存する'));

    await waitFor(() => {
      expect(screen.getByText('外注先管理者の場合は、所属企業を選択してください')).toBeInTheDocument();
    });
  });

  it('TS-SCR-015-009: 権限不足/未認証時の管理者ログイン画面へのリダイレクト', async () => {
    // 権限種別が異なる (CONTRACTOR_MANAGER のアカウントでセッション書き換え)
    setSession({
      user_id: 'con-test',
      role: 'CONTRACTOR_MANAGER',
      display_name: '外注先管理者',
    });

    render(<AdminUserRegisterPage />);

    // リダイレクト処理が発火し、/login へ push されることを検証
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-SCR-015-010: 権限種別のトグル操作に連動する所属企業の動的表示確認', async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('認証状態を確認中...')).toBeNull();
    });

    // 初期データロードを待つ
    await waitFor(() => {
      expect(screen.getByText('admin-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新規ユーザー登録'));

    // 初期状態 (FACTORY_ADMIN) のため非表示
    expect(screen.queryByLabelText(/所属外注先企業/i)).toBeNull();

    // CONTRACTOR_MANAGER に変更
    fireEvent.change(screen.getByLabelText(/権限種別/i), { target: { value: 'CONTRACTOR_MANAGER' } });
    expect(screen.getByLabelText(/所属外注先企業/i)).toBeInTheDocument();

    // 再度 FACTORY_ADMIN に変更
    fireEvent.change(screen.getByLabelText(/権限種別/i), { target: { value: 'FACTORY_ADMIN' } });
    expect(screen.queryByLabelText(/所属外注先企業/i)).toBeNull();
  });
});
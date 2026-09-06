import "fake-indexeddb/auto";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminUserRegisterPage from "@/app/(factory)/users/page";
import { initializeDB } from "@/lib/db/indexedDB";

// Next.js の router モック化
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      replace: mockReplace,
      push: mockPush,
    };
  },
}));

describe("SCR-015: 管理者ユーザー登録画面", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // sessionStorageのモック化
    const sessionStorageStore: Record<string, string> = {
      user_id: "user-2", // 工場管理者 (FACTORY_ADMIN)
      role: "FACTORY_ADMIN",
    };
    
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => sessionStorageStore[key] || null,
      setItem: (key: string, value: string) => {
        sessionStorageStore[key] = value;
      },
      removeItem: (key: string) => {
        delete sessionStorageStore[key];
      },
      clear: () => {
        for (const key in sessionStorageStore) {
          delete sessionStorageStore[key];
        }
      },
    });

    // window.confirmのモック化
    vi.spyOn(window, "confirm").mockImplementation(() => true);

    // データベースを初期化・シード投入
    await initializeDB(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TS-015-001: 認証ガードが働き、非ログイン状態の場合に admin-login 画面へリダイレクトされること", async () => {
    // 未ログインにする
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("role");

    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin-login");
    });
  });

  it("TS-015-001: ログイン時はシード内にあるユーザーID、表示名、役割が画面上に正しく描画されていること", async () => {
    render(<AdminUserRegisterPage />);

    // 読み込み中表示の確認と待機
    await waitFor(() => {
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });

    // シードに含まれるユーザーの表示確認
    expect(await screen.findByText("seeded_contractor_manager")).toBeInTheDocument();
    expect(screen.getByText("外注先管理者 A")).toBeInTheDocument();
    expect(screen.getByText("factory_admin")).toBeInTheDocument();
    expect(screen.getByText("工場管理者")).toBeInTheDocument();
  });

  it("TS-015-002: 新規登録ボタンから「工場側管理者」を正しく登録でき、一覧に即時反映されること", async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });

    // 新規登録モーダル起動
    const addButton = screen.getByTestId("add-user-button");
    fireEvent.click(addButton);

    // モーダルが表示されたか確認
    expect(screen.getByTestId("user-modal")).toBeInTheDocument();

    // 入力
    fireEvent.change(screen.getByTestId("user-login-id-input"), {
      target: { value: "new_factory_admin_001" },
    });
    fireEvent.change(screen.getByTestId("user-display-name-input"), {
      target: { value: "新規テスト工場管理者" },
    });
    fireEvent.change(screen.getByTestId("user-password-input"), {
      target: { value: "password123" },
    });

    // 工場側管理者(FACTORY_ADMIN)を選択
    fireEvent.change(screen.getByTestId("user-role-select"), {
      target: { value: "FACTORY_ADMIN" },
    });

    // 保存
    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    // モーダルが閉じ、一覧に「新規テスト工場管理者」が表示されていること
    await waitFor(() => {
      expect(screen.queryByTestId("user-modal")).not.toBeInTheDocument();
    });

    expect(screen.getByText("new_factory_admin_001")).toBeInTheDocument();
    expect(screen.getByText("新規テスト工場管理者")).toBeInTheDocument();
  });

  it("TS-015-003: 外注先管理者を選択時、所属外注先企業を選択しないとエラーメッセージが出現すること", async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });

    // 新規登録モーダル起動
    const addButton = screen.getByTestId("add-user-button");
    fireEvent.click(addButton);

    // 入力
    fireEvent.change(screen.getByTestId("user-login-id-input"), {
      target: { value: "new_contractor_mgr_error" },
    });
    fireEvent.change(screen.getByTestId("user-display-name-input"), {
      target: { value: "外注先管理者B" },
    });
    fireEvent.change(screen.getByTestId("user-password-input"), {
      target: { value: "password123" },
    });

    // 役割を外注先管理者(CONTRACTOR_MANAGER)に変更
    fireEvent.change(screen.getByTestId("user-role-select"), {
      target: { value: "CONTRACTOR_MANAGER" },
    });

    // 動的に所属企業セレクトボックスが表示される
    expect(await screen.findByTestId("user-contractor-select")).toBeInTheDocument();

    // 所属企業は初期値（空）のまま保存をクリック
    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    // バリデーションエラーメッセージの確認
    expect(await screen.findByText("所属外注先企業を選択してください。")).toBeInTheDocument();
  });

  it("TS-015-005: 削除ボタン押下時の確認ダイアログの挙動、削除OK選択時に一覧から即座に消去されること", async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });

    // confirm でキャンセルを選択した場合のモック
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => false);

    // seeded_contractor_manager (user-1) の削除ボタンをクリック
    const deleteBtn = screen.getByTestId("delete-button-user-1");
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    // キャンセルされたので一覧にまだ存在すること
    expect(screen.getByText("seeded_contractor_manager")).toBeInTheDocument();

    // confirm でOKを選択した場合のモック
    confirmSpy.mockImplementation(() => true);

    fireEvent.click(deleteBtn);

    // 削除OKされたので、一覧から消去されること
    await waitFor(() => {
      expect(screen.queryByText("seeded_contractor_manager")).not.toBeInTheDocument();
    });
  });

  it("TS-015-005: ログイン中の自分自身を削除（delete）できないように削除ボタンが無効化されていること", async () => {
    render(<AdminUserRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });

    // 現在のログインユーザーは "user-2" (factory_admin)
    const selfDeleteBtn = screen.getByTestId("delete-button-user-2") as HTMLButtonElement;
    expect(selfDeleteBtn.disabled).toBe(true);
  });
});
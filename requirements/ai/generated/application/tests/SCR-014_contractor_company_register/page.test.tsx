import React from "react";
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDB } from "@/lib/db";
import ContractorRegisterPage from "@/app/(factory)/contractor-register/page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: vi.fn(),
    };
  },
}));

describe("外注先企業登録画面 (SCR-014_contractor_company_register)", () => {
  let sessionStore: Record<string, string> = {};

  beforeEach(async () => {
    mockPush.mockClear();
    vi.restoreAllMocks();
    
    // fake-indexeddb のデータベースを初期化
    const db = await getDB();
    const tx = db.transaction(["contractors", "workers"], "readwrite");
    await tx.objectStore("contractors").clear();
    await tx.objectStore("workers").clear();
    await tx.done;

    // sessionStorage のモック (SCR-014-VL-003)
    sessionStore = {
      user_id: "user-admin",
      role: "FACTORY_ADMIN",
    };

    const mockSessionStorage = {
      getItem: vi.fn((key: string) => sessionStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStore[key];
      }),
      clear: vi.fn(() => {
        sessionStore = {};
      }),
      key: vi.fn(),
      length: 0,
    };

    Object.defineProperty(globalThis, "sessionStorage", {
      value: mockSessionStorage,
      configurable: true,
      writable: true,
    });
  });

  it("SCR-014-TC-001: 登録済みの外注先企業がテーブルに一覧表示されること (SCR-014-FN-001)", async () => {
    const db = await getDB();
    const tx = db.transaction("contractors", "readwrite");
    await tx.objectStore("contractors").put({
      contractor_id: "contractor-A",
      name: "外注企業A",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await tx.objectStore("contractors").put({
      contractor_id: "contractor-B",
      name: "外注企業B",
      status: "INACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await tx.done;

    render(<ContractorRegisterPage />);

    // 読み込み完了まで待つ
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("contractor-name-contractor-A").textContent).toContain("外注企業A");
    expect(screen.getByTestId("contractor-status-badge-contractor-A").textContent).toContain("有効");
    expect(screen.getByTestId("contractor-name-contractor-B").textContent).toContain("外注企業B");
    expect(screen.getByTestId("contractor-status-badge-contractor-B").textContent).toContain("無効");
  });

  it("SCR-014-TC-002: 企業名が空欄の場合はバリデーションエラーが表示され、保存されないこと (SCR-014-VL-001)", async () => {
    render(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    // 新規登録モーダルを開く (SCR-014-EV-001)
    fireEvent.click(screen.getByTestId("new-contractor-btn"));

    // 保存ボタンをクリック
    fireEvent.click(screen.getByTestId("modal-save-btn"));

    // バリデーションエラーメッセージの確認
    await waitFor(() => {
      expect(screen.getByTestId("contractor-name-error").textContent).toContain("企業名は必須入力です");
    });

    const db = await getDB();
    const tx = db.transaction("contractors", "readonly");
    const list = await tx.objectStore("contractors").getAll();
    await tx.done;
    expect(list.length).toBe(0);
  });

  it("SCR-014-TC-003: 外注先企業の新規登録フローが正常に動作すること (SCR-014-FN-002)", async () => {
    render(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("new-contractor-btn"));

    // 企業名を入力 (SCR-014-EV-002)
    const nameInput = screen.getByTestId("contractor-name-input");
    fireEvent.change(nameInput, { target: { value: "新規登録デモ企業" } });

    // 保存
    fireEvent.click(screen.getByTestId("modal-save-btn"));

    // モーダルが閉じ、一覧に表示されるまで待つ
    await waitFor(() => {
      expect(screen.queryByTestId("contractor-modal-overlay")).not.toBeInTheDocument();
    });

    const db = await getDB();
    const tx = db.transaction("contractors", "readonly");
    const list = await tx.objectStore("contractors").getAll();
    await tx.done;

    expect(list.length).toBe(1);
    expect(list[0].name).toBe("新規登録デモ企業");
    expect(list[0].status).toBe("ACTIVE");
  });

  it("SCR-014-TC-004: 登録情報の編集・ステータス変更の更新ができること (SCR-014-FN-003)", async () => {
    const db = await getDB();
    const tx = db.transaction("contractors", "readwrite");
    const contractor = {
      contractor_id: "test-contractor-uuid",
      name: "編集前企業",
      status: "ACTIVE" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await tx.objectStore("contractors").put(contractor);
    await tx.done;

    render(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    // 編集ボタンをクリック (SCR-014-EV-003)
    fireEvent.click(screen.getByTestId("edit-contractor-btn-test-contractor-uuid"));

    // モーダルが表示され、値がロードされていることの確認
    const nameInput = screen.getByTestId("contractor-name-input");
    expect(nameInput).toHaveValue("編集前企業");

    // 企業名とステータスを変更
    fireEvent.change(nameInput, { target: { value: "変更済企業名" } });
    fireEvent.click(screen.getByTestId("status-inactive-radio"));

    // 保存
    fireEvent.click(screen.getByTestId("modal-save-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("contractor-modal-overlay")).not.toBeInTheDocument();
    });

    const dbAfter = await getDB();
    const txAfter = dbAfter.transaction("contractors", "readonly");
    const updated = await txAfter.objectStore("contractors").get("test-contractor-uuid");
    await txAfter.done;

    expect(updated.name).toBe("変更済企業名");
    expect(updated.status).toBe("INACTIVE");
  });

  it("SCR-014-TC-005 & SCR-014-TC-006: 所属作業員がいる企業は削除が制限され、いない企業は削除できること (SCR-014-FN-004 / SCR-014-VL-002)", async () => {
    const db = await getDB();
    const tx = db.transaction(["contractors", "workers"], "readwrite");
    
    // 企業A (作業員あり)
    await tx.objectStore("contractors").put({
      contractor_id: "contractor-with-workers",
      name: "作業員あり企業",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await tx.objectStore("workers").put({
      worker_id: "worker-1",
      contractor_id: "contractor-with-workers",
      name: "山田太郎",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 企業B (作業員なし)
    await tx.objectStore("contractors").put({
      contractor_id: "contractor-without-workers",
      name: "作業員なし企業",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await tx.done;

    // window.confirm をモック (SCR-014-VL-002)
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ContractorRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    // 作業員あり企業の削除を試みる (整合性制限)
    fireEvent.click(screen.getByTestId("delete-contractor-btn-contractor-with-workers"));
    expect(confirmSpy).toHaveBeenCalled();

    // エラートーストの確認
    await waitFor(() => {
      expect(screen.getByTestId("toast-message").textContent).toContain("この企業には登録作業員が存在するため削除できません");
    });

    // 作業員なし企業の削除を試みる (物理削除)
    fireEvent.click(screen.getByTestId("delete-contractor-btn-contractor-without-workers"));

    // 一覧から削除されることを確認
    await waitFor(() => {
      expect(screen.queryByTestId("contractor-row-contractor-without-workers")).not.toBeInTheDocument();
    });

    const dbAfter = await getDB();
    const txAfter = dbAfter.transaction(["contractors"], "readonly");
    const contractorsList = await txAfter.objectStore("contractors").getAll();
    await txAfter.done;

    expect(contractorsList.some(c => c.contractor_id === "contractor-without-workers")).toBe(false);
    expect(contractorsList.some(c => c.contractor_id === "contractor-with-workers")).toBe(true);
  });

  it("SCR-014-TC-007: 未認証状態の場合はログイン画面に強制遷移されること (SCR-014-VL-003)", async () => {
    // 認証セッションを破棄
    sessionStorage.clear();

    render(<ContractorRegisterPage />);

    expect(mockPush).toHaveBeenCalledWith("/admin-login");
  });
});
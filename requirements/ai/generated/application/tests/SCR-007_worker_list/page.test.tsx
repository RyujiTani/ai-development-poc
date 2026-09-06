import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import WorkerListPage from "@/app/(contractor)/workers/page";
import { getDB } from "@/lib/db";
import { Worker } from "@/features/worker/domain/types";

// next/navigation モック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockPush,
  }),
}));

describe("SCR-007 作業員一覧画面テスト", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // データベースクリア
    const db = await getDB();
    const tx = db.transaction(["users", "contractors", "workers"], "readwrite");
    await tx.objectStore("users").clear();
    await tx.objectStore("contractors").clear();
    await tx.objectStore("workers").clear();
    await tx.done;
  });

  afterEach(() => {
    cleanup();
  });

  it("UT-SCR-007-001: 未認証状態でアクセスした場合、ログイン画面へリダイレクトされること", async () => {
    render(<WorkerListPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("UT-SCR-007-002: 自社の作業員のみが表示され、他社のデータが表示されないこと", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    const store = tx.objectStore("workers");

    // 自社作業員2名
    const worker1: Worker = {
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "山田太郎",
      status: "ACTIVE",
      qualifications: ["資格A"],
      trainings: [{ code: "講習X", taken_at: "2026-01-01T00:00:00Z" }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const worker2: Worker = {
      worker_id: "worker-2",
      contractor_id: "contractor-1",
      name: "佐藤次郎",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // 他社作業員1名
    const worker3: Worker = {
      worker_id: "worker-3",
      contractor_id: "contractor-2",
      name: "鈴木三郎",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.put(worker1);
    await store.put(worker2);
    await store.put(worker3);
    await tx.done;

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    // 自社作業員は表示
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("佐藤次郎")).toBeInTheDocument();

    // 他社作業員は非表示
    expect(screen.queryByText("鈴木三郎")).not.toBeInTheDocument();
  });

  it("UT-SCR-007-003: 各作業員の詳細項目(氏名、連絡先、資格、講習受講履歴)が正しく表示されていること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    const store = tx.objectStore("workers");

    const worker: Worker = {
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "山田太郎",
      contact: "090-1234-5678",
      status: "ACTIVE",
      qualifications: ["QUAL-01", "QUAL-02"],
      trainings: [{ code: "TRAIN-AB", taken_at: "2025-10-01T00:00:00Z" }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.put(worker);
    await tx.done;

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });

    // 連絡先、資格、講習受講履歴の表示内容アサーション
    expect(screen.getByTestId("worker-contact-worker-1")).toHaveTextContent("090-1234-5678");

    const qualificationsElement = screen.getByTestId("worker-qualifications-worker-1");
    expect(qualificationsElement).toHaveTextContent("QUAL-01");
    expect(qualificationsElement).toHaveTextContent("QUAL-02");

    const trainingsElement = screen.getByTestId("worker-trainings-worker-1");
    expect(trainingsElement).toHaveTextContent("TRAIN-AB (2025-10-01)");
  });

  it("UT-SCR-007-004: 削除ボタンクリック時に確認ダイアログが呼び出されること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    const store = tx.objectStore("workers");

    const worker: Worker = {
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "山田太郎",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.put(worker);
    await tx.done;

    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => false);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId("delete-btn-worker-1");
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith("作業員「山田太郎」を本当に削除しますか？");
    confirmSpy.mockRestore();
  });

  it("UT-SCR-007-005: 削除ダイアログでキャンセルした場合、削除処理が中断されること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    const store = tx.objectStore("workers");

    const worker: Worker = {
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "山田太郎",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.put(worker);
    await tx.done;

    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => false);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId("delete-btn-worker-1");
    fireEvent.click(deleteBtn);

    expect(screen.getByText("山田太郎")).toBeInTheDocument();

    const freshDb = await getDB();
    const freshTx = freshDb.transaction("workers", "readonly");
    const freshWorker = await freshTx.objectStore("workers").get("worker-1");
    await freshTx.done;
    expect(freshWorker.status).toBe("ACTIVE");

    confirmSpy.mockRestore();
  });

  it("UT-SCR-007-006: 削除ダイアログで「OK/削除」を選択時、退職ステータス(RETIRED)に更新され一覧から非表示になり、Toastが表示されること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    const store = tx.objectStore("workers");

    const worker: Worker = {
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "山田太郎",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.put(worker);
    await tx.done;

    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId("delete-btn-worker-1");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText("山田太郎")).not.toBeInTheDocument();
    });

    const toast = screen.getByTestId("toast-message");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent("山田太郎さんを削除しました");

    const freshDb = await getDB();
    const freshTx = freshDb.transaction("workers", "readonly");
    const freshWorker = await freshTx.objectStore("workers").get("worker-1");
    await freshTx.done;
    expect(freshWorker.status).toBe("RETIRED");
    expect(freshWorker.retired_at).toBeDefined();

    confirmSpy.mockRestore();
  });

  it("E2E-SCR-007-001: 各ナビゲーション(戻る、新規追加、編集)操作時に正しい遷移が行われること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    const store = tx.objectStore("workers");

    const worker: Worker = {
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "山田太郎",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.put(worker);
    await tx.done;

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });

    // 新規追加
    const addNewBtn = screen.getByTestId("add-new-btn");
    fireEvent.click(addNewBtn);
    expect(mockPush).toHaveBeenCalledWith("/workers/new");

    // 編集
    const editBtn = screen.getByTestId("edit-btn-worker-1");
    fireEvent.click(editBtn);
    expect(mockPush).toHaveBeenCalledWith("/workers/worker-1/edit");

    // 戻る
    const backBtn = screen.getByRole("button", { name: "戻る" });
    fireEvent.click(backBtn);
    expect(mockPush).toHaveBeenCalledWith("/home");
  });
});
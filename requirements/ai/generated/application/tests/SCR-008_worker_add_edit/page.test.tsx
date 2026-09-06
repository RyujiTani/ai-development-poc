import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import WorkerForm from "@/features/worker/ui/WorkerForm";
import { initializeDB, getDB } from "@/lib/db/indexedDB";
import seedData from "../../public/mocks/seed.json";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useParams: () => ({
    id: "worker-1",
  }),
}));

describe("SCR-008_worker_add_edit", () => {
  let sessionStorageStore: Record<string, string> = {};

  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorageStore = {
      user_id: "user-1",
      role: "CONTRACTOR_MANAGER",
      contractor_id: "contractor-1",
    };

    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => sessionStorageStore[key] || null);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, val) => {
      sessionStorageStore[key] = val;
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key) => {
      delete sessionStorageStore[key];
    });

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(seedData),
      })
    );

    await initializeDB(true);
  });

  it("SCR-008-VL-001: 氏名必須バリデーションエラーが発生すること", async () => {
    render(<WorkerForm />);
    
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    expect(await screen.findByText("氏名を入力してください")).toBeInTheDocument();
  });

  it("SCR-008-VL-002: 連絡先必須・形式バリデーションエラーが発生すること", async () => {
    render(<WorkerForm />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const nameInput = screen.getByTestId("name-input");
    fireEvent.change(nameInput, { target: { value: "テスト 太郎" } });

    const contactInput = screen.getByTestId("contact-input");
    fireEvent.change(contactInput, { target: { value: "invalid-phone" } });

    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    expect(await screen.findByText("有効な電話番号（10〜13桁の数字またはハイフン）を入力してください")).toBeInTheDocument();
  });

  it("SCR-008-FN-005: 既存作業員情報のロードができること", async () => {
    render(<WorkerForm workerId="worker-1" />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const nameInput = screen.getByTestId("name-input") as HTMLInputElement;
    const contactInput = screen.getByTestId("contact-input") as HTMLInputElement;

    await waitFor(() => {
      expect(nameInput.value).toBe("田中 太郎");
      expect(contactInput.value).toBe("090-1234-5678");
    });
  });

  it("SCR-008-IT-001: 新規登録の正常終了フロー", async () => {
    render(<WorkerForm />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const nameInput = screen.getByTestId("name-input");
    const contactInput = screen.getByTestId("contact-input");

    fireEvent.change(nameInput, { target: { value: "新規 太郎" } });
    fireEvent.change(contactInput, { target: { value: "080-9876-5432" } });

    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/workers");
    });

    const db = await getDB();
    const tx = db.transaction("workers", "readonly");
    const workers = await tx.store.getAll();
    await tx.done;

    const added = workers.find((w) => w.name === "新規 太郎");
    expect(added).toBeDefined();
    expect(added?.contact).toBe("080-9876-5432");
  });

  it("SCR-008-IT-002: キャンセル操作フロー", async () => {
    render(<WorkerForm workerId="worker-1" />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const cancelButton = screen.getByTestId("cancel-button");
    fireEvent.click(cancelButton);

    expect(mockPush).toHaveBeenCalledWith("/workers");
  });

  it("SCR-008-VL-003: 認証なしでリダイレクトされること", async () => {
    delete sessionStorageStore.user_id;
    delete sessionStorageStore.role;

    render(<WorkerForm />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});
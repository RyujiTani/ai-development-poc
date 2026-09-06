import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { getDB } from "@/lib/db";
import WorkerForm from "@/features/worker/ui/WorkerForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: pushMock,
  }),
}));

describe("SCR-008 作業員追加・編集画面", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // sessionStorageのモック
    const sessionStore: Record<string, string> = {
      user_id: "user-1",
      role: "CONTRACTOR_MANAGER",
      contractor_id: "contractor-1",
    };
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => sessionStore[key] || null,
      setItem: (key: string, val: string) => { sessionStore[key] = val; },
      removeItem: (key: string) => { delete sessionStore[key]; },
      clear: () => {
        for (const k in sessionStore) delete sessionStore[k];
      },
    });

    // データベースを初期化・クリーンアップ
    const db = await getDB();
    const tx = db.transaction(["workers"], "readwrite");
    await tx.objectStore("workers").clear();
    await tx.done;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("TST-SCR-008-001: 氏名入力欄が空の状態で保存を押すと、エラーが表示されること", async () => {
    render(<WorkerForm mode="new" />);

    // 連絡先だけ入力
    const contactInput = await screen.findByTestId("worker-contact-input");
    fireEvent.change(contactInput, { target: { value: "09012345678" } });

    const saveBtn = screen.getByTestId("save-btn");
    fireEvent.click(saveBtn);

    // エラーメッセージが表示されることを確認
    const errorName = await screen.findByTestId("error-name");
    expect(errorName.textContent).toContain("氏名を入力してください");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("TST-SCR-008-002: 連絡先入力欄が空の状態で保存を押すと、エラーが表示されること", async () => {
    render(<WorkerForm mode="new" />);

    // 氏名だけ入力
    const nameInput = await screen.findByTestId("worker-name-input");
    fireEvent.change(nameInput, { target: { value: "鈴木 一郎" } });

    const saveBtn = screen.getByTestId("save-btn");
    fireEvent.click(saveBtn);

    // エラーメッセージが表示されることを確認
    const errorContact = await screen.findByTestId("error-contact");
    expect(errorContact.textContent).toContain("連絡先を入力してください");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("TST-SCR-008-003: 未認証状態でアクセスするとログイン画面へリダイレクトされること", async () => {
    // セッションを空にする
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    });

    render(<WorkerForm mode="new" />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("TST-SCR-008-004: 編集モードでデータを自動ロードすること", async () => {
    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    await tx.objectStore("workers").put({
      worker_id: "worker-test-123",
      contractor_id: "contractor-1",
      name: "鈴木 編集太郎",
      contact: "08098765432",
      qualifications: ["QUAL-01", "QUAL-03"],
      trainings: [{ code: "TRAIN-01", taken_at: "2026-04-01T00:00:00.000Z" }],
      status: "ACTIVE",
      created_at: "2026-04-13T00:00:00+09:00",
      updated_at: "2026-04-13T00:00:00+09:00",
    });
    await tx.done;

    render(<WorkerForm mode="edit" workerId="worker-test-123" />);

    const nameInput = (await screen.findByTestId("worker-name-input")) as HTMLInputElement;
    const contactInput = (await screen.findByTestId("worker-contact-input")) as HTMLInputElement;

    await waitFor(() => {
      expect(nameInput.value).toBe("鈴木 編集太郎");
      expect(contactInput.value).toBe("08098765432");
    });

    // 資格チェックボックスがONになっているか
    const qual1Checkbox = screen.getByTestId("qualification-checkbox-QUAL-01") as HTMLInputElement;
    const qual3Checkbox = screen.getByTestId("qualification-checkbox-QUAL-03") as HTMLInputElement;
    const qual2Checkbox = screen.getByTestId("qualification-checkbox-QUAL-02") as HTMLInputElement;

    expect(qual1Checkbox.querySelector("input")?.checked).toBe(true);
    expect(qual3Checkbox.querySelector("input")?.checked).toBe(true);
    expect(qual2Checkbox.querySelector("input")?.checked).toBe(false);
  });

  it("TST-SCR-008-005: 新規登録モードでの正常データ保存と画面遷移", async () => {
    render(<WorkerForm mode="new" />);

    const nameInput = await screen.findByTestId("worker-name-input");
    const contactInput = screen.getByTestId("worker-contact-input");

    fireEvent.change(nameInput, { target: { value: "佐藤 次郎" } });
    fireEvent.change(contactInput, { target: { value: "09011112222" } });

    // 資格を1つ選択
    const qualLabel = screen.getByTestId("qualification-checkbox-QUAL-01");
    fireEvent.click(qualLabel);

    // 講習を1つ追加
    const addTrainingBtn = screen.getByTestId("add-training-btn");
    fireEvent.click(addTrainingBtn);

    const codeSelect = await screen.findByTestId("training-code-select-0");
    const dateInput = screen.getByTestId("training-taken-at-input-0");

    fireEvent.change(codeSelect, { target: { value: "TRAIN-01" } });
    fireEvent.change(dateInput, { target: { value: "2026-04-10" } });

    const saveBtn = screen.getByTestId("save-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/workers");
    });

    // IndexedDBにデータが入ったか確認
    const db = await getDB();
    const tx = db.transaction("workers", "readonly");
    const allWorkers = await tx.objectStore("workers").getAll();
    await tx.done;

    const added = allWorkers.find((w) => w.name === "佐藤 次郎");
    expect(added).toBeDefined();
    expect(added?.contact).toBe("09011112222");
    expect(added?.qualifications).toContain("QUAL-01");
    expect(added?.trainings[0].code).toBe("TRAIN-01");
  });

  it("TST-SCR-008-006: 編集モードでのデータ変更と保存", async () => {
    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    await tx.objectStore("workers").put({
      worker_id: "worker-test-456",
      contractor_id: "contractor-1",
      name: "元々の名前",
      contact: "09000000000",
      qualifications: ["QUAL-01"],
      trainings: [],
      status: "ACTIVE",
      created_at: "2026-04-13T00:00:00+09:00",
      updated_at: "2026-04-13T00:00:00+09:00",
    });
    await tx.done;

    render(<WorkerForm mode="edit" workerId="worker-test-456" />);

    const nameInput = (await screen.findByTestId("worker-name-input")) as HTMLInputElement;
    await waitFor(() => {
      expect(nameInput.value).toBe("元々の名前");
    });

    // 値を書き換え
    fireEvent.change(nameInput, { target: { value: "変更後の名前" } });

    const saveBtn = screen.getByTestId("save-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/workers");
    });

    // データベースが更新されたことを検証
    const db2 = await getDB();
    const tx2 = db2.transaction("workers", "readonly");
    const updated = await tx2.objectStore("workers").get("worker-test-456");
    await tx2.done;

    expect(updated?.name).toBe("変更後の名前");
  });

  it("TST-SCR-008-007: キャンセルボタンのクリックで保存せずに一覧へ戻ること", async () => {
    render(<WorkerForm mode="new" />);

    const nameInput = await screen.findByTestId("worker-name-input");
    fireEvent.change(nameInput, { target: { value: "破棄する名前" } });

    const cancelBtn = screen.getByTestId("cancel-btn");
    fireEvent.click(cancelBtn);

    expect(pushMock).toHaveBeenCalledWith("/workers");

    // IndexedDBが空（新規データが保存されていない）であることを検証
    const db = await getDB();
    const tx = db.transaction("workers", "readonly");
    const allWorkers = await tx.objectStore("workers").getAll();
    await tx.done;

    const found = allWorkers.find((w) => w.name === "破棄する名前");
    expect(found).toBeUndefined();
  });
});
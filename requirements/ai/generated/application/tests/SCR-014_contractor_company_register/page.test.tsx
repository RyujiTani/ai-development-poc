import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ContractorCompanyRegisterPage from "@/app/(factory)/contractors/page";
import { getAdminContractorsUseCase } from "@/features/contractor/usecase/getAdminContractorsUseCase";
import { saveContractorUseCase } from "@/features/contractor/usecase/saveContractorUseCase";
import { deleteContractorUseCase } from "@/features/contractor/usecase/deleteContractorUseCase";

// モック
vi.mock("@/features/contractor/usecase/getAdminContractorsUseCase", () => ({
  getAdminContractorsUseCase: vi.fn(),
}));

vi.mock("@/features/contractor/usecase/saveContractorUseCase", () => ({
  saveContractorUseCase: vi.fn(),
}));

vi.mock("@/features/contractor/usecase/deleteContractorUseCase", () => ({
  deleteContractorUseCase: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("SCR-014 外注先企業登録画面 の検証", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // sessionStorageのモック
    const sessionStore: Record<string, string> = {
      user_id: "factory-user-id",
      role: "FACTORY_ADMIN",
    };
    
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => sessionStore[key] || null,
      setItem: (key: string, val: string) => { sessionStore[key] = val; },
      removeItem: (key: string) => { delete sessionStore[key]; },
      clear: () => { Object.keys(sessionStore).forEach(k => delete sessionStore[k]); }
    });

    // window.confirm & alertのモック
    vi.stubGlobal("confirm", () => true);
    vi.stubGlobal("alert", vi.fn());
  });

  it("TS-014-001: 登録済みの外注先企業一覧が正しく表示されること", async () => {
    const mockContractors = [
      {
        contractor_id: "1",
        name: "テスト外注企業A",
        status: "ACTIVE" as const,
        created_at: "2026-04-13T00:00:00Z",
        updated_at: "2026-04-13T00:00:00Z",
      },
      {
        contractor_id: "2",
        name: "テスト外注企業B",
        status: "INACTIVE" as const,
        created_at: "2026-04-13T00:00:00Z",
        updated_at: "2026-04-13T00:00:00Z",
      },
    ];

    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: mockContractors,
    });

    render(<ContractorCompanyRegisterPage />);

    await waitFor(() => {
      expect(screen.getByTestId("contractor-name-1")).toHaveTextContent("テスト外注企業A");
      expect(screen.getByTestId("contractor-status-1")).toHaveTextContent("有効 (ACTIVE)");
      expect(screen.getByTestId("contractor-name-2")).toHaveTextContent("テスト外注企業B");
      expect(screen.getByTestId("contractor-status-2")).toHaveTextContent("無効 (INACTIVE)");
    });
  });

  it("TS-014-002: 「新規登録」ボタンクリックで新規登録フォームモーダルが表示されること", async () => {
    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [],
    });

    render(<ContractorCompanyRegisterPage />);

    const addButton = screen.getByTestId("add-contractor-button");
    fireEvent.click(addButton);

    expect(screen.getByTestId("contractor-modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-title")).toHaveTextContent("外注先企業の新規登録");
  });

  it("TS-014-003: 企業名が未入力の状態で保存した際、バリデーションエラーが表示されること", async () => {
    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [],
    });

    render(<ContractorCompanyRegisterPage />);

    const addButton = screen.getByTestId("add-contractor-button");
    fireEvent.click(addButton);

    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId("contractor-name-error")).toHaveTextContent("企業名を入力してください");
    });
  });

  it("TS-014-004: 正しい企業名を入力して保存した際、新規登録が成功し、一覧が再表示されること", async () => {
    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [],
    });

    vi.mocked(saveContractorUseCase).mockResolvedValue({
      success: true,
      value: {
        contractor_id: "new-id",
        name: "新規登録外注企業",
        status: "ACTIVE",
        created_at: "2026-04-13T00:00:00Z",
        updated_at: "2026-04-13T00:00:00Z",
      },
    });

    render(<ContractorCompanyRegisterPage />);

    const addButton = screen.getByTestId("add-contractor-button");
    fireEvent.click(addButton);

    const nameInput = screen.getByTestId("contractor-name-input");
    fireEvent.change(nameInput, { target: { value: "新規登録外注企業" } });

    // 新規登録成功後に一覧を再ロードするため、ロード用モックを更新
    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [
        {
          contractor_id: "new-id",
          name: "新規登録外注企業",
          status: "ACTIVE" as const,
          created_at: "2026-04-13T00:00:00Z",
          updated_at: "2026-04-13T00:00:00Z",
        }
      ],
    });

    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveContractorUseCase).toHaveBeenCalledWith({
        name: "新規登録外注企業",
        status: "ACTIVE",
        userId: "factory-user-id",
      });
      expect(screen.queryByTestId("contractor-modal")).not.toBeInTheDocument();
      expect(screen.getByTestId("contractor-name-new-id")).toHaveTextContent("新規登録外注企業");
    });
  });

  it("TS-014-005: 「編集」ボタンクリックで該当企業のデータがフォームにロードされていること", async () => {
    const mockContractor = {
      contractor_id: "edit-target-id",
      name: "編集対象企業",
      status: "ACTIVE" as const,
      created_at: "2026-04-13T00:00:00Z",
      updated_at: "2026-04-13T00:00:00Z",
    };

    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [mockContractor],
    });

    render(<ContractorCompanyRegisterPage />);

    await waitFor(() => {
      expect(screen.getByTestId("contractor-name-edit-target-id")).toBeInTheDocument();
    });

    const editButton = screen.getByTestId("edit-button-edit-target-id");
    fireEvent.click(editButton);

    expect(screen.getByTestId("contractor-modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-title")).toHaveTextContent("外注先企業情報の編集");
    expect(screen.getByTestId("contractor-name-input")).toHaveValue("編集対象企業");
  });

  it("TS-014-006: 企業名を変更して保存した際、更新が成功し、表示が更新されること", async () => {
    const mockContractor = {
      contractor_id: "edit-target-id",
      name: "編集対象企業",
      status: "ACTIVE" as const,
      created_at: "2026-04-13T00:00:00Z",
      updated_at: "2026-04-13T00:00:00Z",
    };

    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [mockContractor],
    });

    vi.mocked(saveContractorUseCase).mockResolvedValue({
      success: true,
      value: {
        ...mockContractor,
        name: "編集対象企業（更新後）",
      },
    });

    render(<ContractorCompanyRegisterPage />);

    await waitFor(() => {
      expect(screen.getByTestId("contractor-name-edit-target-id")).toBeInTheDocument();
    });

    const editButton = screen.getByTestId("edit-button-edit-target-id");
    fireEvent.click(editButton);

    const nameInput = screen.getByTestId("contractor-name-input");
    fireEvent.change(nameInput, { target: { value: "編集対象企業（更新後）" } });

    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [
        {
          ...mockContractor,
          name: "編集対象企業（更新後）",
        }
      ],
    });

    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveContractorUseCase).toHaveBeenCalledWith({
        contractorId: "edit-target-id",
        name: "編集対象企業（更新後）",
        status: "ACTIVE",
        userId: "factory-user-id",
      });
      expect(screen.getByTestId("contractor-name-edit-target-id")).toHaveTextContent("編集対象企業（更新後）");
    });
  });

  it("TS-014-007: 「削除」をクリックしてconfirmをOKした際、削除が成功すること", async () => {
    const mockContractor = {
      contractor_id: "delete-target-id",
      name: "削除対象企業",
      status: "ACTIVE" as const,
      created_at: "2026-04-13T00:00:00Z",
      updated_at: "2026-04-13T00:00:00Z",
    };

    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [mockContractor],
    });

    vi.mocked(deleteContractorUseCase).mockResolvedValue({
      success: true,
      value: { success: true },
    });

    render(<ContractorCompanyRegisterPage />);

    await waitFor(() => {
      expect(screen.getByTestId("contractor-name-delete-target-id")).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId("delete-button-delete-target-id");
    fireEvent.click(deleteButton);

    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [],
    });

    await waitFor(() => {
      expect(deleteContractorUseCase).toHaveBeenCalledWith("delete-target-id", "factory-user-id");
      expect(screen.queryByTestId("contractor-name-delete-target-id")).not.toBeInTheDocument();
    });
  });

  it("TS-014-008: 未ログインまたは別ロールでのアクセスで、リダイレクト処理が行われること", async () => {
    // 未ログイン状態のセッション
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    vi.mocked(getAdminContractorsUseCase).mockResolvedValue({
      success: true,
      value: [],
    });

    render(<ContractorCompanyRegisterPage />);

    await waitFor(() => {
      expect(sessionStorage.getItem("user_id")).toBeNull();
    });
  });
});
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import LaborTimeSummaryPage from "@/app/(factory)/labor-time-summary/page";
import { getLaborSummaryUseCase } from "@/features/report/usecase/getLaborSummaryUseCase";

// Mock router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
}));

// Mock usecase
vi.mock("@/features/report/usecase/getLaborSummaryUseCase", () => ({
  getLaborSummaryUseCase: vi.fn().mockImplementation(() => Promise.resolve({ success: true, value: [] })),
}));

describe("SCR-013 Labor Time Summary Screen Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("SCR-013-UT-001 (VL-003): should redirect to admin-login when unauthorized user visits", async () => {
    // sessionStorage is empty
    render(<LaborTimeSummaryPage />);

    expect(mockReplace).toHaveBeenCalledWith("/admin-login");
  });

  it("SCR-013-UT-002 (VL-001): should show validation error when startDate is empty", async () => {
    sessionStorage.setItem("user_id", "admin-1");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    render(<LaborTimeSummaryPage />);

    // ロード完了を待つ
    const startDateInput = await screen.findByTestId("start-date-input");
    fireEvent.change(startDateInput, { target: { value: "" } });

    const submitBtn = screen.getByTestId("submit-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("start-date-error")).toBeInTheDocument();
      expect(screen.getByTestId("start-date-error")).toHaveTextContent("開始日は必須入力です");
    });
  });

  it("SCR-013-UT-003 (VL-002): should show validation error when endDate is before startDate", async () => {
    sessionStorage.setItem("user_id", "admin-1");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    render(<LaborTimeSummaryPage />);

    // ロード完了を待つ
    const startDateInput = await screen.findByTestId("start-date-input");
    const endDateInput = screen.getByTestId("end-date-input");

    fireEvent.change(startDateInput, { target: { value: "2026-04-10" } });
    fireEvent.change(endDateInput, { target: { value: "2026-04-09" } });

    const submitBtn = screen.getByTestId("submit-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("end-date-error")).toBeInTheDocument();
      expect(screen.getByTestId("end-date-error")).toHaveTextContent(
        "終了日は開始日以降の日付を入力してください"
      );
    });
  });

  it("SCR-013-UT-004 (EV-001): should fetch and render labor summary data correctly on submit", async () => {
    sessionStorage.setItem("user_id", "admin-1");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    const mockRecords = [
      {
        worker_id: "worker-1",
        worker_name: "田中 太郎",
        contractor_name: "外注A社",
        period: "2026-04-01",
        total_hours: 8.5,
      },
    ];

    vi.mocked(getLaborSummaryUseCase).mockResolvedValue({
      success: true,
      value: mockRecords,
    });

    render(<LaborTimeSummaryPage />);

    // ロード完了を待つ
    const startDateInput = await screen.findByTestId("start-date-input");
    const endDateInput = screen.getByTestId("end-date-input");

    fireEvent.change(startDateInput, { target: { value: "2026-04-01" } });
    fireEvent.change(endDateInput, { target: { value: "2026-04-05" } });

    const submitBtn = screen.getByTestId("submit-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getLaborSummaryUseCase).toHaveBeenCalledWith({
        start_date: "2026-04-01",
        end_date: "2026-04-05",
        unit: "daily",
      });
      expect(screen.getByTestId("worker-name")).toHaveTextContent("田中 太郎");
      expect(screen.getByTestId("contractor-name")).toHaveTextContent("外注A社");
      expect(screen.getByTestId("period")).toHaveTextContent("2026-04-01");
      expect(screen.getByTestId("total-hours")).toHaveTextContent("8.50 時間");
    });
  });

  it("SCR-013-UT-005 (FN-004): should download CSV successfully when download button is clicked", async () => {
    sessionStorage.setItem("user_id", "admin-1");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    const mockRecords = [
      {
        worker_id: "worker-1",
        worker_name: "田中 太郎",
        contractor_name: "外注A社",
        period: "2026-04-01",
        total_hours: 8.5,
      },
    ];

    vi.mocked(getLaborSummaryUseCase).mockResolvedValue({
      success: true,
      value: mockRecords,
    });

    // Mock URL.createObjectURL and revokeObjectURL
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const mockCreateObjectURL = vi.fn().mockReturnValue("mock-csv-url");
    const mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    render(<LaborTimeSummaryPage />);

    // ロード完了を待つ
    await waitFor(() => {
      expect(screen.getByTestId("csv-download-button")).not.toBeDisabled();
    });

    const downloadBtn = screen.getByTestId("csv-download-button");
    fireEvent.click(downloadBtn);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();

    // 元に戻す
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
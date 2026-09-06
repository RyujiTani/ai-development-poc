import React from "react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "fake-indexeddb/auto";
import LaborSummaryPage from "../../app/(factory)/labor-summary/page";
import { getDB } from "@/lib/db";

// Next.js router mock
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: vi.fn(),
    };
  },
}));

describe("SCR-013_labor_time_summary Tests", () => {
  beforeEach(async () => {
    mockPush.mockClear();
    // sessionStorage の初期化
    if (typeof window !== "undefined") {
      window.sessionStorage.clear();
      window.sessionStorage.setItem("user_id", "user-admin");
      window.sessionStorage.setItem("role", "FACTORY_ADMIN");
    }

    // fake-indexeddb のデータベース初期化
    const db = await getDB();
    const tx = db.transaction(["attendance_records", "workers", "contractors"], "readwrite");
    await tx.objectStore("attendance_records").clear();
    await tx.done;
  });

  test("TST-013-001: 日次労働時間集計の正常表示", async () => {
    // データ登録
    const db = await getDB();
    
    // CLOCK_IN と CLOCK_OUT のペアを登録する
    const clockInTime = "2026-04-01T08:00:00+09:00";
    const clockOutTime = "2026-04-01T17:00:00+09:00"; // 9時間差

    const tx = db.transaction(["attendance_records"], "readwrite");
    await tx.objectStore("attendance_records").put({
      attendance_id: "att-1",
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      punch_type: "CLOCK_IN",
      clocked_at: clockInTime,
      punched_by: "user-1",
      photo_object_id: "photo-1",
      created_at: clockInTime,
    });
    await tx.objectStore("attendance_records").put({
      attendance_id: "att-2",
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      punch_type: "CLOCK_OUT",
      clocked_at: clockOutTime,
      punched_by: "user-1",
      photo_object_id: "photo-1",
      created_at: clockOutTime,
    });
    await tx.done;

    render(<LaborSummaryPage />);

    // 認証確認後の描画を待つ
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "労働時間集計" })).toBeInTheDocument();
    });

    // フォームに値を入力
    const startDateInput = screen.getByTestId("start-date-input");
    const endDateInput = screen.getByTestId("end-date-input");
    const calculateBtn = screen.getByTestId("calculate-btn");

    fireEvent.change(startDateInput, { target: { value: "2026-04-01" } });
    fireEvent.change(endDateInput, { target: { value: "2026-04-07" } });

    // 日次のラジオボタンが選択されていることを確認
    const unitDailyRadio = screen.getByTestId("unit-daily-radio");
    expect(unitDailyRadio).toBeChecked();

    // 集計ボタンクリック
    fireEvent.click(calculateBtn);

    // 集計結果の表示確認
    await waitFor(() => {
      expect(screen.getByTestId("summary-row")).toBeInTheDocument();
    });

    expect(screen.getByTestId("row-worker-name")).toHaveTextContent("作業員 A");
    expect(screen.getByTestId("row-contractor-name")).toHaveTextContent("株式会社 A建設");
    expect(screen.getByTestId("row-date")).toHaveTextContent("2026-04-01");
    expect(screen.getByTestId("row-hours")).toHaveTextContent("9.00 時間");
  });

  test("TST-013-002: 月次労働時間集計の表示確認", async () => {
    // データ登録
    const db = await getDB();
    
    const clockInTime = "2026-04-01T08:00:00+09:00";
    const clockOutTime = "2026-04-01T16:00:00+09:00"; // 8時間差

    const tx = db.transaction(["attendance_records"], "readwrite");
    await tx.objectStore("attendance_records").put({
      attendance_id: "att-3",
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      punch_type: "CLOCK_IN",
      clocked_at: clockInTime,
      punched_by: "user-1",
      photo_object_id: "photo-2",
      created_at: clockInTime,
    });
    await tx.objectStore("attendance_records").put({
      attendance_id: "att-4",
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      punch_type: "CLOCK_OUT",
      clocked_at: clockOutTime,
      punched_by: "user-1",
      photo_object_id: "photo-2",
      created_at: clockOutTime,
    });
    await tx.done;

    render(<LaborSummaryPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "労働時間集計" })).toBeInTheDocument();
    });

    const startDateInput = screen.getByTestId("start-date-input");
    const endDateInput = screen.getByTestId("end-date-input");
    const unitMonthlyRadio = screen.getByTestId("unit-monthly-radio");
    const calculateBtn = screen.getByTestId("calculate-btn");

    fireEvent.change(startDateInput, { target: { value: "2026-04-01" } });
    fireEvent.change(endDateInput, { target: { value: "2026-04-30" } });
    fireEvent.click(unitMonthlyRadio);

    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(screen.getByTestId("summary-row")).toBeInTheDocument();
    });

    expect(screen.getByTestId("row-worker-name")).toHaveTextContent("作業員 A");
    expect(screen.getByTestId("row-date")).toHaveTextContent("2026-04"); // YYYY-MM
    expect(screen.getByTestId("row-hours")).toHaveTextContent("8.00 時間");
  });

  test("TST-013-003: 開始日未入力時のバリデーションエラー", async () => {
    render(<LaborSummaryPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "労働時間集計" })).toBeInTheDocument();
    });

    const endDateInput = screen.getByTestId("end-date-input");
    const calculateBtn = screen.getByTestId("calculate-btn");

    fireEvent.change(endDateInput, { target: { value: "2026-04-07" } });
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(screen.getByTestId("error-start-date")).toHaveTextContent("開始日を入力してください");
    });
  });

  test("TST-013-004: 終了日整合性バリデーション（逆転日付）", async () => {
    render(<LaborSummaryPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "労働時間集計" })).toBeInTheDocument();
    });

    const startDateInput = screen.getByTestId("start-date-input");
    const endDateInput = screen.getByTestId("end-date-input");
    const calculateBtn = screen.getByTestId("calculate-btn");

    fireEvent.change(startDateInput, { target: { value: "2026-04-10" } });
    fireEvent.change(endDateInput, { target: { value: "2026-04-09" } });
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(screen.getByTestId("error-end-date")).toHaveTextContent("終了日は開始日以降の日付を指定してください");
    });
  });

  test("TST-013-005: CSVダウンロード動作確認", async () => {
    // window.URL.createObjectURL と revokeObjectURL のモック
    const createObjectURLMock = vi.fn(() => "blob:http://localhost/test-blob");
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock as any;
    global.URL.revokeObjectURL = revokeObjectURLMock as any;

    // aタグのclickモック
    const clickMock = vi.fn();
    const createElementOriginal = document.createElement;
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = createElementOriginal.call(document, tagName);
      if (tagName === "a") {
        el.click = clickMock;
      }
      return el;
    });

    // データを登録
    const db = await getDB();
    const clockInTime = "2026-04-01T08:00:00+09:00";
    const clockOutTime = "2026-04-01T17:00:00+09:00"; // 9時間差

    const tx = db.transaction(["attendance_records"], "readwrite");
    await tx.objectStore("attendance_records").put({
      attendance_id: "att-csv",
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      punch_type: "CLOCK_IN",
      clocked_at: clockInTime,
      punched_by: "user-1",
      photo_object_id: "photo-csv",
      created_at: clockInTime,
    });
    await tx.objectStore("attendance_records").put({
      attendance_id: "att-csv-out",
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      punch_type: "CLOCK_OUT",
      clocked_at: clockOutTime,
      punched_by: "user-1",
      photo_object_id: "photo-csv",
      created_at: clockOutTime,
    });
    await tx.done;

    render(<LaborSummaryPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "労働時間集計" })).toBeInTheDocument();
    });

    const startDateInput = screen.getByTestId("start-date-input");
    const endDateInput = screen.getByTestId("end-date-input");
    const calculateBtn = screen.getByTestId("calculate-btn");

    fireEvent.change(startDateInput, { target: { value: "2026-04-01" } });
    fireEvent.change(endDateInput, { target: { value: "2026-04-07" } });
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(screen.getByTestId("summary-row")).toBeInTheDocument();
    });

    const downloadBtn = screen.getByTestId("csv-download-btn");
    expect(downloadBtn).toBeInTheDocument();
    fireEvent.click(downloadBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
  });

  test("TST-013-006: 未ログイン状態でのリダイレクト", async () => {
    // sessionStorage を空にする
    if (typeof window !== "undefined") {
      window.sessionStorage.clear();
    }

    render(<LaborSummaryPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin-login");
    });
  });
});
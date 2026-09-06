import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttendanceHistoryPage from "@/app/(factory)/attendance-history/page";
import "fake-indexeddb/auto";
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

// Mock logout
vi.mock("@/lib/auth", () => ({
  logout: vi.fn(),
}));

describe("SCR-012 AttendanceHistoryPage", () => {
  beforeEach(async () => {
    mockPush.mockClear();

    // Session mock (Factory Admin authenticated)
    const mockSessionStorage = {
      getItem: vi.fn((key) => {
        if (key === "user_id") return "user-admin";
        if (key === "role") return "FACTORY_ADMIN";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(global, "sessionStorage", {
      value: mockSessionStorage,
      configurable: true,
    });

    // DB setup and data seeding
    const db = await getDB();
    const tx = db.transaction(
      ["attendance_records", "workers", "contractors", "photo_blobs"],
      "readwrite"
    );
    await tx.objectStore("attendance_records").clear();
    await tx.objectStore("photo_blobs").clear();

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const localDateISO = `${yyyy}-${mm}-${dd}T10:00:00.000Z`;

    // Seed 1 active attendance record
    await tx.objectStore("attendance_records").put({
      attendance_id: "att-test-1",
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      punch_type: "CLOCK_IN",
      clocked_at: localDateISO,
      punched_by: "user-1",
      photo_object_id: "photo-test-1",
      created_at: localDateISO,
    });

    // Seed dummy photo blob
    const dummyBlob = new Blob(["dummy"], { type: "image/jpeg" });
    await tx.objectStore("photo_blobs").put({
      photo_object_id: "photo-test-1",
      blob: dummyBlob,
      content_type: "image/jpeg",
      byte_size: dummyBlob.size,
      uploaded_by: "user-1",
      uploaded_at: localDateISO,
    });

    await tx.done;

    // URL helper mock for ObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:http://localhost/dummy-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("should render correct initial active date filter and fetch today records", async () => {
    render(<AttendanceHistoryPage />);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    await waitFor(() => {
      expect(screen.queryByText("認証確認中...")).not.toBeInTheDocument();
    });

    const dateInput = screen.getByTestId("date-filter") as HTMLInputElement;
    expect(dateInput.value).toBe(todayStr);

    // Ensure dummy seeded record (作業員 A, 出勤) is rendered
    await waitFor(() => {
      expect(screen.getByTestId("row-worker-name-att-test-1")).toHaveTextContent("作業員 A");
      expect(screen.getByTestId("status-clock-in")).toBeInTheDocument();
    });
  });

  it("should open photo modal on thumbnail click", async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("photo-thumbnail-att-test-1")).toBeInTheDocument();
    });

    const thumbnail = screen.getByTestId("photo-thumbnail-att-test-1");
    fireEvent.click(thumbnail);

    expect(screen.getByTestId("photo-modal-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("photo-modal-image")).toHaveAttribute("src", "blob:http://localhost/dummy-url");

    // Close photo modal
    const closeBtn = screen.getByTestId("close-photo-modal-btn");
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId("photo-modal-overlay")).not.toBeInTheDocument();
  });

  it("should open correction modal with populated data", async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("correct-btn-att-test-1")).toBeInTheDocument();
    });

    const correctBtn = screen.getByTestId("correct-btn-att-test-1");
    fireEvent.click(correctBtn);

    expect(screen.getByTestId("correction-modal-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("correction-modal-title")).toHaveTextContent("打刻修正 : 作業員 A");
  });

  it("should display validation error if reason is empty on correction save", async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("correct-btn-att-test-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("correct-btn-att-test-1"));

    const saveBtn = screen.getByTestId("modal-submit-btn");
    fireEvent.click(saveBtn);

    // Reason should show validation error
    await waitFor(() => {
      expect(screen.getByTestId("modal-reason-error")).toHaveTextContent("修正理由は必須です");
    });
  });

  it("should successfully update record on valid reason submit", async () => {
    render(<AttendanceHistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("correct-btn-att-test-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("correct-btn-att-test-1"));

    // Enter reason
    const reasonTextarea = screen.getByTestId("modal-reason-textarea");
    fireEvent.change(reasonTextarea, { target: { value: "システム不具合による修正" } });

    // Change status to CLOCK_OUT (退勤)
    const outRadio = screen.getByTestId("modal-punch-type-out");
    fireEvent.click(outRadio);

    const saveBtn = screen.getByTestId("modal-submit-btn");
    fireEvent.click(saveBtn);

    // Wait for modal to close and update listing
    await waitFor(() => {
      expect(screen.queryByTestId("correction-modal-overlay")).not.toBeInTheDocument();
    });

    // Expect status of list row to have changed to CLOCK_OUT (退勤)
    await waitFor(() => {
      expect(screen.getByTestId("status-clock-out")).toBeInTheDocument();
    });
  });
});
import { NextResponse } from "next/server";

export async function GET() {
  // 工場側管理者向け総合ダッシュボードのモックデータ
  const mockData = {
    summary: {
      working_workers_count: 24,
      active_contractors_count: 2,
      total_workers_registered: 45,
    },
    alerts: [
      {
        alert_id: "ALT-001",
        type: "MISSING_CLOCK_OUT",
        message: "山田 太郎（A社）の退刻打刻がありません。",
        severity: "WARNING",
        occurred_at: "2026-04-13T18:00:00+09:00",
      },
    ],
  };

  return NextResponse.json(mockData);
}
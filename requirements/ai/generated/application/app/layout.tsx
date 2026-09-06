import "./globals.css";
import React from "react";

export const metadata = {
  title: "勤怠・配置管理システム",
  description: "外注作業員 勤怠・配置管理システム プロトタイプ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
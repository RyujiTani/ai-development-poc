import React from 'react';
import './globals.css';

export const metadata = {
  title: '外注作業員 勤怠・配置管理システム',
  description: 'モックアッププロトタイプ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
import React from 'react';
import './globals.css';

export const metadata = {
  title: '外注作業員 勤怠・配置管理システム',
  description: 'プロトタイプ画面検証',
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

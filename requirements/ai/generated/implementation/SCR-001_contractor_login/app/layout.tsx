import React from 'react';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata = {
  title: '外注作業員 勤怠・配置管理システム',
  description: '外注作業員 勤怠・配置管理システム（テストプロジェクト版）',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
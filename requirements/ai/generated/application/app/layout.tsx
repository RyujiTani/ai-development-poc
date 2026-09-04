import React from 'react';
import { ToastProvider } from '../components/ui/toast';
import './globals.css';

export const metadata = {
  title: '外注作業員 勤怠・配置管理システム',
  description: 'Next.js プロトタイプ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
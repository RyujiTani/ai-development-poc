import React from 'react';
import { AuthProvider } from '@/lib/auth/authContext';
import '@/app/globals.css';

export const metadata = {
  title: '外注作業員 勤怠・配置管理システム',
  description: '工場側管理者ダッシュボード',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
"
    },
    {
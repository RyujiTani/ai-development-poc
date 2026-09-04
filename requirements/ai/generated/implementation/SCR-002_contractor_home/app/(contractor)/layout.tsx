'use client';

import React from 'react';
import { AuthProvider } from '../../lib/auth/authContext';

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
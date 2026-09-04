'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { seedDatabase } from '@/lib/db/indexedDb';

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await seedDatabase();

    if (loginId === 'admin' && password === 'admin') {
      sessionStorage.setItem('user_id', 'u1');
      sessionStorage.setItem('role', 'FACTORY_ADMIN');
      router.push('/labor-time-summary');
    } else {
      setError('IDまたはパスワードが正しくありません (検証用: admin/admin)');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">管理者ログイン</h1>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ログインID</label>
            <input
              type="text"
              className="mt-1 w-full rounded border p-2 text-black focus:outline-blue-500"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">パスワード</label>
            <input
              type="password"
              className="mt-1 w-full rounded border p-2 text-black focus:outline-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-blue-600 py-2.5 text-white font-semibold hover:bg-blue-700 transition"
          >
            ログイン (検証用)
          </button>
        </form>
      </div>
    </div>
  );
}
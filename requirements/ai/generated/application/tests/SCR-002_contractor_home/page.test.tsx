import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContractorHomePage from '@/app/(contractor)/home/page';
import { initDB } from '@/lib/db/indexedDB';
import 'fake-indexeddb/auto';

const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

describe('SCR-002_contractor_home', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('TS-SCR-002-001: sessionStorage が未設定の状態のとき /login に遷移すること', async () => {
    render(<ContractorHomePage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TS-SCR-002-002: sessionStorage にログイン情報があり、IndexedDB からユーザー名を取得できるとき表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1-uuid');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'c1-uuid',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: 'テスト管理者',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z'
    });
    await tx.done;

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('テスト管理者')).toBeInTheDocument();
  });

  it('TS-SCR-002-003: 打刻ボタンクリックで /contractor/punch-mode に遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1-uuid');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'c1-uuid',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: 'テスト管理者',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z'
    });
    await tx.done;

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const punchButton = screen.getByRole('button', { name: /^打刻$/ });
    fireEvent.click(punchButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor/punch-mode');
  });

  it('TS-SCR-002-004: 作業員管理ボタンクリックで /contractor/workers に遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1-uuid');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'c1-uuid',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: 'テスト管理者',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z'
    });
    await tx.done;

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const workerButton = screen.getByRole('button', { name: /作業員管理/ });
    fireEvent.click(workerButton);

    expect(mockPush).toHaveBeenCalledWith('/contractor/workers');
  });

  it('TS-SCR-002-005: ログアウトボタンクリックでセッションがクリアされ /login に遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1-uuid');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');

    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'u1-uuid',
      contractor_id: 'c1-uuid',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'subcon1',
      password_hash: 'password123',
      display_name: 'テスト管理者',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z'
    });
    await tx.done;

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButton);

    expect(sessionStorage.getItem('user_id')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
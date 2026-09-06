import { getDB } from "@/lib/db";
import { User, Role } from "../domain/types";

export async function getUsers(): Promise<User[]> {
  const db = await getDB();
  const tx = db.transaction("users", "readonly");
  const store = tx.objectStore("users");
  const list = await store.getAll();
  await tx.done;
  return list;
}

export async function createUser(data: {
  login_id: string;
  password_raw: string;
  display_name: string;
  role: Role;
  contractor_id: string | null;
}): Promise<User> {
  const db = await getDB();
  
  // ログインIDの重複チェック
  const txCheck = db.transaction("users", "readonly");
  const storeCheck = txCheck.objectStore("users");
  const index = storeCheck.index("by-login-id");
  const existing = await index.get(data.login_id);
  await txCheck.done;
  
  if (existing) {
    throw new Error("このユーザーIDは既に登録されています");
  }
  
  const tx = db.transaction("users", "readwrite");
  const store = tx.objectStore("users");
  
  const user_id = `user-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  
  const newUser: User = {
    user_id,
    contractor_id: data.role === "FACTORY_ADMIN" ? null : data.contractor_id,
    role: data.role,
    login_id: data.login_id,
    password_hash: btoa(data.password_raw), // 既存認証に合わせた簡易Base64ハッシュ
    display_name: data.display_name,
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
  };
  
  await store.put(newUser);
  await tx.done;
  return newUser;
}

export async function updateUser(
  user_id: string,
  data: {
    display_name: string;
    role: Role;
    contractor_id: string | null;
    status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
    password_raw?: string;
  }
): Promise<User> {
  const db = await getDB();
  const tx = db.transaction("users", "readwrite");
  const store = tx.objectStore("users");
  
  const existing: User | undefined = await store.get(user_id);
  if (!existing) {
    throw new Error("ユーザーアカウントが見つかりません");
  }
  
  const now = new Date().toISOString();
  const updated: User = {
    ...existing,
    display_name: data.display_name,
    role: data.role,
    contractor_id: data.role === "FACTORY_ADMIN" ? null : data.contractor_id,
    status: data.status,
    updated_at: now,
  };
  
  if (data.password_raw) {
    updated.password_hash = btoa(data.password_raw);
  }
  
  await store.put(updated);
  await tx.done;
  return updated;
}

export async function deleteUser(user_id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("users", "readwrite");
  const store = tx.objectStore("users");
  await store.delete(user_id);
  await tx.done;
}
import { User, Contractor } from "@/features/user/domain/user";

const DB_NAME = "worker_attendance_db";
const DB_VERSION = 1;

export function getIndexedDB(): IDBFactory | null {
  if (typeof window === "undefined") return null;
  return window.indexedDB || (window as any).mozIndexedDB || (window as any).webkitIndexedDB || (window as any).msIndexedDB;
}

const initialContractors: Contractor[] = [
  {
    contractor_id: "c1",
    name: "A建設",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    contractor_id: "c2",
    name: "B工業",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    contractor_id: "c3",
    name: "C設備",
    status: "INACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const initialUsers: User[] = [
  {
    user_id: "admin-default-id",
    contractor_id: null,
    role: "FACTORY_ADMIN",
    login_id: "admin_test",
    password_hash: "YWRtaW4xMjM=", // "admin123" の base64
    display_name: "工場管理者（初期）",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = getIndexedDB();
    if (!idb) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("contractors")) {
        db.createObjectStore("contractors", { keyPath: "contractor_id" });
      }
      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", { keyPath: "user_id" });
        userStore.createIndex("login_id", "login_id", { unique: true });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      seedDataIfEmpty(db)
        .then(() => resolve(db))
        .catch((err) => reject(err));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function seedDataIfEmpty(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["contractors", "users"], "readwrite");
    const contractorsStore = transaction.objectStore("contractors");
    const usersStore = transaction.objectStore("users");

    const checkRequest = contractorsStore.count();
    checkRequest.onsuccess = () => {
      if (checkRequest.result === 0) {
        initialContractors.forEach((c) => {
          contractorsStore.put(c);
        });
        initialUsers.forEach((u) => {
          usersStore.put(u);
        });
      }
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}
"
    },
    {
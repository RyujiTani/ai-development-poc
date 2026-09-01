import { logger } from "@/lib/logger/logger";

const DB_NAME = "WorkerAttendanceDB";
const DB_VERSION = 1;

export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in browser environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      logger.error("Database failed to open", { error: String(request.error || event) });
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("contractors")) {
        db.createObjectStore("contractors", { keyPath: "contractor_id" });
      }

      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", { keyPath: "user_id" });
        userStore.createIndex("login_id", "login_id", { unique: true });
      }

      const transaction = request.transaction!;
      
      transaction.oncomplete = () => {
        const populateDb = indexedDB.open(DB_NAME, DB_VERSION);
        populateDb.onsuccess = () => {
          const activeDb = populateDb.result;
          const seedTx = activeDb.transaction(["contractors", "users"], "readwrite");
          
          const contractorStore = seedTx.objectStore("contractors");
          const userStore = seedTx.objectStore("users");

          const contractor = {
            contractor_id: "contractor-001",
            name: "大同工業株式会示",
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          contractorStore.put(contractor);

          const contractorUser = {
            user_id: "user-001",
            contractor_id: "contractor-001",
            role: "CONTRACTOR_MANAGER",
            login_id: "contractor_admin",
            password_hash: hashPassword("password123"),
            display_name: "外注先管理者 A",
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          userStore.put(contractorUser);

          const factoryUser = {
            user_id: "user-002",
            contractor_id: null,
            role: "FACTORY_ADMIN",
            login_id: "factory_admin",
            password_hash: hashPassword("password123"),
            display_name: "工場管理者 B",
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          userStore.put(factoryUser);

          logger.info("IndexedDB seed completed successfully", { event: "SEED" });
        };
      };
    };
  });
}
"}, {
import { initDB } from './idb';

export async function seedDatabase(): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['users', 'contractors'], 'readwrite');
    const userStore = tx.objectStore('users');
    const contractorStore = tx.objectStore('contractors');

    const contractorCountReq = contractorStore.count();
    contractorCountReq.onsuccess = () => {
      if (contractorCountReq.result === 0) {
        const contractors = [
          {
            contractor_id: 'c1',
            name: '大和建設株式会社',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            contractor_id: 'c2',
            name: '東洋設備サービス',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];
        contractors.forEach(c => contractorStore.put(c));
      }
    };

    const userCountReq = userStore.count();
    userCountReq.onsuccess = () => {
      if (userCountReq.result === 0) {
        const users = [
          {
            user_id: 'admin',
            login_id: 'admin',
            contractor_id: null,
            role: 'FACTORY_ADMIN',
            password_hash: 'admin123',
            display_name: '工場側管理者A',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            user_id: 'manager1',
            login_id: 'manager1',
            contractor_id: 'c1',
            role: 'CONTRACTOR_MANAGER',
            password_hash: 'manager123',
            display_name: '大和建設マネージャー',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];
        users.forEach(u => userStore.put(u));
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
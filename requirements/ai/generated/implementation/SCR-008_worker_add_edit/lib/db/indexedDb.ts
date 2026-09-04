import { Worker } from '@/features/worker/domain/worker';

export interface DbSchema {
  workers: Worker[];
}

const DEFAULT_SEED_DATA: DbSchema = {
  workers: [
    {
      worker_id: 'worker-123',
      contractor_id: 'contractor-abc',
      name: '佐藤 次郎',
      contact: '080-1111-2222',
      qualifications: ['QUAL_002'],
      trainings: [
        { code: 'TR_001', taken_at: '2026-04-01' }
      ],
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    }
  ]
};

// クライアント側（ブラウザ）の模擬IndexedDB。
// 容量制限・非同期動作・セッション継続を模擬するため、localStorageにて管理
export const getDb = async (): Promise<DbSchema> => {
  if (typeof window === 'undefined') {
    return DEFAULT_SEED_DATA;
  }
  const raw = localStorage.getItem('mock_indexed_db');
  if (!raw) {
    localStorage.setItem('mock_indexed_db', JSON.stringify(DEFAULT_SEED_DATA));
    return DEFAULT_SEED_DATA;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SEED_DATA;
  }
};

export const saveDb = async (db: DbSchema): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mock_indexed_db', JSON.stringify(db));
  }
};

export const resetDb = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mock_indexed_db', JSON.stringify(DEFAULT_SEED_DATA));
  }
};
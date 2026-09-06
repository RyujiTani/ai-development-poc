import { getDB } from './indexedDB';

export interface AuditLog {
  audit_id: string;
  occurred_at: string;
  actor_user_id?: string;
  actor_role?: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  action: string;
  target_type?: string;
  target_id?: string;
  detail?: Record<string, any>;
}

export async function recordAuditLog(log: Omit<AuditLog, 'audit_id' | 'occurred_at'>) {
  try {
    const db = await getDB();
    const audit_id = crypto.randomUUID();
    const occurred_at = new Date().toISOString();
    const newLog: AuditLog = {
      ...log,
      audit_id,
      occurred_at,
    };
    const tx = db.transaction('audit_logs', 'readwrite');
    await tx.store.put(newLog);
    await tx.done;
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}
import { initDB } from '@/lib/db';
import { AttendanceRecord, PhotoBlob, AttendanceCorrection } from '../domain/types';
import { AttendanceRepository } from './attendanceRepository';

export class IndexedDBAttendanceRepository implements AttendanceRepository {
  async saveRecord(record: AttendanceRecord): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('attendance_records', 'readwrite');
    await tx.objectStore('attendance_records').put(record);
    await tx.done;
  }

  async savePhotoBlob(photo: PhotoBlob): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('photo_blobs', 'readwrite');
    await tx.objectStore('photo_blobs').put(photo);
    await tx.done;
  }

  async saveCorrection(correction: AttendanceCorrection): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('attendance_corrections', 'readwrite');
    await tx.objectStore('attendance_corrections').put(correction);
    await tx.done;
  }

  async findRecordById(attendanceId: string): Promise<AttendanceRecord | null> {
    const db = await initDB();
    const tx = db.transaction('attendance_records', 'readonly');
    const store = tx.objectStore('attendance_records');
    const records = (await store.getAll()) as AttendanceRecord[];
    await tx.done;

    const record = records.find((r) => r.attendance_id === attendanceId);
    return record || null;
  }

  // 新規追加
  async getAllRecords(): Promise<AttendanceRecord[]> {
    const db = await initDB();
    const tx = db.transaction('attendance_records', 'readonly');
    const store = tx.objectStore('attendance_records');
    const records = (await store.getAll()) as AttendanceRecord[];
    await tx.done;
    return records;
  }

  async findPhotoBlobById(photoObjectId: string): Promise<PhotoBlob | null> {
    const db = await initDB();
    const tx = db.transaction('photo_blobs', 'readonly');
    const store = tx.objectStore('photo_blobs');
    const blobs = (await store.getAll()) as PhotoBlob[];
    await tx.done;
    return blobs.find((b) => b.photo_object_id === photoObjectId) || null;
  }
}
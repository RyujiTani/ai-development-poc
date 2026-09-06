import { getDB } from "@/lib/db/indexedDB";
import { AttendanceRecord } from "../domain/AttendanceRecord";
import { PhotoBlob } from "../domain/PhotoBlob";
import { AttendanceCorrection } from "../domain/AttendanceCorrection";
import { IAttendanceRepository } from "./attendanceRepository";

export class IndexedDBAttendanceRepository implements IAttendanceRepository {
  async savePunch(records: AttendanceRecord[], photo: PhotoBlob): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(["attendance_records", "photo_blobs"], "readwrite");
    
    // 写真Blobを保存
    await tx.objectStore("photo_blobs").put(photo);
    
    // 打刻履歴を保存
    const attendanceStore = tx.objectStore("attendance_records");
    for (const record of records) {
      await attendanceStore.put(record);
    }
    
    await tx.done;
  }

  async saveCorrection(correction: AttendanceCorrection, record: AttendanceRecord): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(["attendance_records", "attendance_corrections"], "readwrite");
    
    // 打刻実績を保存 (新規登録または更新)
    await tx.objectStore("attendance_records").put(record);
    
    // 修正履歴を保存
    await tx.objectStore("attendance_corrections").put(correction);
    
    await tx.done;
  }

  async getRecordById(attendanceId: string): Promise<AttendanceRecord | null> {
    const db = await getDB();
    const tx = db.transaction("attendance_records", "readonly");
    const record = await tx.store.get(attendanceId);
    await tx.done;
    return (record as AttendanceRecord) || null;
  }

  async getRecordsByContractorId(contractorId: string): Promise<AttendanceRecord[]> {
    const db = await getDB();
    const tx = db.transaction("attendance_records", "readonly");
    const records = await tx.store.getAll();
    await tx.done;
    // contractor_id でフィルタ
    return (records as AttendanceRecord[]).filter(r => r.contractor_id === contractorId);
  }

  async getAllRecords(): Promise<AttendanceRecord[]> {
    const db = await getDB();
    const tx = db.transaction("attendance_records", "readonly");
    const records = await tx.store.getAll();
    await tx.done;
    return records as AttendanceRecord[];
  }

  async getPhotoBlob(photoObjectId: string): Promise<PhotoBlob | null> {
    const db = await getDB();
    const tx = db.transaction("photo_blobs", "readonly");
    const photo = await tx.store.get(photoObjectId);
    await tx.done;
    return (photo as PhotoBlob) || null;
  }
}
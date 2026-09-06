import { AttendanceRecord, PhotoBlob, AttendanceCorrection } from '../domain/types';

export interface AttendanceRepository {
  saveRecord(record: AttendanceRecord): Promise<void>;
  savePhotoBlob(photo: PhotoBlob): Promise<void>;
  saveCorrection(correction: AttendanceCorrection): Promise<void>;
  findRecordById(attendanceId: string): Promise<AttendanceRecord | null>;
  // 工場側管理者要件のための拡張（後方互換性を保つためにオプショナルで定義）
  getAllRecords?(): Promise<AttendanceRecord[]>;
  findPhotoBlobById?(photoObjectId: string): Promise<PhotoBlob | null>;
}
import { AttendanceRecord } from "../domain/AttendanceRecord";
import { PhotoBlob } from "../domain/PhotoBlob";
import { AttendanceCorrection } from "../domain/AttendanceCorrection";

export interface IAttendanceRepository {
  savePunch(records: AttendanceRecord[], photo: PhotoBlob): Promise<void>;
  saveCorrection(correction: AttendanceCorrection, record: AttendanceRecord): Promise<void>;
  getRecordById(attendanceId: string): Promise<AttendanceRecord | null>;
  getRecordsByContractorId(contractorId: string): Promise<AttendanceRecord[]>;
  getAllRecords(): Promise<AttendanceRecord[]>;
  getPhotoBlob(photoObjectId: string): Promise<PhotoBlob | null>;
}
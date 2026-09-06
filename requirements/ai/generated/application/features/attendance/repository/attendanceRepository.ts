import { getDB } from "@/lib/db";

export async function saveAttendanceAndPhoto(
  workerIds: string[],
  contractorId: string,
  punchType: "CLOCK_IN" | "CLOCK_OUT",
  photoBlob: Blob,
  userId: string
): Promise<void> {
  const db = await getDB();
  const photo_object_id = `photo-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();

  // 写真Blobレコードを用意
  const photoRecord = {
    photo_object_id,
    blob: photoBlob,
    content_type: "image/jpeg",
    byte_size: photoBlob.size,
    uploaded_by: userId,
    uploaded_at: now,
  };

  const tx = db.transaction(["photo_blobs", "attendance_records"], "readwrite");

  // 写真Blob保存
  await tx.objectStore("photo_blobs").put(photoRecord);

  // 各作業員ごとの打刻レコード保存
  for (const workerId of workerIds) {
    const attendance_id = `att-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    const attendanceRecord = {
      attendance_id,
      worker_id: workerId,
      contractor_id: contractorId,
      punch_type: punchType,
      clocked_at: now,
      punched_by: userId,
      photo_object_id,
      created_at: now,
    };
    await tx.objectStore("attendance_records").put(attendanceRecord);
  }

  await tx.done;
}

export interface AttendanceCorrectionInput {
  attendance_id?: string;
  worker_id: string;
  punch_type: "CLOCK_IN" | "CLOCK_OUT";
  punched_at: string; // ISO8601
  reason: string;
  userId: string;
  contractorId: string;
}

export async function saveAttendanceCorrection(input: AttendanceCorrectionInput): Promise<string> {
  const db = await getDB();
  const tx = db.transaction(["attendance_records", "attendance_corrections"], "readwrite");
  const recordsStore = tx.objectStore("attendance_records");
  const correctionsStore = tx.objectStore("attendance_corrections");

  const now = new Date().toISOString();
  let targetAttendanceId = input.attendance_id;
  let beforeData: any = null;

  if (targetAttendanceId) {
    // 既存修正
    const existing = await recordsStore.get(targetAttendanceId);
    if (existing) {
      beforeData = { ...existing };
      existing.punch_type = input.punch_type;
      existing.clocked_at = input.punched_at;
      await recordsStore.put(existing);
    } else {
      // 既存レコードが見つからなかった場合は新規作成としてフォールバック
      targetAttendanceId = `att-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
      const newRecord = {
        attendance_id: targetAttendanceId,
        worker_id: input.worker_id,
        contractor_id: input.contractorId,
        punch_type: input.punch_type,
        clocked_at: input.punched_at,
        punched_by: input.userId,
        photo_object_id: "",
        created_at: now,
      };
      await recordsStore.put(newRecord);
    }
  } else {
    // 新規手動打刻登録
    targetAttendanceId = `att-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    const newRecord = {
      attendance_id: targetAttendanceId,
      worker_id: input.worker_id,
      contractor_id: input.contractorId,
      punch_type: input.punch_type,
      clocked_at: input.punched_at,
      punched_by: input.userId,
      photo_object_id: "",
      created_at: now,
    };
    await recordsStore.put(newRecord);
  }

  const correction_id = `corr-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const afterData = {
    attendance_id: targetAttendanceId,
    worker_id: input.worker_id,
    contractor_id: input.contractorId,
    punch_type: input.punch_type,
    clocked_at: input.punched_at,
    punched_by: input.userId,
  };

  const correctionRecord = {
    correction_id,
    attendance_id: targetAttendanceId,
    corrected_by: input.userId,
    reason: input.reason,
    before: beforeData,
    after: afterData,
    corrected_at: now,
  };

  await correctionsStore.put(correctionRecord);
  await tx.done;

  return correction_id;
}
export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';

export interface AttendanceRecord {
  attendance_id: string;
  worker_id: string;
  contractor_id: string;
  punch_type: PunchType;
  clocked_at: string;             // ISO8601
  punched_by: string;             // user_id
  geo?: { lat: number; lng: number };
  photo_object_id: string;
  created_at: string;
}
"
    },
    {
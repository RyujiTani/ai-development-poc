export interface PhotoBlob {
  photo_object_id: string;
  blob: Blob;                     // IndexedDB に Blob 直接保存
  content_type: string;
  byte_size: number;
  uploaded_by: string;
  uploaded_at: string;
}
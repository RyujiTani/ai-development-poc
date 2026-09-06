import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { IndexedDBAttendanceRepository } from "../repository/indexedDBAttendanceRepository";

export async function getPhotoBlobUseCase(photoObjectId: string): Promise<Result<Blob>> {
  try {
    const repo = new IndexedDBAttendanceRepository();
    const photoBlob = await repo.getPhotoBlob(photoObjectId);
    if (!photoBlob) {
      return {
        success: false,
        error: { code: "PHOTO_NOT_FOUND", message: "写真が見つかりません" }
      };
    }
    return {
      success: true,
      value: photoBlob.blob
    };
  } catch (error) {
    logger.error("GET_PHOTO_BLOB_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "写真の取得に失敗しました。" }
    };
  }
}
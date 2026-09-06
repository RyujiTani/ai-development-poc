import { AttendanceRepository } from '../repository/attendanceRepository';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export class GetPhotoBlobUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(photoObjectId: string): Promise<Result<Blob, AppError>> {
    try {
      if (!this.attendanceRepository.findPhotoBlobById) {
        return {
          success: false,
          error: new AppError('リポジトリが写真Blobの取得に対応していません。', 'NOT_IMPLEMENTED'),
        };
      }

      const photoBlobRecord = await this.attendanceRepository.findPhotoBlobById(photoObjectId);
      if (!photoBlobRecord) {
        return {
          success: false,
          error: new AppError('写真データが見つかりません。', 'NOT_FOUND'),
        };
      }

      return { success: true, value: photoBlobRecord.blob };
    } catch (e) {
      logger.error('GET_PHOTO_BLOB_ERROR', e, { photoObjectId });
      return {
        success: false,
        error: new AppError('写真の取得に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}
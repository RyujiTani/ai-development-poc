import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { AttendanceRepository, PhotoBlob } from '../repository/attendanceRepository';

export class GetPhotoBlobUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(photoObjectId: string): Promise<Result<PhotoBlob | null>> {
    try {
      logger.info('get_photo_blob_attempt', { photo_object_id: photoObjectId });
      const photo = await this.attendanceRepository.findPhotoById(photoObjectId);
      return { success: true, value: photo };
    } catch (error) {
      logger.error('get_photo_blob_failed', error, { photo_object_id: photoObjectId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '写真データの取得に失敗しました。' },
      };
    }
  }
}
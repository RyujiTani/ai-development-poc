'use client';

import React, { useEffect, useState } from 'react';
import { GetPhotoBlobUseCase } from '../usecase/getPhotoBlobUseCase';
import { IndexedDBAttendanceRepository } from '../repository/attendanceRepository';

interface AttendanceThumbnailProps {
  photoObjectId: string;
  onClick: () => void;
}

export const AttendanceThumbnail: React.FC<AttendanceThumbnailProps> = ({ photoObjectId, onClick }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    if (photoObjectId === 'MANUAL_ENTRY' || !photoObjectId) {
      setLoading(false);
      return;
    }

    const fetchPhoto = async () => {
      try {
        const repo = new IndexedDBAttendanceRepository();
        const useCase = new GetPhotoBlobUseCase(repo);
        const result = await useCase.execute(photoObjectId);

        if (result.success && result.value && active) {
          url = URL.createObjectURL(result.value.blob);
          setImageUrl(url);
        }
      } catch (err) {
        console.error('Failed to fetch thumbnail', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPhoto();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoObjectId]);

  if (loading) {
    return (
      <div className="w-12 h-12 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-[10px] text-gray-400">...</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
        <span className="text-[10px] text-gray-400">なし</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt="打刻写真"
      className="w-12 h-12 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    />
  );
};
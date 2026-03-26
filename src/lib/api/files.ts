import api from '../api';
import type { ApiResponse, FileUploadResponse } from './types';

export const filesService = {
  /** Upload a file (multipart/form-data) */
  async upload(file: File, folder?: 'avatars' | 'documents' | 'reports' | string) {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }
    const response = await api.post<ApiResponse<FileUploadResponse>>('/api/v1/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Get a presigned URL (15 min) for an object in MinIO */
  async getPresignedUrl(objectName: string) {
    const response = await api.get<ApiResponse<string>>('/api/v1/files/presigned-url', {
      params: { objectName },
    });
    return response.data;
  },

  /** Delete a file by object name */
  async delete(objectName: string) {
    const response = await api.delete<ApiResponse<void>>('/api/v1/files', {
      params: { objectName },
    });
    return response.data;
  },
};

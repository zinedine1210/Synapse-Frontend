export type MaterialStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
export type MaterialType = 'PDF' | 'AUDIO' | 'IMAGE';

export interface Material {
  id: string;
  sessionId: string;
  fileName: string;
  fileUrl: string;
  fileType: MaterialType;
  fileSizeBytes?: number;
  aiSummary?: string;
  status: MaterialStatus;
  errorMsg?: string;
  createdAt: string;
}

export interface UploadMaterialResponse {
  message: string;
  materialId: string;
  status: 'PROCESSING';
}

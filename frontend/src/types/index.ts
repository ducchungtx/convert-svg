export interface User {
  id: number
  email: string
  name?: string
  image?: string
  role: 'USER' | 'PREMIUM' | 'ADMIN'
  dailyLimit: number
  usedToday: number
  resetDate: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface Conversion {
  id: number
  userId?: number
  jobId?: string
  fromFormat: string
  toFormat: string
  originalFilename?: string
  convertedFilename?: string
  fileSize?: number
  outputFileSize?: number
  ipAddress?: string
  userAgent?: string
  status: ConversionStatus
  progress: number
  errorMessage?: string
  processingTime?: number
  downloadUrl?: string
  downloadCount: number
  expiresAt?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export type ConversionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

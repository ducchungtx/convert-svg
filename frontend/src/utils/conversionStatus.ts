/**
 * Utility functions for checking conversion status
 */

export interface ConversionStatus {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  progress: number;
  fromFormat: string;
  toFormat: string;
  originalFilename: string;
  convertedFilename?: string;
  fileSize: number;
  outputFileSize?: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * Check conversion status
 */
export async function checkConversionStatus(conversionId: number): Promise<ConversionStatus> {
  const response = await fetch(`/api/conversion/${conversionId}/status`);

  if (!response.ok) {
    throw new Error('Failed to check conversion status');
  }

  const data = await response.json();
  return data.data.conversion;
}

/**
 * Poll conversion status until completion
 */
export async function pollConversionStatus(
  conversionId: number,
  onUpdate?: (status: ConversionStatus) => void,
  interval: number = 2000,
  timeout: number = 300000 // 5 minutes
): Promise<ConversionStatus> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const poll = async () => {
      try {
        const status = await checkConversionStatus(conversionId);

        if (onUpdate) {
          onUpdate(status);
        }

        // Check if completed
        if (status.status === 'COMPLETED') {
          resolve(status);
          return;
        }

        // Check if failed
        if (status.status === 'FAILED' || status.status === 'CANCELLED' || status.status === 'EXPIRED') {
          reject(new Error(status.errorMessage || `Conversion ${status.status.toLowerCase()}`));
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          reject(new Error('Conversion timeout'));
          return;
        }

        // Continue polling
        setTimeout(poll, interval);

      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

/**
 * Download converted file
 */
export async function downloadConvertedFile(conversionId: number, filename?: string): Promise<void> {
  const response = await fetch(`/api/conversion/${conversionId}/download`);

  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `converted_file`;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

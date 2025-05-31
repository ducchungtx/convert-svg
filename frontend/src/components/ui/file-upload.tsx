'use client'

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileIcon, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatFileSize, isValidFileType } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile: File | null
  acceptedFormats: string[]
  maxSize: number
  className?: string
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  acceptedFormats,
  maxSize,
  className
}: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      if (!isValidFileType(file, acceptedFormats)) {
        alert(`Only ${acceptedFormats.join(', ')} files are allowed`)
        return
      }
      if (file.size > maxSize) {
        alert(`File size must be less than ${formatFileSize(maxSize)}`)
        return
      }
      onFileSelect(file)
    }
  }, [onFileSelect, acceptedFormats, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => {
      acc[`image/${format}`] = [`.${format}`]
      return acc
    }, {} as Record<string, string[]>),
    maxFiles: 1,
    maxSize
  })

  return (
    <div className={cn("w-full", className)}>
      {!selectedFile ? (
        <Card
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed cursor-pointer transition-colors hover:border-primary/50",
            isDragActive && "border-primary bg-primary/5"
          )}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop the file here' : 'Upload your file'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: {acceptedFormats.join(', ')} • Max size: {formatFileSize(maxSize)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <FileIcon className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onFileRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

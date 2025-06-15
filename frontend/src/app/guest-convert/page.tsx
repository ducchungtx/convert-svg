"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import {
  Upload,
  FileImage,
  X,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

interface GuestConversionFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "converting" | "completed" | "error" | "failed";
  targetFormat: string;
  outputUrl?: string;
  downloadUrl?: string;
  error?: string;
  progress?: number;
}

interface ConversionSettings {
  format: string;
  quality: number;
  maintainAspectRatio: boolean;
}

interface GuestLimits {
  maxFiles: number;
  maxFileSize: number;
  dailyLimit: number;
  supportedFormats: string[];
  rateLimitPerMinute: number;
}

const DEFAULT_GUEST_SUPPORTED_FORMATS = [
  { value: "png", label: "PNG", description: "Portable Network Graphics" },
  { value: "jpg", label: "JPG", description: "JPEG Image" },
  { value: "pdf", label: "PDF", description: "Portable Document Format" },
];

const DEFAULT_GUEST_LIMITS: GuestLimits = {
  maxFiles: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  dailyLimit: 5,
  supportedFormats: ["png", "jpg", "pdf"],
  rateLimitPerMinute: 2
};

// API function to fetch guest limits
const fetchGuestLimits = async (): Promise<GuestLimits> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/guest/limits`);
    if (response.ok) {
      const data = await response.json();
      return data.data.limits;
    }
  } catch (error) {
    console.error('Failed to fetch guest limits:', error);
  }
  return DEFAULT_GUEST_LIMITS;
};

// Utility functions for localStorage
const getGuestUsageData = () => {
  if (typeof window === 'undefined') return { count: 0, date: new Date().toDateString() };

  try {
    const saved = localStorage.getItem('guest-conversions');
    if (saved) {
      const data = JSON.parse(saved);
      const today = new Date().toDateString();

      // Reset if it's a new day
      if (data.date !== today) {
        return { count: 0, date: today };
      }

      return data;
    }
  } catch (error) {
    console.error('Error reading guest usage data:', error);
  }

  return { count: 0, date: new Date().toDateString() };
};

const setGuestUsageData = (count: number) => {
  if (typeof window === 'undefined') return;

  try {
    const data = {
      count,
      date: new Date().toDateString()
    };
    localStorage.setItem('guest-conversions', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving guest usage data:', error);
  }
};

const resetGuestUsage = () => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('guest-conversions');
  } catch (error) {
    console.error('Error resetting guest usage:', error);
  }
};

export default function GuestConvertPage() {
  const [files, setFiles] = useState<GuestConversionFile[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: "png",
    quality: 90,
    maintainAspectRatio: true,
  });
  const [conversionsUsed, setConversionsUsed] = useState(0);
  const [guestLimits, setGuestLimits] = useState<GuestLimits>(DEFAULT_GUEST_LIMITS);
  const [supportedFormats, setSupportedFormats] = useState(DEFAULT_GUEST_SUPPORTED_FORMATS);
  // const [isLoadingLimits, setIsLoadingLimits] = useState(true);

  // Load guest limits from API
  useEffect(() => {
    const loadGuestLimits = async () => {
      try {
        const limits = await fetchGuestLimits();
        setGuestLimits(limits);

        // Update supported formats based on API response
        const formatsData = limits.supportedFormats.map(format => {
          const existing = DEFAULT_GUEST_SUPPORTED_FORMATS.find(f => f.value === format);
          if (existing) return existing;
          return {
            value: format,
            label: format.toUpperCase(),
            description: `${format.toUpperCase()} format`
          };
        });
        setSupportedFormats(formatsData);
      } catch (error) {
        console.error('Failed to load guest limits:', error);
      } finally {
        // setIsLoadingLimits(false);
      }
    };

    loadGuestLimits();
  }, []);

  // Load usage data on component mount
  useEffect(() => {
    const usageData = getGuestUsageData();
    setConversionsUsed(usageData.count);
  }, []);

  // Update localStorage when conversionsUsed changes
  useEffect(() => {
    if (conversionsUsed > 0) {
      setGuestUsageData(conversionsUsed);
    }
  }, [conversionsUsed]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Calculate total conversions that would be used (current usage + pending files + new files)
      const totalConversionsNeeded = conversionsUsed + files.length + acceptedFiles.length;

      // Check daily limit including pending files
      if (totalConversionsNeeded > guestLimits.dailyLimit) {
        const remaining = Math.max(0, guestLimits.dailyLimit - conversionsUsed - files.length);
        if (remaining === 0) {
          toast.error(`Daily limit reached! You've used all ${guestLimits.dailyLimit} conversions today. Please register for more!`);
        } else {
          toast.error(`You can only add ${remaining} more file(s) today. You've used ${conversionsUsed} conversions and have ${files.length} files pending.`);
        }
        return;
      }

      // Check file count limit per batch
      if (files.length + acceptedFiles.length > guestLimits.maxFiles) {
        toast.error(`Guest users can only convert ${guestLimits.maxFiles} files at once. Please register for batch conversion!`);
        return;
      }

      // Check file size
      const oversizedFiles = acceptedFiles.filter(file => file.size > guestLimits.maxFileSize);
      if (oversizedFiles.length > 0) {
        toast.error(`File size limit: ${Math.round(guestLimits.maxFileSize / 1024 / 1024)}MB for guest users. Please register for larger files!`);
        return;
      }

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        toast.error("Only SVG files are supported for guest conversion");
        return;
      }

      const newFiles: GuestConversionFile[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        status: "pending",
        targetFormat: settings.format,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`Added ${acceptedFiles.length} file(s) for conversion`);
    },
    [settings.format, files.length, conversionsUsed, guestLimits]
  );

  const cannotAddMoreFiles = conversionsUsed + files.length >= guestLimits.dailyLimit;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/svg+xml": [".svg"],
    },
    multiple: true,
    maxFiles: guestLimits.maxFiles,
    disabled: cannotAddMoreFiles, // Disable when at or over daily limit
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const convertFiles = async () => {
    // Get only files that are not completed yet
    const filesToConvert = files.filter(f => f.status !== "completed");

    if (filesToConvert.length === 0) {
      toast.error("No files to convert");
      return;
    }

    // Check if converting these files would exceed daily limit
    if (conversionsUsed + filesToConvert.length > guestLimits.dailyLimit) {
      toast.error("Converting these files would exceed your daily limit. Please register for unlimited conversions.");
      return;
    }

    try {
      // Create FormData for API request
      const formData = new FormData();
      filesToConvert.forEach((file) => {
        formData.append("files", file.file);
      });
      formData.append("targetFormat", settings.format);
      formData.append("quality", settings.quality.toString());

      // Set files to converting status (only the ones being converted)
      setFiles((prev) =>
        prev.map((file) =>
          filesToConvert.some(f => f.id === file.id)
            ? {
              ...file,
              status: "converting" as const,
              progress: 0,
            }
            : file
        )
      );

      // Call guest upload API
      const response = await fetch("/api/guest-upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      // Update conversions used count
      setConversionsUsed((prev) => prev + filesToConvert.length);

      // Update files with conversion IDs and start polling for progress
      setFiles((prev) =>
        prev.map((file) => {
          const convertIndex = filesToConvert.findIndex(f => f.id === file.id);
          if (convertIndex >= 0) {
            return {
              ...file,
              id: result.conversions[convertIndex]?.id || file.id,
              status: "converting" as const,
            };
          }
          return file;
        })
      );

      // Start polling for conversion progress
      filesToConvert.forEach((file, index) => {
        const conversionId = result.conversions[index]?.id;
        if (conversionId) {
          // Use the conversion ID as both conversionId and fileId since we updated the file.id above
          pollConversionStatus(conversionId, conversionId);
        }
      });

      toast.success(`Started converting ${filesToConvert.length} file(s)`);

    } catch (error) {
      console.error("Conversion error:", error);
      toast.error(error instanceof Error ? error.message : "Conversion failed");

      // Reset file status on error (only for files that were being converted)
      setFiles((prev) =>
        prev.map((file) =>
          filesToConvert.some(f => f.id === file.id)
            ? {
              ...file,
              status: "pending" as const,
              progress: 0,
            }
            : file
        )
      );
    }
  };

  const pollConversionStatus = async (conversionId: string, fileId: string) => {
    const maxAttempts = 30; // 30 attempts = 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const response = await fetch(`/api/guest-conversion?id=${conversionId}`);
        const conversion = await response.json(); if (response.ok) {
          setFiles((prev) =>
            prev.map((file) =>
              file.id === fileId
                ? {
                  ...file,
                  progress: conversion.progress || 0,
                  status: conversion.status === "COMPLETED" ? "completed" : "converting",
                  downloadUrl: conversion.downloadUrl,
                }
                : file
            )
          );

          // Continue polling if not completed and within attempt limit
          if (conversion.status !== "COMPLETED" && attempts < maxAttempts) {
            setTimeout(poll, 2000); // Poll every 2 seconds
          } else if (attempts >= maxAttempts) {
            // Timeout - mark as failed
            setFiles((prev) =>
              prev.map((file) =>
                file.id === fileId
                  ? { ...file, status: "failed" as const }
                  : file
              )
            );
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        // Continue polling unless max attempts reached
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      }
    };

    poll();
  };

  const downloadFile = (file: GuestConversionFile) => {
    if (!file.downloadUrl && !file.outputUrl) return;

    if (file.downloadUrl) {
      // Use guest download API
      window.open(file.downloadUrl, '_blank');
    } else if (file.outputUrl) {
      // Fallback to local URL (for demo/development)
      const link = document.createElement("a");
      link.href = file.outputUrl;
      link.download = `${file.file.name.replace(/\.[^/.]+$/, "")}.${file.targetFormat}`;
      link.click();
    }
  };

  const clearAll = () => {
    files.forEach((file) => {
      URL.revokeObjectURL(file.preview);
      if (file.outputUrl) {
        URL.revokeObjectURL(file.outputUrl);
      }
    });
    setFiles([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isConverting = files.some((f) => f.status === "converting");
  const allFilesCompleted = files.length > 0 && files.every((f) => f.status === "completed");
  const pendingFiles = files.filter(f => f.status !== "completed");
  const remainingConversions = guestLimits.dailyLimit - conversionsUsed - files.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <FileImage className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">SVG Converter</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Guest Mode
              </Badge>
              <Link href="/login">
                <Button variant="ghost" className="text-blue-600 hover:text-blue-800">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gray-400 text-white hover:bg-gray-400 hover:text-blue-800">Upgrade</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Guest Limitations Alert */}
        <Alert className="border-orange-200 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Guest Limitations:</strong> {guestLimits.maxFiles} files max, {Math.round(guestLimits.maxFileSize / 1024 / 1024)}MB per file, {guestLimits.dailyLimit} conversions per day.
            <Link href="/register" className="underline font-semibold ml-1">
              Register for unlimited access!
            </Link>
          </AlertDescription>
        </Alert>

        {/* Daily Limit Reached Alert */}
        {cannotAddMoreFiles && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>
                {conversionsUsed >= guestLimits.dailyLimit ? 'Daily limit reached!' : 'Cannot add more files!'}
              </strong>
              {conversionsUsed >= guestLimits.dailyLimit ? (
                <>You&apos;ve used all {guestLimits.dailyLimit} conversions today.</>
              ) : (
                <>
                  You&apos;ve used {conversionsUsed} conversions
                  {pendingFiles.length > 0 && ` and have ${pendingFiles.length} files pending`},
                  reaching your daily limit of {guestLimits.dailyLimit}.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Counter */}
        <Card className={`p-4 bg-white ${conversionsUsed >= guestLimits.dailyLimit
          ? 'border-red-200 bg-red-50'
          : cannotAddMoreFiles
            ? 'border-orange-200 bg-orange-50'
            : 'border-blue-200'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold ${conversionsUsed >= guestLimits.dailyLimit
                ? 'text-red-900'
                : cannotAddMoreFiles
                  ? 'text-orange-900'
                  : 'text-gray-900'
                }`}>
                Daily Usage {
                  conversionsUsed >= guestLimits.dailyLimit
                    ? '(Limit Reached)'
                    : cannotAddMoreFiles
                      ? '(At Limit)'
                      : ''
                }
              </h3>
              <p className={`text-sm ${conversionsUsed >= guestLimits.dailyLimit
                ? 'text-red-700'
                : cannotAddMoreFiles
                  ? 'text-orange-700'
                  : 'text-gray-600'
                }`}>
                {conversionsUsed} of {guestLimits.dailyLimit} conversions used
                {pendingFiles.length > 0 && ` (${pendingFiles.length} files pending)`}
              </p>
              <p className={`text-xs mt-1 ${conversionsUsed >= guestLimits.dailyLimit ? 'text-red-600' : 'text-gray-500'
                }`}>
                Resets daily at midnight
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => {
                      resetGuestUsage();
                      setConversionsUsed(0);
                      toast.success('Usage reset for testing');
                    }}
                    className="ml-2 text-blue-500 underline hover:text-blue-700"
                  >
                    [Reset for testing]
                  </button>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${conversionsUsed >= guestLimits.dailyLimit ? 'text-red-600' : 'text-blue-600'
                }`}>
                {Math.max(0, remainingConversions)}
              </div>
              <div className={`text-sm ${conversionsUsed >= guestLimits.dailyLimit ? 'text-red-500' : 'text-gray-500'
                }`}>
                {conversionsUsed >= guestLimits.dailyLimit ? 'limit reached' : 'remaining'}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${conversionsUsed >= guestLimits.dailyLimit ? 'bg-red-600' : 'bg-blue-600'
                }`}
              style={{ width: `${Math.min((conversionsUsed + files.length) / guestLimits.dailyLimit * 100, 100)}%` }}
            ></div>
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conversion Settings */}
            <Card className="p-6 bg-white border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output Format
                  </label>
                  <Select
                    value={settings.format}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger className="text-black">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      {supportedFormats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{format.label}</span>
                            <span className="text-xs text-gray-500">
                              {format.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality (JPG only)
                  </label>
                  <Select
                    value={settings.quality.toString()}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, quality: parseInt(value) }))
                    }
                    disabled={settings.format !== "jpg"}
                  >
                    <SelectTrigger className="text-black">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="70">70% - Small file</SelectItem>
                      <SelectItem value="80">80% - Good quality</SelectItem>
                      <SelectItem value="90">90% - High quality</SelectItem>
                      <SelectItem value="95">95% - Best quality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* File Upload */}
            <Card className="p-6 bg-white border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upload Files</h2>
                {files.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${cannotAddMoreFiles
                  ? "border-red-300 bg-red-50 cursor-not-allowed opacity-60"
                  : isDragActive
                    ? "border-blue-400 bg-blue-50 cursor-pointer"
                    : "border-gray-300 hover:border-gray-400 cursor-pointer"
                  }`}
              >
                <input {...getInputProps()} />
                <Upload className={`mx-auto h-12 w-12 mb-4 ${cannotAddMoreFiles ? "text-red-400" : "text-gray-400"
                  }`} />
                {cannotAddMoreFiles ? (
                  <div>
                    <p className="text-red-600 font-medium mb-2">
                      {conversionsUsed >= guestLimits.dailyLimit ? 'Daily limit reached!' : 'Cannot add more files!'}
                    </p>
                    <p className="text-sm text-red-500">
                      {conversionsUsed >= guestLimits.dailyLimit ? (
                        <>
                          You&apos;ve used all {guestLimits.dailyLimit} daily conversions.
                        </>
                      ) : (
                        <>
                          Adding more files would exceed your daily limit of {guestLimits.dailyLimit} conversions.
                        </>
                      )}
                      <Link href="/register" className="underline hover:text-red-700 ml-1">
                        Register for unlimited access
                      </Link>
                    </p>
                  </div>
                ) : isDragActive ? (
                  <p className="text-blue-600 font-medium">Drop your SVG files here...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium mb-2">
                      Drag & drop SVG files here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Max {guestLimits.maxFiles} files, {Math.round(guestLimits.maxFileSize / 1024 / 1024)}MB each (SVG only)
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {Math.max(0, remainingConversions)} conversions remaining today
                      {files.length > 0 && ` (${files.length} files pending)`}
                    </p>
                  </div>
                )}
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-6 space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <FileImage className="h-10 w-10 text-blue-600" />
                          {file.status === "converting" && (
                            <Loader2 className="absolute inset-0 h-4 w-4 m-auto animate-spin text-blue-600" />
                          )}
                          {file.status === "completed" && (
                            <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-600 bg-white rounded-full" />
                          )}
                          {file.status === "error" && (
                            <AlertCircle className="absolute -top-1 -right-1 h-4 w-4 text-red-600 bg-white rounded-full" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{file.file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.file.size)} → {file.targetFormat.toUpperCase()}
                          </p>
                          {file.status === "converting" && file.progress !== undefined && (
                            <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {file.status === "completed" && (
                          <Button
                            size="sm"
                            onClick={() => downloadFile(file)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        {file.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Convert Button */}
              {files.length > 0 && !allFilesCompleted && (
                <div className="mt-6">
                  <Button
                    onClick={convertFiles}
                    disabled={isConverting || remainingConversions < 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Converting...
                      </>
                    ) : remainingConversions < 0 ? (
                      "Daily Limit Reached"
                    ) : (
                      `Convert ${pendingFiles.length} File${pendingFiles.length > 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              )}

              {/* All Files Completed Message */}
              {allFilesCompleted && (
                <div className="mt-6 space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      All files converted successfully! Download your files above.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-3">
                    <Button
                      onClick={clearAll}
                      variant="outline"
                      className="flex-1"
                    >
                      Convert More Files
                    </Button>
                    <Link href="/register" className="flex-1">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Upgrade for More
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Upgrade Sidebar */}
          <div className="space-y-6">
            {/* Upgrade CTA */}
            <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <h3 className="text-lg font-semibold mb-3">Unlock Full Power</h3>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-200" />
                  Unlimited conversions
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-200" />
                  Larger file sizes (100MB)
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-200" />
                  Batch conversion
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-200" />
                  Priority support
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-200" />
                  All formats (EPS, WEBP, etc.)
                </li>
              </ul>
              <Link href="/register">
                <Button className="w-full bg-white text-blue-600 hover:bg-gray-100">
                  Start Free Trial
                </Button>
              </Link>
            </Card>

            {/* Format Support */}
            <Card className="p-6 bg-white border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Supported Formats
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Input (Guest)</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">SVG</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Output (Guest)</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">PNG</Badge>
                    <Badge variant="outline">JPG</Badge>
                    <Badge variant="outline">PDF</Badge>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  Register to access EPS, WEBP, and more formats!
                </div>
              </div>
            </Card>

            {/* Help */}
            <Card className="p-6 bg-white border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  <strong>File too large?</strong> Try compressing your SVG or register for larger limits.
                </p>
                <p>
                  <strong>Conversion failed?</strong> Ensure your SVG file is valid and not corrupted.
                </p>
                <p>
                  <strong>Need more features?</strong> Sign up for unlimited conversions and advanced options.
                </p>
              </div>
              <Link href="/register" className="block mt-4">
                <Button variant="outline" size="sm" className="w-full text-black">
                  Get Full Access
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

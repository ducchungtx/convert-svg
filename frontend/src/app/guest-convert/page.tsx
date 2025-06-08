"use client";

import { useState, useCallback } from "react";
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

const GUEST_SUPPORTED_FORMATS = [
  { value: "png", label: "PNG", description: "Portable Network Graphics" },
  { value: "jpg", label: "JPG", description: "JPEG Image" },
  { value: "pdf", label: "PDF", description: "Portable Document Format" },
];

const GUEST_LIMITS = {
  maxFiles: 3,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  dailyLimit: 5,
};

export default function GuestConvertPage() {
  const [files, setFiles] = useState<GuestConversionFile[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: "png",
    quality: 90,
    maintainAspectRatio: true,
  });
  const [conversionsUsed, setConversionsUsed] = useState(0);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Check daily limit
      if (conversionsUsed >= GUEST_LIMITS.dailyLimit) {
        toast.error(`Guest users are limited to ${GUEST_LIMITS.dailyLimit} conversions per day. Please register for more!`);
        return;
      }

      // Check file count limit
      if (files.length + acceptedFiles.length > GUEST_LIMITS.maxFiles) {
        toast.error(`Guest users can only convert ${GUEST_LIMITS.maxFiles} files at once. Please register for batch conversion!`);
        return;
      }

      // Check file size
      const oversizedFiles = acceptedFiles.filter(file => file.size > GUEST_LIMITS.maxFileSize);
      if (oversizedFiles.length > 0) {
        toast.error(`File size limit: ${Math.round(GUEST_LIMITS.maxFileSize / 1024 / 1024)}MB for guest users. Please register for larger files!`);
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
    [settings.format, files.length, conversionsUsed]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/svg+xml": [".svg"],
    },
    multiple: true,
    maxFiles: GUEST_LIMITS.maxFiles,
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
    if (files.length === 0) {
      toast.error("Please add some files to convert");
      return;
    }

    if (conversionsUsed >= GUEST_LIMITS.dailyLimit) {
      toast.error("Daily limit reached! Please register for unlimited conversions.");
      return;
    }

    try {
      // Create FormData for API request
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file.file);
      });
      formData.append("targetFormat", settings.format);
      formData.append("quality", settings.quality.toString());

      // Set all files to converting status
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          status: "converting" as const,
          progress: 0,
        }))
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
      setConversionsUsed((prev) => prev + files.length);

      // Update files with conversion IDs and start polling for progress
      setFiles((prev) =>
        prev.map((file, index) => ({
          ...file,
          id: result.conversions[index]?.id || file.id,
          status: "converting" as const,
        }))
      );

      // Start polling for conversion progress
      files.forEach((file, index) => {
        const conversionId = result.conversions[index]?.id;
        if (conversionId) {
          pollConversionStatus(conversionId, file.id);
        }
      });

      toast.success(`Started converting ${files.length} file(s)`);

    } catch (error) {
      console.error("Conversion error:", error);
      toast.error(error instanceof Error ? error.message : "Conversion failed");

      // Reset file status on error
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          status: "pending" as const,
          progress: 0,
        }))
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
        const conversion = await response.json();

        if (response.ok) {
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
  const remainingConversions = GUEST_LIMITS.dailyLimit - conversionsUsed;

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
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Upgrade</Button>
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
            <strong>Guest Limitations:</strong> {GUEST_LIMITS.maxFiles} files max, {Math.round(GUEST_LIMITS.maxFileSize / 1024 / 1024)}MB per file, {GUEST_LIMITS.dailyLimit} conversions per day.
            <Link href="/register" className="underline font-semibold ml-1">
              Register for unlimited access!
            </Link>
          </AlertDescription>
        </Alert>

        {/* Usage Counter */}
        <Card className="p-4 bg-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Daily Usage</h3>
              <p className="text-sm text-gray-600">
                {conversionsUsed} of {GUEST_LIMITS.dailyLimit} conversions used
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{remainingConversions}</div>
              <div className="text-sm text-gray-500">remaining</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(conversionsUsed / GUEST_LIMITS.dailyLimit) * 100}%` }}
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      {GUEST_SUPPORTED_FORMATS.map((format) => (
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
                    <SelectTrigger>
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
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isDragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
                  }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                {isDragActive ? (
                  <p className="text-blue-600 font-medium">Drop your SVG files here...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium mb-2">
                      Drag & drop SVG files here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Max {GUEST_LIMITS.maxFiles} files, {Math.round(GUEST_LIMITS.maxFileSize / 1024 / 1024)}MB each (SVG only)
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
              {files.length > 0 && (
                <div className="mt-6">
                  <Button
                    onClick={convertFiles}
                    disabled={isConverting || remainingConversions <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Converting...
                      </>
                    ) : remainingConversions <= 0 ? (
                      "Daily Limit Reached"
                    ) : (
                      `Convert ${files.length} File${files.length > 1 ? "s" : ""}`
                    )}
                  </Button>
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
                <Button variant="outline" size="sm" className="w-full">
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

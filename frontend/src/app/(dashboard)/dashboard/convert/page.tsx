"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileImage,
  X,
  Download,
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface ConversionFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "converting" | "completed" | "error";
  targetFormat: string;
  outputUrl?: string;
  error?: string;
  progress?: number;
}

interface ConversionSettings {
  format: string;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  backgroundColor: string;
}

const SUPPORTED_FORMATS = [
  { value: "png", label: "PNG", description: "Portable Network Graphics" },
  { value: "jpg", label: "JPG", description: "JPEG Image" },
  { value: "pdf", label: "PDF", description: "Portable Document Format" },
  { value: "webp", label: "WebP", description: "Modern web format" },
  { value: "svg", label: "SVG (Optimized)", description: "Optimized SVG" },
];

export default function ConvertPage() {
  const [files, setFiles] = useState<ConversionFile[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: "png",
    quality: 90,
    maintainAspectRatio: true,
    backgroundColor: "transparent",
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: ConversionFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      targetFormat: settings.format,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`Added ${acceptedFiles.length} file(s) for conversion`);
  }, [settings.format]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/svg+xml": [".svg"],
    },
    multiple: true,
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

    // Set all files to converting status
    setFiles((prev) =>
      prev.map((file) => ({
        ...file,
        status: "converting" as const,
        progress: 0,
      }))
    );

    // Simulate conversion process
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress } : f
            )
          );
        }

        // Simulate successful conversion
        const mockOutputUrl = URL.createObjectURL(file.file);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                ...f,
                status: "completed" as const,
                outputUrl: mockOutputUrl,
                progress: 100,
              }
              : f
          )
        );

        toast.success(`${file.file.name} converted successfully`);
      } catch (error) {
        console.error("Upload error:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                ...f,
                status: "error" as const,
                error: "Conversion failed",
              }
              : f
          )
        );
        toast.error(`Failed to convert ${file.file.name}`);
      }
    }
  };

  const downloadFile = (file: ConversionFile) => {
    if (!file.outputUrl) return;

    const link = document.createElement("a");
    link.href = file.outputUrl;
    link.download = `${file.file.name.replace(/\.[^/.]+$/, "")}.${file.targetFormat}`;
    link.click();
  };

  const downloadAll = () => {
    const completedFiles = files.filter((f) => f.status === "completed" && f.outputUrl);
    completedFiles.forEach((file) => downloadFile(file));
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <FileImage className="h-5 w-5 text-muted-foreground" />;
      case "converting":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileImage className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const completedFiles = files.filter((f) => f.status === "completed");
  const isConverting = files.some((f) => f.status === "converting");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Convert SVG Files</h1>
          <p className="text-muted-foreground">
            Upload your SVG files and convert them to various formats.
          </p>
        </div>
        {completedFiles.length > 0 && (
          <Button onClick={downloadAll}>
            <Download className="mr-2 h-4 w-4" />
            Download All ({completedFiles.length})
          </Button>
        )}
      </div>

      {/* Conversion Settings */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Conversion Settings</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-muted-foreground hover:bg-muted"
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            {showAdvancedSettings ? "Hide" : "Show"} Advanced
          </Button>
        </div>

        <div className="space-y-4">
          {/* Output Format */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Output Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {SUPPORTED_FORMATS.map((format) => (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, format: format.value }))}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${settings.format === format.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border/60 bg-card"
                    }`}
                >
                  <div className="font-medium text-sm text-foreground">{format.label}</div>
                  <div className="text-xs text-muted-foreground">{format.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          {showAdvancedSettings && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quality */}
                {(settings.format === "jpg" || settings.format === "webp") && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Quality: {settings.quality}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={settings.quality}
                      onChange={(e) => setSettings((prev) => ({ ...prev, quality: parseInt(e.target.value) }))}
                      className="w-full accent-primary"
                    />
                  </div>
                )}

                {/* Background Color */}
                {settings.format !== "svg" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Background Color
                    </label>
                    <select
                      value={settings.backgroundColor}
                      onChange={(e) => setSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
                    >
                      <option value="transparent">Transparent</option>
                      <option value="white">White</option>
                      <option value="black">Black</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Dimensions */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="maintainAspectRatio"
                    checked={settings.maintainAspectRatio}
                    onChange={(e) => setSettings((prev) => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                    className="h-4 w-4 text-primary border-border rounded focus:ring-primary bg-background"
                  />
                  <label htmlFor="maintainAspectRatio" className="ml-2 text-sm text-foreground">
                    Maintain aspect ratio
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={settings.width || ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, width: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground placeholder-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={settings.height || ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, height: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground placeholder-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* File Upload Area */}
      <Card className="p-6 bg-card border-border">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
            ? "border-primary bg-primary/10"
            : "border-border hover:border-muted-foreground bg-muted/30"
            }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-lg text-primary">Drop your SVG files here...</p>
          ) : (
            <div>
              <p className="text-lg text-foreground mb-2">
                Drag & drop SVG files here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Supports multiple files • SVG format only
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Files ({files.length})
            </h2>
            <div className="space-x-2">
              {!isConverting && (
                <Button onClick={convertFiles} disabled={files.length === 0}>
                  Convert All Files
                </Button>
              )}
              <Button variant="outline" onClick={clearAll} className="border-border text-muted-foreground hover:bg-muted">
                Clear All
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(file.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.file.size)}</span>
                      <span>→</span>
                      <span>{file.targetFormat.toUpperCase()}</span>
                      {file.status === "converting" && file.progress !== undefined && (
                        <span>• {file.progress}%</span>
                      )}
                      {file.error && (
                        <span className="text-red-600">• {file.error}</span>
                      )}
                    </div>
                    {file.status === "converting" && file.progress !== undefined && (
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {file.status === "completed" && (
                    <Button size="sm" onClick={() => downloadFile(file)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === "converting"}
                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

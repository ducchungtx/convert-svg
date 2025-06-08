"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Download,
  FileImage,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";

interface Conversion {
  id: string;
  originalName: string;
  targetFormat: string;
  status: "COMPLETED" | "PROCESSING" | "FAILED" | "PENDING";
  createdAt: string;
  completedAt?: string;
  fileSize: number;
  outputSize?: number;
  downloadUrl?: string;
  error?: string;
}

const FILTER_OPTIONS = [
  { value: "all", label: "All Conversions" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
];

const FORMAT_OPTIONS = [
  { value: "all", label: "All Formats" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "pdf", label: "PDF" },
  { value: "webp", label: "WebP" },
  { value: "svg", label: "SVG" },
];

export default function HistoryPage() {
  const { data: session } = useSession();

  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [filteredConversions, setFilteredConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    conversionId: string;
    conversionName: string;
  }>({
    isOpen: false,
    conversionId: "",
    conversionName: "",
  });
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  // Fetch conversions from the API
  const fetchConversions = useCallback(async (page: number = 1) => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(formatFilter !== "all" && { format: formatFilter }),
      });

      const response = await fetch(`/api/conversion/history?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversions: ${response.statusText}`);
      }

      const data = await response.json();
      setConversions(data.conversions || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err: unknown) {
      console.error("Failed to fetch conversion history:", err);
      setError(err instanceof Error ? err.message : "Failed to load conversion history");
      setConversions([]);
    } finally {
      setLoading(false);
    }
  }, [session, statusFilter, formatFilter]);

  // Initial fetch and when filters change
  useEffect(() => {
    fetchConversions(currentPage);
  }, [currentPage, fetchConversions]);

  // Apply client-side filters for search and date
  useEffect(() => {
    let filtered = conversions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(conversion =>
        conversion.originalName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(conversion => {
        const createdDate = new Date(conversion.createdAt);

        switch (dateFilter) {
          case "today":
            return createdDate >= today;
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return createdDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return createdDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredConversions(filtered);
  }, [conversions, searchTerm, dateFilter]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />;
      case "PROCESSING":
        return <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />;
      case "FAILED":
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Completed";
      case "PROCESSING":
        return "Processing";
      case "FAILED":
        return "Failed";
      default:
        return "Pending";
    }
  };

  // Show notification helper
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const downloadFile = async (conversion: Conversion) => {
    if (conversion.status !== "COMPLETED" || !conversion.downloadUrl) return;

    try {
      setDownloadingFiles(prev => new Set([...prev, conversion.id]));

      const response = await fetch(conversion.downloadUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${conversion.originalName.replace(/\.[^/.]+$/, "")}.${conversion.targetFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification(`Downloaded ${conversion.originalName} successfully`, "success");
    } catch (error) {
      console.error("Download failed:", error);
      showNotification(`Failed to download ${conversion.originalName}`, "error");
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversion.id);
        return newSet;
      });
    }
  };

  const deleteConversion = async (id: string) => {
    try {
      const response = await fetch(`/api/conversion`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error("Delete failed");

      // Close confirmation dialog
      setDeleteConfirm({ isOpen: false, conversionId: "", conversionName: "" });

      // Refresh the list
      fetchConversions(currentPage);
    } catch (error) {
      console.error("Failed to delete conversion:", error);
    }
  };

  const handleDeleteClick = (conversion: Conversion) => {
    setDeleteConfirm({
      isOpen: true,
      conversionId: conversion.id,
      conversionName: conversion.originalName,
    });
  };

  const confirmDelete = () => {
    if (deleteConfirm.conversionId) {
      deleteConversion(deleteConfirm.conversionId);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, conversionId: "", conversionName: "" });
  };

  const downloadAll = async () => {
    const completedConversions = filteredConversions.filter(
      (c) => c.status === "COMPLETED" && c.downloadUrl
    );

    setDownloadingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const conversion of completedConversions) {
        try {
          await downloadFile(conversion);
          successCount++;
        } catch {
          errorCount++;
        }
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (errorCount === 0) {
        showNotification(`Successfully downloaded all ${successCount} files`, "success");
      } else if (successCount > 0) {
        showNotification(`Downloaded ${successCount} files, ${errorCount} failed`, "error");
      } else {
        showNotification(`Failed to download all files`, "error");
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return <PageLoader variant="list" />;
  }

  const completedConversions = filteredConversions.filter((c) => c.status === "COMPLETED");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversion History</h1>
          <p className="text-muted-foreground">
            View and manage your file conversion history.
          </p>
        </div>
        {completedConversions.length > 0 && (
          <Button onClick={downloadAll} disabled={downloadingAll}>
            <Download className="mr-2 h-4 w-4" />
            {downloadingAll ? "Downloading..." : `Download All (${completedConversions.length})`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
            />
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Format
              </label>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                {FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card className="p-6 bg-card border-border">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
            <p className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Conversions ({filteredConversions.length})
          </h2>
          {filteredConversions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredConversions.length} of {conversions.length} conversions
            </p>
          )}
        </div>

        {filteredConversions.length === 0 ? (
          <div className="text-center py-12">
            <FileImage className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              {conversions.length === 0 ? "No conversions yet" : "No conversions match your filters"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {conversions.length === 0
                ? "Start by converting your first SVG file."
                : "Try adjusting your search or filter criteria."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConversions.map((conversion) => (
              <div
                key={conversion.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(conversion.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conversion.originalName}
                      </p>
                      <span className="text-sm text-muted-foreground">→</span>
                      <span className="text-sm font-medium text-foreground">
                        {conversion.targetFormat.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{formatFileSize(conversion.fileSize)}</span>
                      {conversion.outputSize && (
                        <>
                          <span>→</span>
                          <span>{formatFileSize(conversion.outputSize)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatTimeAgo(conversion.createdAt)}</span>
                      {conversion.completedAt && (
                        <>
                          <span>•</span>
                          <span>
                            Completed {formatTimeAgo(conversion.completedAt)}
                          </span>
                        </>
                      )}
                    </div>

                    {conversion.error && (
                      <p className="text-xs text-destructive mt-1">{conversion.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${conversion.status === "COMPLETED"
                    ? "bg-green-600 text-white dark:bg-green-500 dark:text-green-950"
                    : conversion.status === "PROCESSING"
                      ? "bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950"
                      : "bg-red-600 text-white dark:bg-red-500 dark:text-red-950"
                    }`}>
                    {getStatusText(conversion.status)}
                  </span>

                  {conversion.status === "COMPLETED" && conversion.downloadUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(conversion)}
                      disabled={downloadingFiles.has(conversion.id)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/10 border-border"
                    >
                      {downloadingFiles.has(conversion.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteClick(conversion)}
                    disabled={conversion.status === "PROCESSING"}
                    className={`${conversion.status === "PROCESSING"
                      ? "text-muted-foreground cursor-not-allowed"
                      : "text-muted-foreground hover:text-destructive"
                      }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="border-border text-foreground hover:bg-accent"
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="border-border text-foreground hover:bg-accent"
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 shadow-xl border border-border">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive mr-3" />
              <h3 className="text-lg font-semibold text-foreground">
                Confirm Delete
              </h3>
            </div>

            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete the conversion for{" "}
              <span className="font-medium text-foreground">
                {deleteConfirm.conversionName}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
                className="text-muted-foreground hover:text-foreground border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg border ${notification.type === "success"
          ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
          : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          }`}>
          <div className="flex items-center">
            {notification.type === "success" ? (
              <CheckCircle className="h-5 w-5 mr-3" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-3" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

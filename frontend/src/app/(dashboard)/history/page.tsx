"use client";

import { useState, useEffect } from "react";
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

interface Conversion {
  id: string;
  originalName: string;
  targetFormat: string;
  status: "COMPLETED" | "PROCESSING" | "FAILED";
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
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [filteredConversions, setFilteredConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    // TODO: Fetch real data from API
    // For now, using mock data
    setTimeout(() => {
      const mockConversions: Conversion[] = [
        {
          id: "1",
          originalName: "logo.svg",
          targetFormat: "png",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          completedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
          fileSize: 2048,
          outputSize: 15360,
          downloadUrl: "#",
        },
        {
          id: "2",
          originalName: "icon-set.svg",
          targetFormat: "jpg",
          status: "PROCESSING",
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          fileSize: 1024,
        },
        {
          id: "3",
          originalName: "banner.svg",
          targetFormat: "pdf",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 30).toISOString(),
          fileSize: 4096,
          outputSize: 51200,
          downloadUrl: "#",
        },
        {
          id: "4",
          originalName: "illustration.svg",
          targetFormat: "png",
          status: "FAILED",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          fileSize: 8192,
          error: "Invalid SVG format",
        },
        {
          id: "5",
          originalName: "chart.svg",
          targetFormat: "webp",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 6 + 1000 * 15).toISOString(),
          fileSize: 3072,
          outputSize: 12288,
          downloadUrl: "#",
        },
        {
          id: "6",
          originalName: "interface-icons.svg",
          targetFormat: "svg",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 12 + 1000 * 5).toISOString(),
          fileSize: 5120,
          outputSize: 4096,
          downloadUrl: "#",
        },
      ];

      setConversions(mockConversions);
      setFilteredConversions(mockConversions);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = conversions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((conversion) =>
        conversion.originalName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((conversion) => conversion.status === statusFilter);
    }

    // Format filter
    if (formatFilter !== "all") {
      filtered = filtered.filter((conversion) => conversion.targetFormat === formatFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      if (dateFilter !== "all") {
        filtered = filtered.filter((conversion) =>
          new Date(conversion.createdAt) >= filterDate
        );
      }
    }

    setFilteredConversions(filtered);
  }, [conversions, searchTerm, statusFilter, formatFilter, dateFilter]);

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

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "PROCESSING":
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
      case "FAILED":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
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
        return "Unknown";
    }
  };

  const downloadFile = (conversion: Conversion) => {
    if (!conversion.downloadUrl) return;

    // In a real app, this would trigger the download
    window.open(conversion.downloadUrl, "_blank");
  };

  const deleteConversion = (id: string) => {
    setConversions((prev) => prev.filter((c) => c.id !== id));
  };

  const downloadAll = () => {
    const completedConversions = filteredConversions.filter(
      (c) => c.status === "COMPLETED" && c.downloadUrl
    );

    completedConversions.forEach((conversion) => {
      downloadFile(conversion);
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const completedConversions = filteredConversions.filter((c) => c.status === "COMPLETED");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversion History</h1>
          <p className="text-gray-600">
            View and manage your file conversion history.
          </p>
        </div>
        {completedConversions.length > 0 && (
          <Button onClick={downloadAll}>
            <Download className="mr-2 h-4 w-4" />
            Download All ({completedConversions.length})
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search conversions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Conversions ({filteredConversions.length})
          </h2>
          {filteredConversions.length > 0 && (
            <p className="text-sm text-gray-500">
              Showing {filteredConversions.length} of {conversions.length} conversions
            </p>
          )}
        </div>

        {filteredConversions.length === 0 ? (
          <div className="text-center py-12">
            <FileImage className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {conversions.length === 0 ? "No conversions yet" : "No conversions match your filters"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
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
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(conversion.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversion.originalName}
                      </p>
                      <span className="text-sm text-gray-500">→</span>
                      <span className="text-sm font-medium text-gray-700">
                        {conversion.targetFormat.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
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
                      <p className="text-xs text-red-500 mt-1">{conversion.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conversion.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : conversion.status === "PROCESSING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                    {getStatusText(conversion.status)}
                  </span>

                  {conversion.status === "COMPLETED" && conversion.downloadUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(conversion)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteConversion(conversion.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

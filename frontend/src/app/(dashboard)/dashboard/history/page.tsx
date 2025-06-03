"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { ConversionService } from "@/services/conversion.service";

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
  // Get session data to debug authentication
  const { data: session, status } = useSession();

  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [filteredConversions, setFilteredConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debug session on mount
  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
  }, [session, status]);

  // Define an interface for the API response outside of useEffect
  interface ApiConversion {
    id: number | string;
    status: string;
    progress: number;
    fromFormat: string;
    toFormat: string;
    originalFilename: string;
    fileSize: number;
    outputFileSize?: number;
    createdAt: string;
    completedAt?: string;
    downloadCount: number;
    errorMessage?: string;
  }

  // State for tracking errors
  const [error, setError] = useState<string | null>(null);
  const isLoading = useRef(false);

  // Debug log
  console.log('HistoryPage component rendered', { loading, conversions: conversions.length });

  // Tránh re-render không cần thiết và hạn chế gọi API liên tục
  const fetchConversions = useCallback(async (page: number) => {
    console.log('fetchConversions called with page:', page, 'isLoading.current:', isLoading.current);

    // Avoid multiple concurrent requests
    if (isLoading.current) {
      console.log('Skipping fetch due to loading state');
      return;
    }

    try {
      isLoading.current = true;
      setLoading(true);
      setError(null);

      console.log('Starting API call to getConversionHistory...');

      // Sử dụng ConversionService với retry logic và caching
      const response = await ConversionService.getConversionHistory(page, 20);

      console.log('API response received:', response);

      // Map the API response to our component's conversion format
      const mappedConversions = response.conversions.map((item: ApiConversion) => {
        // Convert the API structure to match our component structure
        return {
          id: item.id.toString(),
          originalName: item.originalFilename || "Untitled",
          targetFormat: (item.toFormat || '').toLowerCase(),
          status: item.status as "COMPLETED" | "PROCESSING" | "FAILED" | "PENDING",
          createdAt: item.createdAt,
          completedAt: item.completedAt,
          fileSize: item.fileSize || 0,
          outputSize: item.outputFileSize,
          downloadUrl: item.status === "COMPLETED" ? `/api/conversion/download/${item.id}` : undefined,
          error: item.status === "FAILED" ? item.errorMessage || "Conversion failed" : undefined
        };
      });

      setConversions(mappedConversions);
      setFilteredConversions(mappedConversions);
      setTotalPages(response.pagination.totalPages);

      console.log('Data successfully set:', {
        conversionsCount: mappedConversions.length,
        totalPages: response.pagination.totalPages
      });
    } catch (err: unknown) {
      console.error("Failed to fetch conversion history:", err);
      setError(err instanceof Error ? err.message : "Failed to load conversion history");
    } finally {
      console.log('fetchConversions finally block');
      setLoading(false);
      isLoading.current = false;
    }
  }, []);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('HistoryPage mounted, initial fetch should happen');
    console.log('Session info:', {
      status,
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      accessTokenPreview: session?.accessToken?.substring(0, 20) + '...'
    });

    // Check session status
    console.log('Checking authentication status...');

    return () => {
      console.log('HistoryPage unmounting');
    };
  }, [session, status]);

  // Add a test function to bypass authentication for debugging
  const testFetchWithoutAuth = useCallback(async () => {
    console.log('Testing API call without authentication...');
    try {
      const response = await fetch('http://localhost:3001/api/conversion/history?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Remove Authorization header for testing
        },
      });

      console.log('Test fetch response status:', response.status);
      console.log('Test fetch response headers:', response.headers);

      const data = await response.text();
      console.log('Test fetch response body:', data);
    } catch (error) {
      console.error('Test fetch error:', error);
    }
  }, []);

  // Add test button (temporary for debugging)
  const handleTestFetch = () => {
    testFetchWithoutAuth();
  };

  // Debug state for manual testing
  const [manualToken, setManualToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Test function with manual token
  const testWithManualToken = useCallback(async () => {
    if (!manualToken.trim()) {
      alert("Please enter a token first");
      return;
    }

    console.log('Testing with manual token:', manualToken.substring(0, 20) + '...');

    try {
      const response = await fetch('http://localhost:3001/api/conversion/history?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${manualToken}`,
        },
      });

      console.log('Manual token test response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Manual token test response:', data);

        if (data.success && data.data && data.data.conversions) {
          // Transform the data to match our format
          const mappedConversions = data.data.conversions.map((item: ApiConversion) => ({
            id: item.id.toString(),
            originalName: item.originalFilename || "Untitled",
            targetFormat: (item.toFormat || '').toLowerCase(),
            status: item.status as "COMPLETED" | "PROCESSING" | "FAILED" | "PENDING",
            createdAt: item.createdAt,
            completedAt: item.completedAt,
            fileSize: item.fileSize || 0,
            outputSize: item.outputFileSize,
            downloadUrl: item.status === "COMPLETED" ? `/api/conversion/download/${item.id}` : undefined,
            error: item.status === "FAILED" ? item.errorMessage || "Conversion failed" : undefined
          }));

          setConversions(mappedConversions);
          setFilteredConversions(mappedConversions);
          setTotalPages(data.data.pagination.totalPages);
          setError(null);
          alert('✅ Manual token test successful! Check console and history list.');
        }
      } else {
        const errorData = await response.text();
        console.error('Manual token test failed:', response.status, errorData);
        alert(`❌ Manual token test failed: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('Manual token test error:', error);
      alert(`❌ Manual token test error: ${error}`);
    }
  }, [manualToken]);

  useEffect(() => {
    console.log('useEffect for currentPage triggered:', {
      currentPage,
      status,
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken
    });

    // Only fetch when session is authenticated
    if (status === 'authenticated' && session) {
      console.log('Session is authenticated, will start fetch with debounce');
      // Thêm 500ms debounce để tránh nhiều request liên tiếp
      // và cải thiện trải nghiệm người dùng khi nhấn nút phân trang liên tiếp
      const timer = setTimeout(() => {
        console.log('Debounced timer calling fetchConversions');
        fetchConversions(currentPage);
      }, 500);

      return () => {
        console.log('Cleaning up timer');
        clearTimeout(timer);
      };
    } else if (status === 'unauthenticated') {
      console.log('Session is unauthenticated, setting error');
      setError('Please log in to view conversion history');
      setLoading(false);
    } else {
      console.log('Session is loading, waiting...');
    }
  }, [currentPage, fetchConversions, session, status]);

  // Tải lại dữ liệu khi quay lại tab (để cập nhật dữ liệu mới)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchConversions(currentPage);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentPage, fetchConversions]);

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
      case "PENDING":
        return <Clock className="h-5 w-5 text-blue-500" />;
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
      case "PENDING":
        return "Pending";
      case "FAILED":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const downloadFile = async (conversion: Conversion) => {
    if (conversion.status !== "COMPLETED") return;

    try {
      // Sử dụng ConversionService thay vì gọi API trực tiếp
      const blob = await ConversionService.downloadFile(conversion.id);

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create an anchor element and click it
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = conversion.originalName.replace(/\.[^/.]+$/, '') + '.' + conversion.targetFormat;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  };

  const deleteConversion = async (id: string) => {
    try {
      // Sử dụng ConversionService thay vì gọi API trực tiếp
      await ConversionService.deleteConversion(id);

      // Cập nhật trạng thái local sau khi xóa thành công
      setConversions((prev) => prev.filter((c) => c.id !== id));
      setFilteredConversions((prev) => prev.filter((c) => c.id !== id));

      // Xóa cache liên quan đến history
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('conversion_history_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Failed to delete conversion:", error);
    }
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
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            <p className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Conversions ({filteredConversions.length})
          </h2>
          <div className="flex items-center space-x-4">
            {/* Debug controls - remove in production */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleTestFetch}
                variant="outline"
                size="sm"
                className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
              >
                Test API
              </Button>

              {!showTokenInput ? (
                <Button
                  onClick={() => setShowTokenInput(true)}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  Test with Token
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Paste JWT token here..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="w-80 text-xs"
                  />
                  <Button
                    onClick={testWithManualToken}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Test
                  </Button>
                  <Button
                    onClick={() => setShowTokenInput(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {filteredConversions.length > 0 && (
              <p className="text-sm text-gray-500">
                Showing {filteredConversions.length} of {conversions.length} conversions
              </p>
            )}
          </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            Previous
          </Button>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Debug: Check session and token status */}
      <div className="mt-10 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          Debug: NextAuth Session
        </h3>
        <pre className="text-xs text-gray-500">
          {JSON.stringify({
            hasSession: !!session,
            user: session?.user,
            accessToken: session?.accessToken,
            sessionKeys: session ? Object.keys(session) : []
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}

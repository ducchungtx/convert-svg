"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  FileImage,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DashboardStats {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  totalUsers?: number;
}

interface RecentConversion {
  id: string;
  originalName: string;
  targetFormat: string;
  status: "COMPLETED" | "PROCESSING" | "FAILED";
  createdAt: string;
  fileSize: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalConversions: 0,
    successfulConversions: 0,
    failedConversions: 0,
  });
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    // For now, using mock data
    setTimeout(() => {
      setStats({
        totalConversions: 42,
        successfulConversions: 38,
        failedConversions: 4,
        totalUsers: session?.user?.role === "ADMIN" ? 156 : undefined,
      });

      setRecentConversions([
        {
          id: "1",
          originalName: "logo.svg",
          targetFormat: "PNG",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          fileSize: 2048,
        },
        {
          id: "2",
          originalName: "icon-set.svg",
          targetFormat: "JPG",
          status: "PROCESSING",
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          fileSize: 1024,
        },
        {
          id: "3",
          originalName: "banner.svg",
          targetFormat: "PDF",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          fileSize: 4096,
        },
      ]);

      setLoading(false);
    }, 1000);
  }, [session]);

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
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PROCESSING":
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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

  const successRate = stats.totalConversions > 0
    ? Math.round((stats.successfulConversions / stats.totalConversions) * 100)
    : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || "User"}!
          </h1>
          <p className="text-gray-600">
            {"Here's an overview of your SVG conversion activity."}
          </p>
        </div>
        <Link href="/dashboard/convert">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Convert Files
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileImage className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Conversions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalConversions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-gray-900">{stats.successfulConversions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
            </div>
          </div>
        </Card>

        {session?.user?.role === "ADMIN" && (
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Conversions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Conversions</h2>
          <Link href="/dashboard/history" className="text-blue-600 hover:text-blue-800 text-sm">
            View all
          </Link>
        </div>

        {recentConversions.length === 0 ? (
          <div className="text-center py-12">
            <FileImage className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No conversions yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by converting your first SVG file.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/convert">
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Convert Files
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {recentConversions.map((conversion) => (
              <div key={conversion.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(conversion.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {conversion.originalName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Convert to {conversion.targetFormat} • {formatFileSize(conversion.fileSize)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conversion.status === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : conversion.status === "PROCESSING"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                    }`}>
                    {getStatusText(conversion.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(conversion.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Upload className="h-6 w-6 text-blue-600" />
            <h3 className="ml-2 text-lg font-semibold text-gray-900">Convert Files</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Upload and convert your SVG files to various formats.
          </p>
          <Link href="/dashboard/convert">
            <Button
              variant="outline"
              className="w-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 font-medium"
            >
              Start Converting
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Clock className="h-6 w-6 text-green-600" />
            <h3 className="ml-2 text-lg font-semibold text-gray-900">View History</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Check your previous conversions and download files.
          </p>
          <Link href="/dashboard/history">
            <Button
              variant="outline"
              className="w-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 font-medium"
            >
              View History
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            <h3 className="ml-2 text-lg font-semibold text-gray-900">Analytics</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Track your usage patterns and conversion statistics.
          </p>
          <Button
            variant="outline"
            className="w-full border border-gray-300 bg-gray-100 text-gray-600 font-medium cursor-not-allowed"
            disabled
          >
            Coming Soon
          </Button>
        </Card>
      </div>
    </div>
  );
}

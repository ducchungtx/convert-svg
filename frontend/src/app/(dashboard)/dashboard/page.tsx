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
import { PageLoader } from "@/components/ui/page-loader";

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
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />;
      case "PROCESSING":
        return <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400 animate-spin" />;
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
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
    return <PageLoader variant="dashboard" />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {session?.user?.name || "User"}!
          </h1>
          <p className="text-muted-foreground">
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
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileImage className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Conversions</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalConversions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-foreground">{stats.successfulConversions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold text-foreground">{successRate}%</p>
            </div>
          </div>
        </Card>

        {session?.user?.role === "ADMIN" && (
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Conversions */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Recent Conversions</h2>
          <Link href="/dashboard/history" className="text-primary hover:text-primary/80 text-sm">
            View all
          </Link>
        </div>

        {recentConversions.length === 0 ? (
          <div className="text-center py-12">
            <FileImage className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No conversions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
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
              <div key={conversion.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(conversion.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {conversion.originalName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Convert to {conversion.targetFormat} • {formatFileSize(conversion.fileSize)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${conversion.status === "COMPLETED"
                    ? "bg-green-600 text-white dark:bg-green-500 dark:text-green-950"
                    : conversion.status === "PROCESSING"
                      ? "bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950"
                      : "bg-red-600 text-white dark:bg-red-500 dark:text-red-950"
                    }`}>
                    {getStatusText(conversion.status)}
                  </span>
                  <span className="text-sm text-muted-foreground">
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
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center mb-4">
            <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="ml-2 text-lg font-semibold text-foreground">Convert Files</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Upload and convert your SVG files to various formats.
          </p>
          <Link href="/dashboard/convert">
            <Button
              variant="outline"
              className="w-full border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground font-medium"
            >
              Start Converting
            </Button>
          </Link>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center mb-4">
            <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
            <h3 className="ml-2 text-lg font-semibold text-foreground">View History</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Check your previous conversions and download files.
          </p>
          <Link href="/dashboard/history">
            <Button
              variant="outline"
              className="w-full border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground font-medium"
            >
              View History
            </Button>
          </Link>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h3 className="ml-2 text-lg font-semibold text-foreground">Analytics</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Track your usage patterns and conversion statistics.
          </p>
          <Button
            variant="outline"
            className="w-full border-border bg-muted text-muted-foreground font-medium cursor-not-allowed"
            disabled
          >
            Coming Soon
          </Button>
        </Card>
      </div>
    </div>
  );
}

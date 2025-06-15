"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileImage,
  AlertCircle,
  Shield,
  Database,
  Activity,
  Search,
  Ban,
  UserCheck,
  Download,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  totalDataProcessed: number;
  serverUptime: number;
}

interface LimitConfiguration {
  id: string;
  subscriptionType: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE";
  userType: "USER" | "GUEST";
  maxFilesPerConversion: number;
  maxFileSize: number;
  maxDailyConversions: number | null;
  maxMonthlyConversions: number | null;
  allowedFormats: string[];
  maxConcurrentJobs: number;
  priorityLevel: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  isActive: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  createdAt: string;
  lastActivity: string;
  conversionsCount: number;
  dataUsed: number;
}

interface Conversion {
  id: string;
  userId: string;
  userName: string;
  originalName: string;
  targetFormat: string;
  status: "COMPLETED" | "PROCESSING" | "FAILED";
  createdAt: string;
  fileSize: number;
  processingTime?: number;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [limitConfigs, setLimitConfigs] = useState<LimitConfiguration[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  useEffect(() => {
    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    // TODO: Fetch real admin data from API
    setTimeout(() => {
      setStats({
        totalUsers: 156,
        activeUsers: 89,
        totalConversions: 2847,
        successfulConversions: 2654,
        failedConversions: 193,
        totalDataProcessed: 1024 * 1024 * 1024 * 2.5, // 2.5GB
        serverUptime: 99.9,
      });

      setUsers([
        {
          id: "1",
          name: "John Doe",
          email: "john@example.com",
          role: "USER",
          status: "ACTIVE",
          createdAt: "2024-01-15T10:00:00Z",
          lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          conversionsCount: 25,
          dataUsed: 1024 * 1024 * 50, // 50MB
        },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane@example.com",
          role: "USER",
          status: "ACTIVE",
          createdAt: "2024-01-20T14:30:00Z",
          lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          conversionsCount: 42,
          dataUsed: 1024 * 1024 * 85, // 85MB
        },
        {
          id: "3",
          name: "Bob Wilson",
          email: "bob@example.com",
          role: "USER",
          status: "SUSPENDED",
          createdAt: "2024-02-01T09:15:00Z",
          lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          conversionsCount: 8,
          dataUsed: 1024 * 1024 * 15, // 15MB
        },
      ]);

      setConversions([
        {
          id: "1",
          userId: "1",
          userName: "John Doe",
          originalName: "logo.svg",
          targetFormat: "png",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          fileSize: 2048,
          processingTime: 1.5,
        },
        {
          id: "2",
          userId: "2",
          userName: "Jane Smith",
          originalName: "illustration.svg",
          targetFormat: "pdf",
          status: "PROCESSING",
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          fileSize: 8192,
        },
        {
          id: "3",
          userId: "1",
          userName: "John Doe",
          originalName: "icon.svg",
          targetFormat: "jpg",
          status: "FAILED",
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          fileSize: 1024,
        },
      ]);

      // Mock limit configurations data
      setLimitConfigs([
        {
          id: "1",
          subscriptionType: "FREE",
          userType: "USER",
          maxFilesPerConversion: 1,
          maxFileSize: 1024 * 1024 * 5, // 5MB
          maxDailyConversions: 5,
          maxMonthlyConversions: 50,
          allowedFormats: ["png", "jpg", "jpeg"],
          maxConcurrentJobs: 1,
          priorityLevel: 1,
          rateLimitPerMinute: 5,
          rateLimitPerHour: 50,
          isActive: true,
        },
        {
          id: "2",
          subscriptionType: "FREE",
          userType: "GUEST",
          maxFilesPerConversion: 1,
          maxFileSize: 1024 * 1024 * 2, // 2MB
          maxDailyConversions: 3,
          maxMonthlyConversions: null,
          allowedFormats: ["png", "jpg"],
          maxConcurrentJobs: 1,
          priorityLevel: 0,
          rateLimitPerMinute: 3,
          rateLimitPerHour: 20,
          isActive: true,
        },
        {
          id: "3",
          subscriptionType: "BASIC",
          userType: "USER",
          maxFilesPerConversion: 3,
          maxFileSize: 1024 * 1024 * 10, // 10MB
          maxDailyConversions: 20,
          maxMonthlyConversions: 500,
          allowedFormats: ["png", "jpg", "jpeg", "pdf", "svg"],
          maxConcurrentJobs: 2,
          priorityLevel: 3,
          rateLimitPerMinute: 10,
          rateLimitPerHour: 100,
          isActive: true,
        },
        {
          id: "4",
          subscriptionType: "PREMIUM",
          userType: "USER",
          maxFilesPerConversion: 5,
          maxFileSize: 1024 * 1024 * 25, // 25MB
          maxDailyConversions: 100,
          maxMonthlyConversions: null,
          allowedFormats: ["png", "jpg", "jpeg", "pdf", "svg", "eps", "webp"],
          maxConcurrentJobs: 3,
          priorityLevel: 5,
          rateLimitPerMinute: 20,
          rateLimitPerHour: 200,
          isActive: true,
        },
        {
          id: "5",
          subscriptionType: "ENTERPRISE",
          userType: "USER",
          maxFilesPerConversion: 10,
          maxFileSize: 1024 * 1024 * 100, // 100MB
          maxDailyConversions: null,
          maxMonthlyConversions: null,
          allowedFormats: ["png", "jpg", "jpeg", "pdf", "svg", "eps", "webp", "tiff", "bmp"],
          maxConcurrentJobs: 5,
          priorityLevel: 10,
          rateLimitPerMinute: 50,
          rateLimitPerHour: 500,
          isActive: true,
        },
      ]);

      setLoading(false);
    }, 1000);
  }, [session, router]);

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

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
            ...user,
            status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
          }
          : user
      )
    );
  };

  const updateLimitConfig = (configId: string, updates: Partial<LimitConfiguration>) => {
    setLimitConfigs((prev) =>
      prev.map((config) =>
        config.id === configId
          ? { ...config, ...updates }
          : config
      )
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = userFilter === "all" || user.status === userFilter;
    return matchesSearch && matchesFilter;
  });

  const successRate = stats ? Math.round((stats.successfulConversions / stats.totalConversions) * 100) : 0;

  if (loading) {
    return <PageLoader variant="dashboard" />;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "conversions", label: "Conversions" },
    { id: "system", label: "System" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, monitor system performance, and view analytics.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Admin Access</span>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-xs text-green-600">{stats.activeUsers} active</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileImage className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Conversions</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalConversions}</p>
                <p className="text-xs text-green-600">{successRate}% success rate</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Data Processed</p>
                <p className="text-2xl font-bold text-foreground">{formatFileSize(stats.totalDataProcessed)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Server Uptime</p>
                <p className="text-2xl font-bold text-foreground">{stats.serverUptime}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 ${activeTab === tab.id
                ? "border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {conversions.slice(0, 5).map((conversion) => (
                <div key={conversion.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${conversion.status === "COMPLETED" ? "bg-green-500" :
                      conversion.status === "PROCESSING" ? "bg-orange-500" : "bg-red-500"
                      }`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {conversion.userName} converted {conversion.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(conversion.createdAt)} • {conversion.targetFormat.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${conversion.status === "COMPLETED" ? "bg-green-600 text-white" :
                    conversion.status === "PROCESSING" ? "bg-orange-500 text-white" :
                      "bg-red-600 text-white"
                    }`}>
                    {conversion.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* System Health */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">System Health</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Server Status</span>
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database</span>
                <span className="text-sm font-medium text-green-600">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Storage Usage</span>
                <span className="text-sm font-medium text-primary">65% of 100GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Processing Queue</span>
                <span className="text-sm font-medium text-orange-500">3 jobs pending</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "users" && (
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">User Management</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                <option value="all">All Users</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Data Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.status === "ACTIVE" ? "bg-green-600 text-white" :
                        user.status === "SUSPENDED" ? "bg-red-600 text-white" :
                          "bg-orange-500 text-white"
                        }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {user.conversionsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatFileSize(user.dataUsed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimeAgo(user.lastActivity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        size="sm"
                        variant={user.status === "ACTIVE" ? "destructive" : "default"}
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.status === "ACTIVE" ? (
                          <>
                            <Ban className="mr-1 h-3 w-3" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-1 h-3 w-3" />
                            Activate
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "conversions" && (
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6">Recent Conversions</h2>
          <div className="space-y-4">
            {conversions.map((conversion) => (
              <div key={conversion.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${conversion.status === "COMPLETED" ? "bg-green-600" :
                    conversion.status === "PROCESSING" ? "bg-orange-500" : "bg-red-600"
                    }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {conversion.originalName} → {conversion.targetFormat.toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      By {conversion.userName} • {formatFileSize(conversion.fileSize)}
                      {conversion.processingTime && ` • ${conversion.processingTime}s`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${conversion.status === "COMPLETED" ? "bg-green-600 text-white" :
                    conversion.status === "PROCESSING" ? "bg-orange-500 text-white" :
                      "bg-red-600 text-white"
                    }`}>
                    {conversion.status}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatTimeAgo(conversion.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "system" && (
        <div className="space-y-6">
          {/* Subscription Plans Configuration */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-6">Subscription Plans Configuration</h2>
            <div className="space-y-6">
              {["FREE", "BASIC", "PREMIUM", "ENTERPRISE"].map((planType) => {
                const userConfig = limitConfigs.find(
                  config => config.subscriptionType === planType && config.userType === "USER"
                );
                const guestConfig = limitConfigs.find(
                  config => config.subscriptionType === planType && config.userType === "GUEST"
                );

                return (
                  <div key={planType} className="border border-border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold text-lg ${planType === "FREE" ? "text-gray-600" :
                          planType === "BASIC" ? "text-blue-600" :
                            planType === "PREMIUM" ? "text-purple-600" :
                              "text-orange-600"
                        }`}>
                        {planType} Plan
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${planType === "FREE" ? "bg-gray-100 text-gray-800" :
                          planType === "BASIC" ? "bg-blue-100 text-blue-800" :
                            planType === "PREMIUM" ? "bg-purple-100 text-purple-800" :
                              "bg-orange-100 text-orange-800"
                        }`}>
                        {planType}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* User Configuration */}
                      {userConfig && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-foreground border-b border-border pb-2">
                            Registered Users
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Files per conversion:</span>
                              <span className="font-medium text-foreground">{userConfig.maxFilesPerConversion}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Max file size:</span>
                              <span className="font-medium text-foreground">{formatFileSize(userConfig.maxFileSize)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Daily conversions:</span>
                              <span className="font-medium text-foreground">
                                {userConfig.maxDailyConversions || "Unlimited"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Monthly conversions:</span>
                              <span className="font-medium text-foreground">
                                {userConfig.maxMonthlyConversions || "Unlimited"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Concurrent jobs:</span>
                              <span className="font-medium text-foreground">{userConfig.maxConcurrentJobs}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate limit/min:</span>
                              <span className="font-medium text-foreground">{userConfig.rateLimitPerMinute}</span>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-muted-foreground">Supported formats:</span>
                              <div className="flex flex-wrap gap-1">
                                {userConfig.allowedFormats.map((format) => (
                                  <span key={format} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                    {format.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Guest Configuration */}
                      {guestConfig && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-foreground border-b border-border pb-2">
                            Guest Users
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Files per conversion:</span>
                              <span className="font-medium text-foreground">{guestConfig.maxFilesPerConversion}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Max file size:</span>
                              <span className="font-medium text-foreground">{formatFileSize(guestConfig.maxFileSize)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Daily conversions:</span>
                              <span className="font-medium text-foreground">
                                {guestConfig.maxDailyConversions || "Unlimited"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Concurrent jobs:</span>
                              <span className="font-medium text-foreground">{guestConfig.maxConcurrentJobs}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate limit/min:</span>
                              <span className="font-medium text-foreground">{guestConfig.rateLimitPerMinute}</span>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-muted-foreground">Supported formats:</span>
                              <div className="flex flex-wrap gap-1">
                                {guestConfig.allowedFormats.map((format) => (
                                  <span key={format} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                    {format.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateLimitConfig(userConfig?.id || "", {})}
                        className="text-primary hover:bg-primary/10"
                      >
                        Edit Configuration
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Global System Configuration */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Global System Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Default Max File Size</h3>
                  <p className="text-sm text-muted-foreground">Global maximum upload file size limit</p>
                </div>
                <span className="text-sm font-medium text-foreground">10MB</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Server Concurrent Jobs</h3>
                  <p className="text-sm text-muted-foreground">Maximum simultaneous processing jobs across all users</p>
                </div>
                <span className="text-sm font-medium text-foreground">20</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">File Storage Retention</h3>
                  <p className="text-sm text-muted-foreground">How long to keep converted files</p>
                </div>
                <span className="text-sm font-medium text-foreground">30 days</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Cleanup Schedule</h3>
                  <p className="text-sm text-muted-foreground">Automatic cleanup of old files</p>
                </div>
                <span className="text-sm font-medium text-foreground">Daily at 3:00 AM</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Maintenance</h2>
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start border-border bg-background text-foreground hover:bg-muted/30">
                <Download className="mr-2 h-4 w-4" />
                Export System Logs
              </Button>
              <Button variant="outline" className="w-full justify-start border-border bg-background text-foreground hover:bg-muted/30">
                <Database className="mr-2 h-4 w-4" />
                Database Backup
              </Button>
              <Button variant="destructive" className="w-full justify-start">
                <AlertCircle className="mr-2 h-4 w-4" />
                Clear Failed Conversions
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

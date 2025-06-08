"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Lock,
  Save,
  Trash2,
  Download,
  FileImage,
  Bell,
  Settings,
  Activity,
  CreditCard,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AuthService, UserService, type NotificationSettings } from "@/services";
import { PageLoader } from "@/components/ui/page-loader";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

// API Response interfaces - sử dụng local types cho consistency
interface ApiUser {
  id: number;
  email: string;
  name: string;
  image: string | null;
  role: string;
  subscriptionType: string;
  subscriptionStatus: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  dailyLimit: number;
  monthlyLimit: number;
  usedToday: number;
  usedThisMonth: number;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfileData {
  user: ApiUser;
  stats: {
    totalConversions: number;
    completedConversions: number;
    failedConversions: number;
    pendingConversions: number;
    processingConversions: number;
  };
  subscription: {
    type: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
  };
  usage: {
    daily: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    monthly: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
  };
}

export default function ProfilePage() {
  // Remove useSession from this component since layout already provides it
  // const { data: session, update, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    conversionComplete: true,
    weeklyReport: false,
    securityAlerts: true,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Initial data fetch - only run once on mount
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setFetchingData(true);
        const data = await AuthService.getProfile();
        setProfileData(data);
      } finally {
        setFetchingData(false);
      }
    };

    initializeProfile();
  }, []); // Remove status dependency

  // Form initialization when profile data is ready
  useEffect(() => {
    if (profileData?.user && !fetchingData) {
      // Initialize form with profile data
      profileForm.reset({
        name: profileData.user.name,
        email: profileData.user.email,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData, fetchingData]); // Exclude profileForm to avoid circular dependency

  const onProfileSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      await AuthService.updateProfile({ name: data.name });

      // Update local state directly instead of session update
      if (profileData) {
        setProfileData({
          ...profileData,
          user: {
            ...profileData.user,
            name: data.name,
          }
        });
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      await AuthService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (error) {
      console.error("Password change error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notifications, [key]: value };
    setNotifications(newSettings);

    try {
      await UserService.updateNotificationSettings(newSettings);
      toast.success("Notification settings saved");
    } catch (error) {
      console.error("Notification settings error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
      // Revert on error
      setNotifications(notifications);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      await AuthService.deleteAccount();
      toast.success("Account deleted successfully");
      signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const blob = await AuthService.exportUserData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'user-data.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export data error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export data");
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "data", label: "Data & Privacy", icon: Settings },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Loading State */}
      {fetchingData && <PageLoader variant="form" />}

      {/* User Stats */}
      {!fetchingData && profileData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileImage className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Conversions</p>
                <p className="text-2xl font-bold text-foreground">{profileData.stats.totalConversions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{profileData.stats.completedConversions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-foreground">{profileData.stats.processingConversions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-foreground">{profileData.stats.failedConversions}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Subscription Info */}
      {!fetchingData && profileData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subscription</p>
                <p className="text-2xl font-bold text-foreground">{profileData.subscription.type}</p>
                <p className={`text-sm ${profileData.subscription.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                  {profileData.subscription.status}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Usage</p>
                <p className="text-2xl font-bold text-foreground">
                  {profileData.usage.daily.used}/{profileData.usage.daily.limit}
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(profileData.usage.daily.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Usage</p>
                <p className="text-2xl font-bold text-foreground">
                  {profileData.usage.monthly.used}/{profileData.usage.monthly.limit}
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(profileData.usage.monthly.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm border border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border hover:border-border/80"
                    }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === "profile" && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold text-foreground mb-6">Profile Information</h2>

              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <Input
                      {...profileForm.register("name")}
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      {...profileForm.register("email")}
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Role
                  </label>
                  <div className="px-3 py-2 bg-muted border border-border rounded-md text-sm text-muted-foreground">
                    {profileData?.user?.role || "USER"}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold text-foreground mb-6">Security Settings</h2>

              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    {...passwordForm.register("currentPassword")}
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    New Password
                  </label>
                  <Input
                    type="password"
                    {...passwordForm.register("newPassword")}
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    <Lock className="mr-2 h-4 w-4" />
                    {loading ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold text-foreground mb-6">Notification Preferences</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Email Notifications
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationChange("emailNotifications", !!checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Conversion Complete
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when file conversions are complete
                    </p>
                  </div>
                  <Switch
                    checked={notifications.conversionComplete}
                    onCheckedChange={(checked) => handleNotificationChange("conversionComplete", !!checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Weekly Report
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly usage reports
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReport}
                    onCheckedChange={(checked) => handleNotificationChange("weeklyReport", !!checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Security Alerts
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about security-related events
                    </p>
                  </div>
                  <Switch
                    checked={notifications.securityAlerts}
                    onCheckedChange={(checked) => handleNotificationChange("securityAlerts", !!checked)}
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab === "data" && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold text-foreground mb-6">Data & Privacy</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Export Your Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a copy of all your data including conversions and settings.
                  </p>
                  <Button variant="secondary" onClick={exportData}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-medium text-red-600 mb-2">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button variant="destructive" onClick={deleteAccount} disabled={loading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {loading ? "Deleting..." : "Delete Account"}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

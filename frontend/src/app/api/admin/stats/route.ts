import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    // TODO: In a real application, you would:
    // 1. Query the database for system statistics
    // 2. Calculate metrics like total users, conversions, success rates
    // 3. Get system health information

    // Mock admin stats
    const stats = {
      totalUsers: 156,
      activeUsers: 89,
      suspendedUsers: 5,
      pendingUsers: 2,
      totalConversions: 2847,
      successfulConversions: 2654,
      failedConversions: 193,
      processingConversions: 12,
      totalDataProcessed: 1024 * 1024 * 1024 * 2.5, // 2.5GB
      storageUsed: 1024 * 1024 * 1024 * 1.8, // 1.8GB
      storageLimit: 1024 * 1024 * 1024 * 100, // 100GB
      serverUptime: 99.9,
      averageProcessingTime: 2.3, // seconds
      dailyConversions: [
        { date: "2024-01-01", count: 45 },
        { date: "2024-01-02", count: 52 },
        { date: "2024-01-03", count: 38 },
        { date: "2024-01-04", count: 61 },
        { date: "2024-01-05", count: 43 },
        { date: "2024-01-06", count: 55 },
        { date: "2024-01-07", count: 49 },
      ],
      formatDistribution: [
        { format: "PNG", count: 1245, percentage: 43.7 },
        { format: "JPG", count: 856, percentage: 30.1 },
        { format: "PDF", count: 423, percentage: 14.9 },
        { format: "WebP", count: 245, percentage: 8.6 },
        { format: "SVG", count: 78, percentage: 2.7 },
      ],
      recentActivity: [
        {
          id: "1",
          type: "conversion",
          user: "John Doe",
          action: "Converted logo.svg to PNG",
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: "2",
          type: "user",
          user: "Admin",
          action: "Suspended user: spam@example.com",
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: "3",
          type: "conversion",
          user: "Jane Smith",
          action: "Converted banner.svg to PDF",
          timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
        },
        {
          id: "4",
          type: "system",
          user: "System",
          action: "Daily backup completed",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
      ],
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error("Admin stats fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

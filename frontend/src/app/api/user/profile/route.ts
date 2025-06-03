import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // For now, return mock data based on session user
    // In production, you would integrate with the backend database
    const userStats = {
      totalConversions: 42,
      successfulConversions: 38,
      failedConversions: 4,
      totalFileSize: 1024 * 1024 * 15, // 15MB
      joinedDate: "2024-01-15",
      lastActivity: new Date().toISOString(),
      conversionHistory: [
        { date: "2024-01-20", count: 5 },
        { date: "2024-01-21", count: 3 },
        { date: "2024-01-22", count: 8 },
        { date: "2024-01-23", count: 2 },
        { date: "2024-01-24", count: 6 },
        { date: "2024-01-25", count: 4 },
        { date: "2024-01-26", count: 7 },
      ],
      formatUsage: [
        { format: "PNG", count: 18 },
        { format: "JPG", count: 12 },
        { format: "PDF", count: 8 },
        { format: "WebP", count: 3 },
        { format: "SVG", count: 1 },
      ],
    };

    const subscriptionInfo = {
      type: session.user.role === "ADMIN" ? "ENTERPRISE" : "FREE",
      status: "ACTIVE",
      name: session.user.role === "ADMIN" ? "Enterprise" : "Free",
      features: session.user.role === "ADMIN"
        ? ["Unlimited conversions", "Priority support", "API access", "Batch conversion"]
        : ["10 conversions/day", "Basic support"],
      limits: {
        dailyLimit: session.user.role === "ADMIN" ? 1000 : 10,
        monthlyLimit: session.user.role === "ADMIN" ? 25000 : 100,
      }
    };

    const usageInfo = {
      daily: {
        used: 5,
        limit: subscriptionInfo.limits.dailyLimit,
        remaining: subscriptionInfo.limits.dailyLimit - 5,
        percentage: Math.round((5 / subscriptionInfo.limits.dailyLimit) * 100),
      },
      monthly: {
        used: 42,
        limit: subscriptionInfo.limits.monthlyLimit,
        remaining: subscriptionInfo.limits.monthlyLimit - 42,
        percentage: Math.round((42 / subscriptionInfo.limits.monthlyLimit) * 100),
      }
    };

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        image: session.user.image,
        subscriptionType: subscriptionInfo.type,
        subscriptionStatus: subscriptionInfo.status,
        isActive: true,
        createdAt: "2024-01-15T00:00:00.000Z",
      },
      stats: userStats,
      subscription: subscriptionInfo,
      usage: usageInfo,
    });

  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, email } = await request.json();

    // Basic validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // TODO: In a real application, you would:
    // 1. Validate the new email isn't already taken
    // 2. Update user record in database
    // 3. Handle email verification if email changed
    // 4. Update the session

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: session.user.id,
        name: name.trim(),
        email: email.trim(),
        role: session.user.role,
        image: session.user.image,
      },
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: In a real application, you would:
    // 1. Verify user password/confirmation
    // 2. Delete all user data (conversions, files)
    // 3. Delete user account
    // 4. Log the deletion
    // 5. Invalidate all sessions

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });

  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

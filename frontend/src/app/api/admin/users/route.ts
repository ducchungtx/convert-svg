import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");

    // TODO: In a real application, you would:
    // 1. Query the database for all users with pagination
    // 2. Apply search and filter parameters
    // 3. Return user data (without sensitive information)

    // Mock admin data
    const mockUsers = [
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
    ];

    // Apply filters
    let filteredUsers = mockUsers;

    if (search) {
      filteredUsers = filteredUsers.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status && status !== "all") {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limit),
      },
    });

  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: "User ID and action are required" },
        { status: 400 }
      );
    }

    if (!["activate", "suspend"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'activate' or 'suspend'" },
        { status: 400 }
      );
    }

    // TODO: In a real application, you would:
    // 1. Update user status in database
    // 2. Log admin action
    // 3. Send notification to user if needed

    return NextResponse.json({
      success: true,
      message: `User ${action}d successfully`,
      userId,
      newStatus: action === "activate" ? "ACTIVE" : "SUSPENDED",
    });

  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

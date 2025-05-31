import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status");
    const format = url.searchParams.get("format");

    // TODO: In a real application, you would:
    // 1. Query the database for user's conversions with pagination
    // 2. Apply filters (status, format, date range)
    // 3. Return paginated results

    // For now, return mock data
    const mockConversions = [
      {
        id: "1",
        originalName: "logo.svg",
        targetFormat: "png",
        status: "COMPLETED",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        completedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
        fileSize: 2048,
        outputSize: 15360,
        downloadUrl: "/api/download/1",
      },
      {
        id: "2",
        originalName: "icon-set.svg",
        targetFormat: "jpg",
        status: "PROCESSING",
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        fileSize: 1024,
        progress: 65,
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
        downloadUrl: "/api/download/3",
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
    ];

    // Apply filters
    let filteredConversions = mockConversions;

    if (status && status !== "all") {
      filteredConversions = filteredConversions.filter(c => c.status === status);
    }

    if (format && format !== "all") {
      filteredConversions = filteredConversions.filter(c => c.targetFormat === format);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedConversions = filteredConversions.slice(startIndex, endIndex);

    return NextResponse.json({
      conversions: paginatedConversions,
      pagination: {
        page,
        limit,
        total: filteredConversions.length,
        pages: Math.ceil(filteredConversions.length / limit),
      },
    });

  } catch (error) {
    console.error("Conversions fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { conversionId } = await request.json();

    if (!conversionId) {
      return NextResponse.json(
        { error: "Conversion ID is required" },
        { status: 400 }
      );
    }

    // TODO: In a real application, you would:
    // 1. Verify the conversion belongs to the user
    // 2. Delete the conversion record from database
    // 3. Delete associated files from storage

    return NextResponse.json({
      success: true,
      message: "Conversion deleted successfully",
    });

  } catch (error) {
    console.error("Conversion delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

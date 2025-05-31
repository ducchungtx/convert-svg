import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/svg+xml"];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const targetFormat = formData.get("targetFormat") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only SVG files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // Validate target format
    const allowedFormats = ["png", "jpg", "pdf", "webp", "svg"];
    if (!allowedFormats.includes(targetFormat)) {
      return NextResponse.json(
        { error: "Invalid target format" },
        { status: 400 }
      );
    }

    // TODO: In a real application, you would:
    // 1. Save the file to a storage service (AWS S3, Google Cloud Storage, etc.)
    // 2. Create a conversion job in the database
    // 3. Queue the conversion task
    // 4. Return the job ID for tracking

    // For now, return a mock response
    const conversionId = Math.random().toString(36).substr(2, 9);

    return NextResponse.json({
      success: true,
      conversionId,
      message: "File uploaded successfully and conversion started",
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
      targetFormat,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const conversionId = url.searchParams.get("id");

    if (!conversionId) {
      return NextResponse.json(
        { error: "Conversion ID is required" },
        { status: 400 }
      );
    }

    // TODO: In a real application, you would:
    // 1. Query the database for the conversion status
    // 2. Return the current status and download URL if completed

    // For now, return a mock response
    const statuses = ["processing", "completed", "failed"];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return NextResponse.json({
      conversionId,
      status: randomStatus,
      progress: randomStatus === "processing" ? Math.floor(Math.random() * 100) : 100,
      downloadUrl: randomStatus === "completed" ? `/api/download/${conversionId}` : null,
      error: randomStatus === "failed" ? "Conversion failed due to invalid SVG format" : null,
    });

  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

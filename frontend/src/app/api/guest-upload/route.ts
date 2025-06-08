import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for guests
const MAX_FILES_PER_REQUEST = 3; // Max 3 files per request for guests
const ALLOWED_TYPES = ["image/svg+xml"];
const ALLOWED_OUTPUT_FORMATS = ["png", "jpg", "pdf"]; // Limited formats for guests

// In-memory storage for guest usage tracking (in production, use Redis or database)
const guestUsage = new Map<string, { count: number; date: string }>();

function getClientIP(request: NextRequest): string {
  // Get client IP for rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";
  return ip;
}

function checkGuestLimits(clientIP: string): boolean {
  const today = new Date().toDateString();
  const usage = guestUsage.get(clientIP);

  if (!usage || usage.date !== today) {
    guestUsage.set(clientIP, { count: 0, date: today });
    return true;
  }

  return usage.count < 5; // Daily limit of 5 conversions for guests
}

function incrementGuestUsage(clientIP: string): void {
  const today = new Date().toDateString();
  const usage = guestUsage.get(clientIP) || { count: 0, date: today };
  guestUsage.set(clientIP, { count: usage.count + 1, date: today });
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    // Check guest limits
    if (!checkGuestLimits(clientIP)) {
      return NextResponse.json(
        {
          error: "Daily conversion limit reached. Please try again tomorrow or sign up for unlimited conversions.",
          code: "GUEST_LIMIT_EXCEEDED"
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const targetFormat = formData.get("targetFormat") as string;
    const quality = parseInt(formData.get("quality") as string) || 90;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Validate number of files
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${MAX_FILES_PER_REQUEST} files allowed for guest users.` },
        { status: 400 }
      );
    }

    // Validate target format (guests have limited options)
    if (!ALLOWED_OUTPUT_FORMATS.includes(targetFormat)) {
      return NextResponse.json(
        { error: `Invalid target format. Guests can only convert to: ${ALLOWED_OUTPUT_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate each file
    for (const file of files) {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only SVG files are allowed.` },
          { status: 400 }
        );
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
          { status: 400 }
        );
      }
    }

    // TODO: In a real application, you would:
    // 1. Save files to temporary storage
    // 2. Queue conversion jobs
    // 3. Return job IDs for tracking

    // For now, simulate the conversion process
    const conversions = files.map((file, index) => ({
      id: `guest_${Date.now()}_${index}`,
      originalName: file.name,
      targetFormat,
      status: "PROCESSING",
      progress: 0,
      fileSize: file.size,
      quality,
      createdAt: new Date().toISOString(),
      isGuest: true
    }));

    // Increment guest usage
    incrementGuestUsage(clientIP);

    // Simulate processing delay
    setTimeout(() => {
      // In a real app, this would be handled by a background job
      console.log(`Processing ${files.length} files for guest user`);
    }, 1000);

    return NextResponse.json({
      success: true,
      conversions,
      message: `Started processing ${files.length} file(s)`,
      remainingConversions: 4 // 5 - 1 (current batch)
    });

  } catch (error) {
    console.error("Guest upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const today = new Date().toDateString();
    const usage = guestUsage.get(clientIP);

    const usedConversions = usage && usage.date === today ? usage.count : 0;
    const remainingConversions = Math.max(0, 5 - usedConversions);

    return NextResponse.json({
      dailyLimit: 5,
      used: usedConversions,
      remaining: remainingConversions,
      resetsAt: "midnight"
    });
  } catch (error) {
    console.error("Guest usage check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

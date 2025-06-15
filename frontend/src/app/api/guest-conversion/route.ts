import { NextRequest, NextResponse } from "next/server";

// Mock conversion storage (in production, use database)
interface ConversionStatus {
  id: string;
  status: string;
  progress: number;
  originalName: string;
  targetFormat: string;
  fileSize: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  outputSize?: number;
  isGuest: boolean;
}

const mockConversions = new Map<string, ConversionStatus>();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const conversionId = url.searchParams.get("id");

    if (!conversionId) {
      return NextResponse.json(
        { error: "Conversion ID required" },
        { status: 400 }
      );
    }

    // Try to get status from backend first
    try {
      const backendResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/conversion/status/${conversionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();

        if (backendData.success && backendData.data.conversion) {
          const conversion = backendData.data.conversion;

          // Map backend status to frontend format
          return NextResponse.json({
            id: conversion.id.toString(),
            status: conversion.status,
            progress: conversion.progress || (conversion.status === 'COMPLETED' ? 100 : conversion.status === 'PROCESSING' ? 50 : 0),
            originalName: conversion.originalFilename,
            targetFormat: conversion.toFormat.toLowerCase(),
            fileSize: conversion.fileSize,
            createdAt: conversion.createdAt,
            completedAt: conversion.completedAt,
            downloadUrl: conversion.status === 'COMPLETED' ? `/api/guest-download/${conversion.id}` : undefined,
            outputSize: conversion.outputFileSize,
            isGuest: !conversion.userId // Guest if no userId
          });
        }
      }
    } catch (backendError) {
      console.warn('Backend status check failed, falling back to mock:', backendError);
    }

    // Fallback to mock data for demo purposes
    const conversion = mockConversions.get(conversionId) || {
      id: conversionId,
      status: "PROCESSING",
      progress: Math.min(100, Math.floor(Math.random() * 100)),
      originalName: "demo.svg",
      targetFormat: "png",
      fileSize: 2048,
      createdAt: new Date().toISOString(),
      isGuest: true
    };

    // Simulate completion after some time
    if (conversion.progress > 90) {
      conversion.status = "COMPLETED";
      conversion.progress = 100;
      conversion.completedAt = new Date().toISOString();
      conversion.downloadUrl = `/api/guest-download/${conversionId}`;
      conversion.outputSize = Math.floor(conversion.fileSize * 1.5);
    }

    mockConversions.set(conversionId, conversion);

    return NextResponse.json(conversion);
  } catch (error) {
    console.error("Guest conversion status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

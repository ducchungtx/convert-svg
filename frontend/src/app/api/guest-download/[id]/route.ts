import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversionId = params.id;

    if (!conversionId) {
      return NextResponse.json(
        { error: "Conversion ID required" },
        { status: 400 }
      );
    }

    // Proxy download request to backend
    try {
      const backendResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/conversion/download/${conversionId}`, {
        method: 'GET',
      });

      if (!backendResponse.ok) {
        if (backendResponse.status === 404) {
          return NextResponse.json(
            { error: "File not found or conversion not completed" },
            { status: 404 }
          );
        }

        const errorData = await backendResponse.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.message || "Download failed" },
          { status: backendResponse.status }
        );
      }

      // Get the file content as a stream
      const fileBuffer = await backendResponse.arrayBuffer();

      // Get content type and filename from backend response headers
      const contentType = backendResponse.headers.get('content-type') || 'application/octet-stream';
      const contentDisposition = backendResponse.headers.get('content-disposition');

      let filename = `converted_${conversionId}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Create response with file content
      const response = new NextResponse(fileBuffer);
      response.headers.set('Content-Type', contentType);
      response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      response.headers.set('Cache-Control', 'no-cache');

      return response;

    } catch (backendError) {
      console.error('Backend download failed:', backendError);

      // Fallback for demo purposes
      return NextResponse.json({
        message: "Backend unavailable - file download would start here",
        conversionId,
        note: "In production, this would stream the converted file from backend"
      });
    }

  } catch (error) {
    console.error("Guest download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

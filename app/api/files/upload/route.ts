// app/api/files/upload/route.ts - File Upload & Extraction Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { indexDocument } from '@/services/file.service';

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.headers.get('x-session-id') || 'stark-command-session-default';
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'NO_FILE',
            message: 'No file provided in form data.',
          },
        },
        { status: 400 }
      );
    }

    // Check size limit (default 10MB)
    const maxSizeBytes = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File exceeds maximum allowed size of ${process.env.MAX_UPLOAD_SIZE_MB || 10}MB.`,
          },
        },
        { status: 413 }
      );
    }

    // Check allowlisted extensions
    const filename = file.name;
    const allowedExts = ['.txt', '.md', '.json', '.csv', '.pdf', '.docx', '.log', '.js', '.ts', '.py'];
    const lowerName = filename.toLowerCase();
    const hasAllowedExt = allowedExts.some((ext) => lowerName.endsWith(ext));

    if (!hasAllowedExt) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'UNSUPPORTED_TYPE',
            message: `Unsupported file format. Supported: ${allowedExts.join(', ')}`,
          },
        },
        { status: 415 }
      );
    }

    // Read text content safely
    let textContent = '';
    try {
      const buffer = await file.arrayBuffer();
      // For plain text, markdown, json, csv, log
      const decoder = new TextDecoder('utf-8', { fatal: false });
      textContent = decoder.decode(buffer);
    } catch {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'EXTRACTION_FAILED',
            message: 'Could not extract textual content from file.',
          },
        },
        { status: 422 }
      );
    }

    if (!textContent.trim()) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'EMPTY_CONTENT',
            message: 'Uploaded document contains no readable text.',
          },
        },
        { status: 400 }
      );
    }

    // Index the file
    const indexed = indexDocument(
      sessionId,
      filename,
      file.type || 'text/plain',
      textContent,
      file.size
    );

    return NextResponse.json({
      success: true,
      data: {
        message: `File "${filename}" indexed into J.A.R.V.I.S.-O neural storage.`,
        file: indexed,
      },
      error: null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'UPLOAD_ERROR',
          message: error.message || 'File processing failed',
        },
      },
      { status: 500 }
    );
  }
}

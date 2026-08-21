import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-refresh-secret');
  if (secret !== process.env.REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // In production: trigger your ingestion pipeline here.
  // Options: invoke a GitHub Actions workflow, call a background worker, or run scripts directly.
  // For now, return a stub success response.

  return NextResponse.json({
    ok: true,
    message: 'Refresh triggered. Ingestion pipeline not yet connected.',
    timestamp: new Date().toISOString(),
  });
}

// Allow Vercel Cron to call this via GET as well
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Refresh endpoint is live. Use POST with x-refresh-secret header to trigger.',
  });
}

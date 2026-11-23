import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function GET(request: Request, { params }: { params: Promise<{ guestId: string; documentId: string }> }) {
  const { guestId, documentId } = await params;
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const isDownload = url.searchParams.get('download') === '1';
  const endpoint = isDownload ? 'download?download=1' : 'view';

  const upstream = await fetch(
    `${API_URL}/hotel/guests/${encodeURIComponent(guestId)}/documents/${encodeURIComponent(documentId)}/${endpoint}`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );
  if (!upstream.ok) {
    const errorBody = await upstream.json().catch(() => null);
    return NextResponse.json({ message: errorBody?.message ?? 'Document could not be retrieved' }, { status: upstream.status });
  }

  const headers = new Headers();
  for (const key of ['content-type', 'content-length', 'content-disposition', 'cache-control', 'x-content-type-options']) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set('Cache-Control', 'private, no-store');
  // Allow framing by the app itself for in-app sandboxed preview
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  return new NextResponse(await upstream.arrayBuffer(), { status: 200, headers });
}

export async function POST(request: Request, { params }: { params: Promise<{ guestId: string; documentId: string }> }) {
  const { guestId, documentId } = await params;
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action || 'export';

  if (action === 'legal-hold') {
    const upstream = await fetch(
      `${API_URL}/hotel/guests/${encodeURIComponent(guestId)}/documents/${encodeURIComponent(documentId)}/legal-hold`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ legalHold: body.legalHold, reason: body.reason }),
        cache: 'no-store',
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  }

  // Export with mandatory reason
  const upstream = await fetch(
    `${API_URL}/hotel/guests/${encodeURIComponent(guestId)}/documents/${encodeURIComponent(documentId)}/export`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ reason: body.reason }),
      cache: 'no-store',
    },
  );

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => null);
    return NextResponse.json({ message: err?.message ?? 'Export failed' }, { status: upstream.status });
  }

  const headers = new Headers();
  for (const key of ['content-type', 'content-length', 'content-disposition', 'cache-control']) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  return new NextResponse(await upstream.arrayBuffer(), { status: 200, headers });
}

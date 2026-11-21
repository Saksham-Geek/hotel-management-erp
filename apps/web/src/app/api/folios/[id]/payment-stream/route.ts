import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const upstream = await fetch(`${API_URL}/hotel/folios/${encodeURIComponent(id)}/payment-stream`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'text/event-stream',
      },
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ message: 'Upstream SSE stream unavailable' }, { status: upstream.status });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'SSE connection failed' }, { status: 502 });
  }
}

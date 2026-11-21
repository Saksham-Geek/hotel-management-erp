import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const upstream = await fetch(`${API_URL}/hotel/folios/${encodeURIComponent(id)}/payment-status`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Status check failed' }, { status: 502 });
  }
}

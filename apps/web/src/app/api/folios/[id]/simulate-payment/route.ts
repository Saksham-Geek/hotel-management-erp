import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const upstream = await fetch(`${API_URL}/hotel/folios/${encodeURIComponent(id)}/simulate-upi-webhook`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Simulation failed' }, { status: 502 });
  }
}

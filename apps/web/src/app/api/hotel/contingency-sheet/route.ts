import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function GET() {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const upstream = await fetch(`${API_URL}/hotel/dashboard/contingency-sheet`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Failed to fetch contingency register' }, { status: 500 });
  }
}

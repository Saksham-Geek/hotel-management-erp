import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const upstream = await fetch(`${API_URL}/public/room-service/order`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Room order failed' }, { status: 500 });
  }
}

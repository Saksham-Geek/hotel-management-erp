import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function GET(request: Request) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  try {
    const upstream = await fetch(
      `${API_URL}/hotel/income/export/gstr-1?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    );

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }

    const jsonStr = JSON.stringify(data, null, 2);
    return new Response(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="GSTR1_${data.gstin || 'GST'}_${data.fp || 'MTH'}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'GSTR-1 export failed' }, { status: 500 });
  }
}

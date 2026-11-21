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
      `${API_URL}/hotel/income/export/tally-xml?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    );

    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json({ message: text }, { status: upstream.status });
    }

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="tally_sales_vouchers.xml"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Tally XML export failed' }, { status: 500 });
  }
}

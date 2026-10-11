import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function GET(_request: Request, { params }: { params: Promise<{ guestId: string; documentId: string }> }) {
  const { guestId, documentId } = await params;
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const upstream = await fetch(`${API_URL}/hotel/guests/${encodeURIComponent(guestId)}/documents/${encodeURIComponent(documentId)}/download`, {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!upstream.ok) return NextResponse.json({ message: 'Document could not be retrieved' }, { status: upstream.status });
  const headers = new Headers();
  for (const key of ['content-type', 'content-length', 'content-disposition', 'cache-control']) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set('Cache-Control', 'private, no-store');
  return new NextResponse(await upstream.arrayBuffer(), { status: 200, headers });
}

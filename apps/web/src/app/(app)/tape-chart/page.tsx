import { redirect } from 'next/navigation';

export default async function TapeChartRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(resolvedParams)) {
    if (typeof val === 'string') {
      query.set(key, val);
    } else if (Array.isArray(val)) {
      val.forEach((v) => query.append(key, v));
    }
  }
  const queryString = query.toString();
  redirect(`/room-calendar${queryString ? `?${queryString}` : ''}`);
}

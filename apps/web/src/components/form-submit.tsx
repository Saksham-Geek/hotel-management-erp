'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

export function FormSubmit({
  children,
  pendingLabel = 'Saving…',
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={className}>{pending ? pendingLabel : children}</button>;
}

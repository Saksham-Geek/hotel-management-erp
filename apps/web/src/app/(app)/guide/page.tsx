import { getMe } from '@/lib/api';
import { GuideView } from './guide-view';

export default async function GuidePage() {
  const me = await getMe();
  const isPlatformFounder =
    me.tenant.slug === 'platform-hq' ||
    me.email === 'founder@antigravity-erp.com' ||
    me.email === 'ops@antigravity-erp.com';

  return (
    <GuideView
      userRole={me.role}
      userEmail={me.email}
      userName={me.fullName}
      tenantSlug={me.tenant.slug}
      propertyName={me.property.name}
      isPlatformFounder={isPlatformFounder}
    />
  );
}

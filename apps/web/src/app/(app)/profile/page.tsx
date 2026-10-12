import { Banner, btnCls, inputCls, PageHeader } from '@/components/ui';
import { getMe } from '@/lib/api';
import { changeMyPassword, requestEmailChange, saveMyProfile } from '../../login/actions';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, me] = await Promise.all([searchParams, getMe()]);

  return (
    <>
      <PageHeader title="My profile" eyebrow="Account" description="Update the name and contact number shown to your hotel team." />
      <Banner error={error} ok={ok} />
      <section className="max-w-2xl rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-7">
        <form action={saveMyProfile} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-ink sm:col-span-2">
              Full name <span className="text-danger">*</span>
              <input name="fullName" defaultValue={me.fullName} autoComplete="name" required minLength={1} maxLength={120} className={`${inputCls} mt-1.5`} />
            </label>
            <label className="block text-xs font-medium text-ink sm:col-span-2">
              Contact phone
              <input name="phone" type="tel" defaultValue={me.phone ?? ''} autoComplete="tel" maxLength={30} pattern="\+?[0-9 ().-]{7,30}" title="Use a phone number with 7 to 15 digits." placeholder="Add a phone number" className={`${inputCls} mt-1.5`} />
              <span className="mt-1 block text-[11px] font-normal text-muted">Use 7 to 15 digits. Leave blank to remove it.</span>
            </label>
            <label className="block text-xs font-medium text-ink sm:col-span-2">
              Sign-in email
              <input value={me.email} readOnly aria-label="Current sign-in email" className={`${inputCls} mt-1.5 cursor-not-allowed bg-ground text-muted`} />
              <span className="mt-1 block text-[11px] font-normal text-muted">Your current address stays active until a new address is verified.</span>
            </label>
          </div>
          <div className="border-t border-line pt-4">
            <p className="text-xs text-muted">Current property: <span className="font-medium text-ink">{me.property.name}</span> · Role: <span className="font-medium capitalize text-ink">{me.role.replaceAll('_', ' ')}</span></p>
            <button className={`${btnCls} mt-4 w-full sm:w-auto`}>Save profile</button>
          </div>
        </form>
      </section>
      <section className="mt-5 max-w-2xl rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="font-display text-lg font-semibold text-ink">Change sign-in email</h2>
        <p className="mt-1 text-xs leading-5 text-muted">We will send a one-time link to the new address. It expires after 30 minutes. Your current password is required to protect this change.</p>
        <form action={requestEmailChange} className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-ink">
            New email address <span className="text-danger">*</span>
            <input name="newEmail" type="email" required maxLength={200} autoComplete="email" placeholder="name@example.com" className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-xs font-medium text-ink">
            Current password <span className="text-danger">*</span>
            <input name="currentPassword" type="password" required maxLength={200} autoComplete="current-password" className={`${inputCls} mt-1.5`} />
          </label>
          <button className={`${btnCls} w-full sm:w-auto`}>Send verification link</button>
        </form>
      </section>
      <section className="mt-5 max-w-2xl rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="font-display text-lg font-semibold text-ink">Change password</h2>
        <p className="mt-1 text-xs leading-5 text-muted">Choose a new password with at least 10 characters. Changing it signs out your other active sessions.</p>
        <form action={changeMyPassword} className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-ink">
            Current password <span className="text-danger">*</span>
            <input name="currentPassword" type="password" required maxLength={200} autoComplete="current-password" className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-xs font-medium text-ink">
            New password <span className="text-danger">*</span>
            <input name="newPassword" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-xs font-medium text-ink">
            Confirm new password <span className="text-danger">*</span>
            <input name="confirmPassword" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={`${inputCls} mt-1.5`} />
          </label>
          <button className={`${btnCls} w-full sm:w-auto`}>Update password</button>
        </form>
      </section>
    </>
  );
}

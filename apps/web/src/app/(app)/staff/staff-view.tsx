'use client';

import { useEffect, useState, useTransition } from 'react';
import { CustomDropdown } from '@/components/dropdown';
import { createStaff, toggleStaffStatus, removeStaff, type ActionState } from './actions';

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'manager' | 'frontdesk' | 'housekeeping';
  department: string;
  shift: string;
  isActive: boolean;
  assignedAt: string;
  invitedByName?: string;
}

interface StaffData {
  staff: StaffUser[];
  hierarchy: {
    owners: StaffUser[];
    managers: StaffUser[];
    frontdesk: StaffUser[];
    housekeeping: StaffUser[];
  };
  callerRole: string;
  allowedRoles: string[];
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
}

export function StaffView({ initialData }: { initialData: StaffData }) {
  const [data, setData] = useState(initialData);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'hierarchy' | 'shifts'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [pending, startTransition] = useTransition();
  const [formState, setFormState] = useState<ActionState>(null);

  useEffect(() => {
    if (!isAddOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddOpen]);

  const filteredStaff = data.staff.filter((s) => {
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const roleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Property Owner / Director', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'manager':
        return { label: 'General Manager (GM)', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'frontdesk':
        return { label: 'Front Desk / Reception', bg: 'bg-teal-100 text-teal-900 border-teal-300' };
      case 'housekeeping':
        return { label: 'Housekeeping & Floor', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      default:
        return { label: role, bg: 'bg-slate-100 text-slate-900 border-slate-300' };
    }
  };

  const handleToggleStatus = (userId: string) => {
    if (!confirm('Are you sure you want to change this staff member account status?')) return;
    startTransition(async () => {
      const res = await toggleStaffStatus(userId);
      if (res?.success) {
        setData((prev) => ({
          ...prev,
          staff: prev.staff.map((s) => (s.id === userId ? { ...s, isActive: !s.isActive } : s)),
        }));
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleRemoveStaff = (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this hotel?`)) return;
    startTransition(async () => {
      const res = await removeStaff(userId);
      if (res?.success) {
        setData((prev) => ({
          ...prev,
          staff: prev.staff.filter((s) => s.id !== userId),
        }));
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-2xs">
              Staff &amp; Enterprise Hierarchy
            </span>
            <span className="text-xs font-medium text-slate-500">
              Delegation &amp; Access Control
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Hotel Staff &amp; Delegation Roster
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Enterprise chain multi-tier role delegation: Super Admin ➔ Property Owner ➔ General Manager ➔ Front Desk &amp; Housekeeping.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormState(null);
            setIsAddOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add Staff Member</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Hotel Staff</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{data.summary.total}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">{data.summary.active} active accounts</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Property Owners &amp; GMs</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {data.hierarchy.owners.length + data.hierarchy.managers.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Executive leadership</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Front Desk &amp; Cashiers</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{data.hierarchy.frontdesk.length}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Check-in, Billing &amp; BoI</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Housekeeping &amp; Floor</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{data.hierarchy.housekeeping.length}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Turnover &amp; maintenance</p>
        </div>
      </div>

      {/* Role Delegation Governance Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-start gap-3">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
            i
          </span>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900">
              Enterprise Delegation Rules Enforced ({data.callerRole === 'owner' ? 'Logged in as Property Owner' : 'Logged in as General Manager'})
            </h4>
            <p className="text-slate-600 leading-relaxed font-normal">
              • <strong>Property Owners</strong> have full authority to appoint General Managers (GM) and all departmental staff.<br />
              • <strong>General Managers (GM)</strong> are strictly restricted to provisioning Front Desk and Housekeeping staff. GMs cannot promote users to Owner or Manager.<br />
              • <strong>Front Desk & Housekeeping</strong> accounts have no user provisioning access and only execute operational tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2" role="tablist" aria-label="Staff roster sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All Staff ({data.staff.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'hierarchy'}
            onClick={() => setActiveTab('hierarchy')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'hierarchy'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Organizational Tree
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shifts'}
            onClick={() => setActiveTab('shifts')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'shifts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Shift Schedule
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search staff, email, dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <div className="w-44">
              <CustomDropdown
                value={roleFilter}
                onChange={(val) => setRoleFilter(val)}
                size="sm"
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'owner', label: 'Property Owner' },
                  { value: 'manager', label: 'General Manager' },
                  { value: 'frontdesk', label: 'Front Desk' },
                  { value: 'housekeeping', label: 'Housekeeping' },
                ]}
                aria-label="Filter staff by role"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: All Staff Table */}
      {activeTab === 'all' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-100/90 font-black uppercase tracking-wider text-xs text-slate-800">
              <tr>
                <th className="px-5 py-4">Staff Member</th>
                <th className="px-5 py-4">Role &amp; Hierarchy</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Assigned Shift</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm sm:text-[15px]">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 font-medium">
                    No staff members match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => {
                  const badge = roleBadge(s.role);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-950">{s.fullName}</div>
                        <div className="text-xs sm:text-[13px] text-slate-600 font-medium mt-0.5">{s.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-black ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        {s.invitedByName && (
                          <div className="mt-1 text-xs text-slate-500 font-semibold">
                            Invited by {s.invitedByName}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">{s.department}</td>
                      <td className="px-5 py-4 text-slate-700 font-semibold capitalize">{s.shift}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                            s.isActive
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : 'bg-rose-100 text-rose-950 border border-rose-300'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              s.isActive ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          {s.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s.id)}
                          disabled={pending}
                          className="min-h-[36px] rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs"
                        >
                          {s.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStaff(s.id, s.fullName)}
                          disabled={pending}
                          className="min-h-[36px] rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Organizational Hierarchy Tree */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          {/* Level 1: Property Owners */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-purple-200 pb-3">
              <div>
                <span className="rounded bg-purple-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-900">
                  Level 1 · Board & Asset Ownership
                </span>
                <h3 className="mt-1 font-display text-base font-bold text-purple-950">
                  Property Owners & Managing Directors
                </h3>
              </div>
              <span className="text-xs font-bold text-purple-800">
                {data.hierarchy.owners.length} Assigned
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.hierarchy.owners.map((u) => (
                <div key={u.id} className="rounded-xl border border-purple-200 bg-white p-3 shadow-xs">
                  <div className="font-bold text-slate-950">{u.fullName}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                    Full Chain & Hotel Ownership Authority
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level 2: General Managers */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-blue-200 pb-3">
              <div>
                <span className="rounded bg-blue-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-900">
                  Level 2 · Executive Operations
                </span>
                <h3 className="mt-1 font-display text-base font-bold text-blue-950">
                  General Managers (GM) & Operations Heads
                </h3>
              </div>
              <span className="text-xs font-bold text-blue-800">
                {data.hierarchy.managers.length} Assigned
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.hierarchy.managers.map((u) => (
                <div key={u.id} className="rounded-xl border border-blue-200 bg-white p-3 shadow-xs">
                  <div className="font-bold text-slate-950">{u.fullName}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Directs Daily Hotel Operations & Recruits Frontline
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level 3: Front Desk & Housekeeping */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 shadow-xs">
              <div className="border-b border-teal-200 pb-3">
                <span className="rounded bg-teal-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-900">
                  Level 3A · Front Office & Cashiering
                </span>
                <h3 className="mt-1 font-display text-base font-bold text-teal-950">
                  Front Desk Agents & Night Auditors
                </h3>
              </div>
              <div className="mt-4 space-y-2.5">
                {data.hierarchy.frontdesk.map((u) => (
                  <div key={u.id} className="rounded-xl border border-teal-200 bg-white p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-950">{u.fullName}</div>
                      <span className="text-[10px] font-bold text-teal-700">{u.shift}</span>
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
              <div className="border-b border-amber-200 pb-3">
                <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
                  Level 3B · Housekeeping & Facility
                </span>
                <h3 className="mt-1 font-display text-base font-bold text-amber-950">
                  Housekeeping Supervisors & Attendants
                </h3>
              </div>
              <div className="mt-4 space-y-2.5">
                {data.hierarchy.housekeeping.map((u) => (
                  <div key={u.id} className="rounded-xl border border-amber-200 bg-white p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-950">{u.fullName}</div>
                      <span className="text-[10px] font-bold text-amber-700">{u.shift}</span>
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Shift Schedule */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900">Morning Shift (07:00 - 15:30)</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Peak Check-Out
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {data.staff
                .filter((s) => s.shift.toLowerCase().includes('morning'))
                .map((s) => (
                  <div key={s.id} className="rounded-lg bg-slate-50 p-2.5">
                    <p className="font-bold text-slate-950">{s.fullName}</p>
                    <p className="text-[11px] text-slate-500">{s.department}</p>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900">Evening Shift (15:00 - 23:30)</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Peak Check-In
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {data.staff
                .filter((s) => s.shift.toLowerCase().includes('evening'))
                .map((s) => (
                  <div key={s.id} className="rounded-lg bg-slate-50 p-2.5">
                    <p className="font-bold text-slate-950">{s.fullName}</p>
                    <p className="text-[11px] text-slate-500">{s.department}</p>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900">Night Shift (23:00 - 07:30)</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Night Audit Run
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {data.staff
                .filter((s) => s.shift.toLowerCase().includes('night'))
                .map((s) => (
                  <div key={s.id} className="rounded-lg bg-slate-50 p-2.5">
                    <p className="font-bold text-slate-950">{s.fullName}</p>
                    <p className="text-[11px] text-slate-500">{s.department}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-staff-dialog-title"
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="add-staff-dialog-title" className="font-display text-lg font-bold text-slate-950">
                  Provision Hotel Staff Member
                </h3>
                <p className="text-xs text-slate-500">
                  Credentials and role-scoped permissions for hotel operations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close dialog"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formState?.error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
                {formState.error}
              </div>
            )}
            {formState?.success && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900">
                {formState.success}
              </div>
            )}

            <form
              action={async (formData) => {
                startTransition(async () => {
                  const res = await createStaff(formState, formData);
                  setFormState(res);
                  if (res?.success) {
                    setTimeout(() => {
                      setIsAddOpen(false);
                      window.location.reload();
                    }, 1200);
                  }
                });
              }}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label htmlFor="staff-full-name" className="block font-bold text-slate-900">Full Name</label>
                <input
                  id="staff-full-name"
                  name="fullName"
                  required
                  placeholder="e.g. Vikramaditya Rathore"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label htmlFor="staff-email" className="block font-bold text-slate-900">Staff Email Address</label>
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. v.rathore@hotel.com"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label id="staff-role-label" className="block font-bold text-slate-900 mb-1">Delegated Role</label>
                  <CustomDropdown
                    name="role"
                    required
                    defaultValue={data.allowedRoles[0] || 'frontdesk'}
                    size="sm"
                    options={[
                      ...(data.allowedRoles.includes('owner') ? [{ value: 'owner', label: 'Property Owner / Co-Director' }] : []),
                      ...(data.allowedRoles.includes('manager') ? [{ value: 'manager', label: 'General Manager (GM)' }] : []),
                      ...(data.allowedRoles.includes('frontdesk') ? [{ value: 'frontdesk', label: 'Front Desk / Receptionist' }] : []),
                      ...(data.allowedRoles.includes('housekeeping') ? [{ value: 'housekeeping', label: 'Housekeeping Attendant' }] : []),
                    ]}
                    aria-labelledby="staff-role-label"
                  />
                </div>

                <div>
                  <label htmlFor="staff-department" className="block font-bold text-slate-900 mb-1">Department</label>
                  <input
                    id="staff-department"
                    name="department"
                    defaultValue="Front Office"
                    placeholder="e.g. Front Office, F&B, Housekeeping"
                    className="h-9 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label id="staff-shift-label" className="block font-bold text-slate-900 mb-1">Assigned Shift</label>
                  <CustomDropdown
                    name="shift"
                    defaultValue="Morning (07:00 - 15:30)"
                    size="sm"
                    options={[
                      { value: 'Morning (07:00 - 15:30)', label: 'Morning (07:00 - 15:30)' },
                      { value: 'Evening (15:00 - 23:30)', label: 'Evening (15:00 - 23:30)' },
                      { value: 'Night (23:00 - 07:30)', label: 'Night (23:00 - 07:30)' },
                      { value: 'General', label: 'General (09:00 - 18:00)' },
                    ]}
                    aria-labelledby="staff-shift-label"
                  />
                </div>

                <div>
                  <label htmlFor="staff-password" className="block font-bold text-slate-900">Temporary Password</label>
                  <input
                    id="staff-password"
                    name="password"
                    defaultValue="HotelStaff123!"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-mono font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-teal-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-teal-700"
                >
                  {pending ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

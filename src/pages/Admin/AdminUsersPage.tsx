import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type { AdminUserListItem, AdminUserDetail } from '../../types/admin';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Phone,
  Box,
  CheckCircle2,
  XCircle,
  X,
  QrCode,
  BarChart2,
} from 'lucide-react';
import { ResourceAnalyticsModal } from '../../components/admin/ResourceAnalyticsModal';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Resource Analytics Modal
  const [analyticsResource, setAnalyticsResource] = useState<{
    id: string;
    name: string;
    tagNumber?: string;
    ownerName?: string;
  } | null>(null);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await adminApi.getUsers({
        page,
        limit,
        search: debouncedSearch,
        activeOnly: activeOnly ? true : false,
      });
      const payload = res?.data || res;
      setUsers(payload?.users || []);
      setTotal(payload?.total || 0);
      setTotalPages(payload?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, activeOnly]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await adminApi.getUserById(userId);
      setUserDetail(detail);
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load user details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedUserId(null);
    setUserDetail(null);
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
            Users
          </h1>
          <p className="text-xs text-muted mt-0.5 font-satoshi font-medium">
            {(total ?? 0).toLocaleString()} accounts · Directory and resource ownership
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-1.5 bg-surface border border-border rounded text-xs text-ink placeholder:text-muted font-satoshi font-medium focus:outline-none focus:border-ink w-full sm:w-60"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Active Filter Toggle */}
          <button
            type="button"
            onClick={() => {
              setActiveOnly(!activeOnly);
              setPage(1);
            }}
            className={`btn btn-secondary !min-h-[32px] !py-0 !px-3 text-xs inline-flex items-center gap-1.5 cursor-pointer ${
              activeOnly ? '!bg-ink !text-surface !border-ink' : ''
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeOnly ? 'bg-accent' : 'bg-muted'}`} />
            <span>Active Only</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="my-4 p-3 border-y border-red-500/30 text-xs text-danger font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchUsers()} className="underline font-bold uppercase tracking-wider text-[11px] cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ── Mobile View: Clean Separator-Line List ── */}
      <div className="block md:hidden mt-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent mb-2" />
            <p className="font-satoshi text-xs text-muted">Searching Directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted border-y border-border">
            No users matched the criteria.
          </div>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => handleOpenDetail(u.id)}
                className="py-3 space-y-1.5 cursor-pointer group hover:bg-surface/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-ink">{u.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-satoshi font-medium uppercase ${
                        u.role === 'ADMIN'
                          ? 'bg-ink text-surface'
                          : 'border border-border text-muted'
                      }`}
                    >
                      {u.role || 'USER'}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-satoshi font-medium ${
                      u.active ? 'text-success' : 'text-danger'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-600' : 'bg-red-500'}`} />
                    <span>{u.active ? 'Active' : 'Inactive'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-satoshi font-medium text-ink flex items-center gap-1">
                    <Phone className="w-3 h-3 text-muted" />
                    <span>{u.mobileNumber}</span>
                  </span>
                  <span className="font-satoshi font-medium text-[11px]">
                    {u.resourceCount ?? 0} assets
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-muted font-satoshi font-medium">
                    Joined: {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(u.id)}
                    className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface hover:bg-ink border border-ink/20 hover:border-ink text-ink hover:text-surface text-xs font-medium tracking-tight shadow-2xs hover:shadow-xs active:scale-[0.96] transition-all duration-150 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-ink group-hover:bg-accent transition-colors" />
                    <span>View User</span>
                    <ChevronRight className="w-3 h-3 text-muted group-hover:text-surface group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop View: Clean Line Table ── */}
      <div className="hidden md:block mt-6 border-y border-border overflow-x-auto">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent mb-3" />
            <p className="font-satoshi text-xs text-muted tracking-wider uppercase">
              Searching Directory...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted font-satoshi">
            No users matched the criteria.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted font-satoshi uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 font-medium">User / Contact</th>
                <th className="py-2.5 px-4 font-medium">Role</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Resources</th>
                <th className="py-2.5 px-4 font-medium">Call Endpoint</th>
                <th className="py-2.5 px-4 font-medium">Joined</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-bg/40 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-semibold text-ink text-sm">{u.name}</div>
                      <div className="font-mono text-muted text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-muted" />
                        <span>{u.mobileNumber}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold inline-flex items-center gap-1 ${
                          u.role === 'ADMIN'
                            ? 'bg-ink text-surface'
                            : 'bg-bg border border-border text-muted'
                        }`}
                      >
                        {u.role === 'ADMIN' && <Shield className="w-2.5 h-2.5 text-accent" />}
                        {u.role || 'USER'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-danger">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-bg border border-border text-ink font-mono text-[11px]">
                        <Box className="w-3 h-3 text-muted" />
                        <span>{u.resourceCount}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      {u.hasContactEndpoint ? (
                        <span className="text-[11px] font-mono text-success">Configured</span>
                      ) : (
                        <span className="text-[11px] font-mono text-subtle">Not Set</span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-muted text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(u.id)}
                        className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-ink border border-ink/20 hover:border-ink text-ink hover:text-surface text-xs font-medium tracking-tight shadow-2xs hover:shadow-xs active:scale-[0.96] transition-all duration-150 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-ink group-hover:bg-accent transition-colors" />
                        <span>View</span>
                        <ChevronRight className="w-3 h-3 text-muted group-hover:text-surface group-hover:translate-x-0.5 transition-all" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border bg-bg/50 flex items-center justify-between text-xs">
            <span className="font-mono text-muted text-[11px]">
              Page {page} of {totalPages} ({total} users total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded border border-border bg-surface text-ink hover:border-ink disabled:opacity-40 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-border bg-surface text-ink hover:border-ink disabled:opacity-40 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg/40">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-ink" />
                <h3 className="text-base sm:text-lg font-semibold text-ink">
                  User Details
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="text-muted hover:text-ink p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {isDetailLoading ? (
                <div className="py-16 flex flex-col items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent mb-3" />
                  <p className="font-mono text-xs text-muted uppercase">Loading Profile...</p>
                </div>
              ) : detailError ? (
                <div className="p-4 rounded bg-danger/10 text-danger text-xs">{detailError}</div>
              ) : userDetail ? (
                <>
                  {/* Profile Summary Card */}
                  <div className="p-4 bg-bg border border-border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted block mb-0.5">
                        Full Name
                      </span>
                      <span className="font-semibold text-sm text-ink">{userDetail.name}</span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted block mb-0.5">
                        Mobile Number
                      </span>
                      <span className="font-mono text-sm text-ink">{userDetail.mobileNumber}</span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted block mb-0.5">
                        Account Role & Status
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-ink text-surface">
                          {userDetail.role || 'USER'}
                        </span>
                        <span
                          className={`text-[11px] font-mono font-medium ${
                            userDetail.active ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {userDetail.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted block mb-0.5">
                        Registration Date
                      </span>
                      <span className="font-mono text-muted text-[11px]">
                        {new Date(userDetail.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {userDetail.contactEndpoint && (
                      <div className="col-span-full pt-2 border-t border-border/60">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted block mb-0.5">
                          Direct Contact Endpoint
                        </span>
                        <span className="font-mono text-ink text-xs">
                          {userDetail.contactEndpoint.type}: {userDetail.contactEndpoint.phoneNumber || userDetail.mobileNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Registered Resources */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5" />
                        <span>Registered Resources ({userDetail.resources?.length || 0})</span>
                      </h4>
                    </div>

                    {userDetail.resources && userDetail.resources.length > 0 ? (
                      <div className="space-y-3">
                        {userDetail.resources.map((res) => (
                          <div
                            key={res.id}
                            className="p-4 bg-bg border border-border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink text-sm">{res.name}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-surface border border-border text-muted">
                                  {res.type}
                                </span>
                              </div>
                              {(res.registrationNum || res.vehicleColour) && (
                                <p className="font-mono text-[11px] text-muted">
                                  {res.registrationNum && `Reg: ${res.registrationNum}`}
                                  {res.registrationNum && res.vehicleColour && ' • '}
                                  {res.vehicleColour && `Colour: ${res.vehicleColour}`}
                                </p>
                              )}
                            </div>

                            {/* Actions & QR Tag */}
                            <div className="flex items-center gap-2">
                              {res.qrTag ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded">
                                  <QrCode className="w-4 h-4 text-ink" />
                                  <div className="text-left font-mono">
                                    <div className="font-bold text-xs text-ink">
                                      {res.qrTag.tagNumber}
                                    </div>
                                    <div className="text-[10px] text-muted uppercase">
                                      {res.qrTag.status}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] font-mono text-subtle">
                                  No QR tag paired
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setAnalyticsResource({
                                    id: res.id,
                                    name: res.name,
                                    tagNumber: res.qrTag?.tagNumber,
                                    ownerName: userDetail.name,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded border border-border bg-surface hover:bg-bg text-ink text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                title="View scan and visit analytics"
                              >
                                <BarChart2 className="w-3.5 h-3.5" />
                                <span>Analytics</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-bg border border-border rounded text-xs text-muted font-mono">
                        No resources registered for this user yet.
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-border bg-bg/40 flex justify-end">
              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-4 py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Analytics Modal */}
      <ResourceAnalyticsModal
        isOpen={Boolean(analyticsResource)}
        onClose={() => setAnalyticsResource(null)}
        resourceId={analyticsResource?.id || null}
        resourceName={analyticsResource?.name}
        tagNumber={analyticsResource?.tagNumber}
        ownerName={analyticsResource?.ownerName}
      />
    </AdminLayout>
  );
};

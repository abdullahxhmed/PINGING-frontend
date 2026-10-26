import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type { AdminCommunicationSession } from '../../types/admin';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Radio,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

export const AdminCommunicationsPage: React.FC = () => {
  const [sessions, setSessions] = useState<AdminCommunicationSession[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded row ID for nested calls
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const fetchCommunications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await adminApi.getCommunications({
        page,
        limit,
        status: statusFilter,
      });
      const payload = res?.data || res;
      setSessions(payload?.sessions || []);
      setTotal(payload?.total || 0);
      setTotalPages(payload?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch communication sessions');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  const toggleExpand = (id: string) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds && seconds !== 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
            Communications
          </h1>
          <p className="text-xs text-muted mt-0.5 font-satoshi font-medium">
            {(total ?? 0).toLocaleString()} mediated proxy calls and telemetry sessions
          </p>
        </div>

        {/* Status Filter: Dropdown on Mobile / Clean Pills on Desktop */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none px-3 py-1.5 text-xs rounded bg-surface border border-border text-ink font-satoshi font-medium focus:outline-none focus:border-ink cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-[10px]">
              ▼
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchCommunications()}
            disabled={isLoading}
            className="btn btn-secondary !min-h-[30px] !py-0 !px-2.5 text-xs shrink-0 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="my-4 p-3 border-y border-red-500/30 text-xs text-danger font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchCommunications()} className="underline font-bold uppercase tracking-wider text-[11px] cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ── Mobile View: Clean Separator-Line List ── */}
      <div className="block md:hidden mt-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent mb-2" />
            <p className="font-satoshi text-xs text-muted">Loading Sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted border-y border-border">
            No communication sessions found.
          </div>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {sessions.map((sess) => {
              const isExpanded = expandedSessionId === sess.id;
              return (
                <div key={sess.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-satoshi font-medium text-xs text-ink tracking-tight">
                      {sess.reference}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-satoshi font-medium uppercase border border-border text-muted">
                        {sess.type}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-satoshi font-medium uppercase ${
                          sess.status === 'COMPLETED'
                            ? 'bg-success/15 text-success'
                            : sess.status === 'ACTIVE'
                            ? 'bg-accent/30 text-ink'
                            : 'bg-bg text-muted'
                        }`}
                      >
                        {sess.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-medium text-ink truncate">
                      {sess.resource?.name || 'Asset'} {sess.resource?.owner?.name ? `· ${sess.resource.owner.name}` : ''}
                    </span>
                    <span className="font-satoshi font-medium text-muted text-[11px] shrink-0">
                      {sess.callCount || 0} calls ({Math.round((sess.totalDurationSec || 0) / 60)}m)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted font-satoshi font-medium">{formatDate(sess.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface hover:bg-ink border border-ink/20 hover:border-ink text-ink hover:text-surface text-xs font-medium tracking-tight shadow-2xs hover:shadow-xs active:scale-[0.96] transition-all duration-150 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-ink group-hover:bg-accent transition-colors" />
                      <span>{isExpanded ? 'Hide Logs' : 'View Logs'}</span>
                      <ChevronDown className={`w-3 h-3 text-muted group-hover:text-surface transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-border/60 text-xs space-y-2">
                      {sess.calls && sess.calls.length > 0 ? (
                        <div className="space-y-1.5">
                          {sess.calls.map((call, cIdx) => (
                            <div
                              key={call.id || cIdx}
                              className="p-2 bg-surface border border-border rounded text-[11px] font-satoshi font-medium space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-ink">{call.direction || 'outbound-api'}</span>
                                <span className="uppercase text-[10px] text-muted">{call.status}</span>
                              </div>
                              <div className="text-muted text-[10px]">
                                {call.caller} → {call.callee}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted">
                                <span>{formatDuration(call.durationSec)}</span>
                                <span>{call.connectedAt ? new Date(call.connectedAt).toLocaleTimeString() : '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted text-[11px]">No nested call records logged for this session.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Desktop View: Clean Line Table ── */}
      <div className="hidden md:block mt-6 border-y border-border overflow-x-auto">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent mb-3" />
            <p className="font-satoshi text-xs text-muted tracking-wider uppercase">
              Loading Communication Sessions...
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted font-satoshi">
            No communication sessions found.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted font-satoshi uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 font-medium">Session Ref</th>
                <th className="py-2.5 px-4 font-medium">Type</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Resource &amp; Owner</th>
                <th className="py-2.5 px-4 font-medium">Calls / Duration</th>
                <th className="py-2.5 px-4 font-medium">Created Time</th>
                <th className="py-2.5 px-4 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {sessions.map((sess) => {
                  const isExpanded = expandedSessionId === sess.id;
                  return (
                    <React.Fragment key={sess.id}>
                      <tr className={`hover:bg-bg/40 transition-colors ${isExpanded ? 'bg-bg/40' : ''}`}>
                        <td className="py-3.5 px-5 font-mono font-semibold text-ink">
                          {sess.reference}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-bg border border-border text-ink">
                            {sess.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                              sess.status === 'COMPLETED'
                                ? 'bg-success/15 text-success'
                                : sess.status === 'ACTIVE'
                                ? 'bg-accent/30 text-ink'
                                : 'bg-bg text-muted'
                            }`}
                          >
                            {sess.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          {sess.resource ? (
                            <div>
                              <div className="font-semibold text-ink">{sess.resource.name}</div>
                              {sess.resource.owner && (
                                <div className="font-mono text-[11px] text-muted">
                                  {sess.resource.owner.name} ({sess.resource.owner.mobileNumber})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-subtle font-mono text-[11px]">Unlinked</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-muted text-[11px]">
                          <div>{sess.callCount || sess.calls?.length || 0} call(s)</div>
                          <div className="text-ink font-medium">
                            {formatDuration(sess.totalDurationSec)}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-muted text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(sess.createdAt).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpand(sess.id)}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-ink border border-ink/20 hover:border-ink text-ink hover:text-surface text-xs font-medium tracking-tight shadow-2xs hover:shadow-xs active:scale-[0.96] transition-all duration-150 cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-ink group-hover:bg-accent transition-colors" />
                            <span>{isExpanded ? 'Hide' : 'Calls'}</span>
                            <ChevronDown className={`w-3 h-3 text-muted group-hover:text-surface transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </tr>

                      {/* Nested Call Logs Row */}
                      {isExpanded && (
                        <tr className="bg-bg/60">
                          <td colSpan={7} className="p-4 sm:p-5">
                            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted border-b border-border/60 pb-2">
                                <span className="flex items-center gap-1.5 font-semibold text-ink">
                                  <Radio className="w-3.5 h-3.5 text-accent" />
                                  Telephony Proxy Records for {sess.reference}
                                </span>
                                <span>Provider: {sess.provider || 'edesy'}</span>
                              </div>

                              {sess.calls && sess.calls.length > 0 ? (
                                <div className="space-y-2">
                                  {sess.calls.map((call, cIdx) => (
                                    <div
                                      key={call.id || cIdx}
                                      className="p-3 bg-bg border border-border rounded grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono"
                                    >
                                      <div>
                                        <span className="text-[10px] uppercase text-muted block mb-0.5">
                                          Direction / SID
                                        </span>
                                        <span className="text-ink font-semibold">
                                          {call.direction || 'outbound-api'}
                                        </span>
                                        <span className="text-[10px] text-muted block truncate">
                                          {call.callSid || '—'}
                                        </span>
                                      </div>

                                      <div>
                                        <span className="text-[10px] uppercase text-muted block mb-0.5">
                                          Caller → Callee
                                        </span>
                                        <span className="text-ink">
                                          {call.caller} → {call.callee}
                                        </span>
                                      </div>

                                      <div>
                                        <span className="text-[10px] uppercase text-muted block mb-0.5">
                                          Duration & Status
                                        </span>
                                        <span className="text-ink font-semibold">
                                          {formatDuration(call.durationSec)}
                                        </span>
                                        <span className="text-[10px] text-muted block uppercase">
                                          {call.status}
                                        </span>
                                      </div>

                                      <div>
                                        <span className="text-[10px] uppercase text-muted block mb-0.5">
                                          Timestamps
                                        </span>
                                        <span className="text-[11px] text-muted block">
                                          Connected: {call.connectedAt ? new Date(call.connectedAt).toLocaleTimeString() : '—'}
                                        </span>
                                        <span className="text-[11px] text-muted block">
                                          Ended: {call.endedAt ? new Date(call.endedAt).toLocaleTimeString() : '—'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-4 text-center text-xs text-muted font-mono">
                                  No nested call records logged for this session.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border bg-bg/50 flex items-center justify-between text-xs">
            <span className="font-mono text-muted text-[11px]">
              Page {page} of {totalPages} ({total} sessions total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded border border-border bg-surface text-ink hover:border-ink disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-border bg-surface text-ink hover:border-ink disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

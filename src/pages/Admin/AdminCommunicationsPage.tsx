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
  ChevronUp,
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

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Communications
          </h1>
          <p className="text-xs text-muted mt-1">
            {(total ?? 0).toLocaleString()} mediated proxy calls and telemetry sessions
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'COMPLETED', 'ACTIVE', 'PENDING', 'EXPIRED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono uppercase font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-ink text-surface'
                  : 'bg-surface text-muted hover:text-ink border border-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="my-6 p-4 rounded bg-danger/10 border border-danger/20 text-xs text-danger font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchCommunications()} className="underline font-bold uppercase tracking-wider">
            Retry
          </button>
        </div>
      )}

      {/* Communications Table */}
      <div className="mt-8 bg-surface border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent mb-4" />
            <p className="font-mono text-xs text-muted tracking-widest uppercase">
              Loading Communication Sessions...
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted font-mono">
            No communication sessions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg/50 text-muted font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5 font-medium">Session Ref</th>
                  <th className="py-3 px-5 font-medium">Type</th>
                  <th className="py-3 px-5 font-medium">Status</th>
                  <th className="py-3 px-5 font-medium">Resource & Owner</th>
                  <th className="py-3 px-5 font-medium">Calls / Duration</th>
                  <th className="py-3 px-5 font-medium">Created Time</th>
                  <th className="py-3 px-5 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
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
                            className="px-2.5 py-1 bg-surface border border-border hover:border-ink rounded text-xs font-semibold uppercase tracking-wider text-ink transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Calls</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
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
          </div>
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

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminBatchModal } from '../../components/admin/AdminBatchModal';
import { adminApi } from '../../lib/adminApi';
import type { AdminDashboardData } from '../../types/admin';
import {
  RefreshCw,
  Plus,
  ArrowRight,
  Clock,
  Layers,
  ChevronRight,
  BarChart2,
  X,
  Sparkles,
} from 'lucide-react';
import { ResourceAnalyticsModal } from '../../components/admin/ResourceAnalyticsModal';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [analyticsResource, setAnalyticsResource] = useState<{
    id: string;
    name?: string;
    tagNumber?: string;
    ownerName?: string;
  } | null>(null);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupId, setLookupId] = useState('');

  const fetchDashboard = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res: any = await adminApi.getDashboard();
      const payload = res?.data || res;
      setData(payload);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load system metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const users = data?.users || { total: 0, active: 0 };
  const resources = data?.resources || { total: 0 };
  const qrTags = data?.qrTags || { total: 0, assigned: 0, available: 0 };
  const communications = data?.communications || { totalSessions: 0 };
  const recentActivity = data?.recentActivity || [];

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return `${diffDays}d ago`;
    } catch {
      return '—';
    }
  };

  const formatAbsoluteTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <AdminLayout>
      {/* 1. COMPACT PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Overview
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              All systems operational
            </span>
            <span className="text-border">•</span>
            <span>
              Updated {formatRelativeTime(lastUpdated.toISOString())}
            </span>
            <button
              type="button"
              onClick={() => fetchDashboard(true)}
              disabled={isRefreshing}
              className="text-muted hover:text-ink transition-colors p-0.5 rounded cursor-pointer"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Primary Header Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLookupOpen(true)}
            className="px-3.5 py-2 bg-surface border border-border hover:border-ink text-ink text-xs font-semibold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Inspect scan and traffic analytics for any resource"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Resource Analytics</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/inventory?action=mini')}
            className="px-3.5 py-2 bg-surface border border-border hover:border-ink text-ink text-xs font-semibold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Open Small QR (Mini) Sticker Builder"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Small QR Builder</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3.5 py-2 bg-ink text-surface hover:opacity-90 text-xs font-semibold uppercase tracking-wider rounded transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-accent" />
            <span>Generate QR batch</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="my-6 p-4 rounded bg-danger/10 border border-danger/20 text-xs text-danger font-medium flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchDashboard()}
            className="underline font-bold uppercase tracking-wider text-[11px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent mb-3" />
          <p className="font-mono text-xs text-muted tracking-wider uppercase">
            Loading metrics...
          </p>
        </div>
      ) : data ? (
        <div className="mt-6 space-y-10">
          {/* 2. RESTRAINED FLAT METRICS BAND */}
          <section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8 py-2">
              {/* Users */}
              <Link
                to="/admin/users"
                className="group flex flex-col justify-between transition-colors cursor-pointer"
              >
                <span className="text-xs font-medium text-muted">
                  Registered users
                </span>
                <div className="my-1.5">
                  <span className="font-display text-3xl font-medium tracking-tight text-ink group-hover:text-ink/80 transition-colors">
                    {(users.total ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-muted flex items-center justify-between">
                  <span>Total accounts</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>

              {/* Resources */}
              <div className="flex flex-col justify-between">
                <span className="text-xs font-medium text-muted">
                  Registered resources
                </span>
                <div className="my-1.5">
                  <span className="font-display text-3xl font-medium tracking-tight text-ink">
                    {(resources.total ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  Across all accounts
                </div>
              </div>

              {/* QR Inventory */}
              <Link
                to="/admin/inventory"
                className="group flex flex-col justify-between transition-colors cursor-pointer"
              >
                <span className="text-xs font-medium text-muted">
                  QR inventory
                </span>
                <div className="my-1.5">
                  <span className="font-display text-3xl font-medium tracking-tight text-ink group-hover:text-ink/80 transition-colors">
                    {(qrTags.total ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-muted flex items-center justify-between">
                  <span>
                    {(qrTags.assigned ?? 0).toLocaleString()} assigned · {(qrTags.available ?? 0).toLocaleString()} unassigned
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>

              {/* Communication Sessions */}
              <Link
                to="/admin/communications"
                className="group flex flex-col justify-between transition-colors cursor-pointer"
              >
                <span className="text-xs font-medium text-muted">
                  Communication sessions
                </span>
                <div className="my-1.5">
                  <span className="font-display text-3xl font-medium tracking-tight text-ink group-hover:text-ink/80 transition-colors">
                    {(communications.totalSessions ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-muted flex items-center justify-between">
                  <span>Lifetime total</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            </div>
          </section>

          {/* 3. OPERATIONAL CORE: QR INVENTORY */}
          <section className="pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  QR inventory
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {(qrTags.total ?? 0).toLocaleString()} tags · {(qrTags.available ?? 0).toLocaleString()} unassigned · 0 awaiting print
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/admin/inventory"
                  className="text-xs font-medium text-muted hover:text-ink flex items-center gap-1 transition-colors"
                >
                  <span>Manage inventory</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Inventory Status & Direct Action */}
            <div className="bg-surface border border-border rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="grid grid-cols-3 gap-6 sm:gap-10">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted block mb-1">
                    Unassigned tags
                  </span>
                  <span className="text-xl font-semibold text-ink font-mono">
                    {(qrTags.available ?? 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted block mb-1">
                    Awaiting print
                  </span>
                  <span className="text-xl font-semibold text-muted font-mono">
                    —
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted block mb-1">
                    Failed exports
                  </span>
                  <span className="text-xl font-semibold text-muted font-mono">
                    —
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBatchModalOpen(true)}
                className="px-3.5 py-2 bg-ink text-surface hover:opacity-90 text-xs font-semibold uppercase tracking-wider rounded transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>Generate batch</span>
              </button>
            </div>
          </section>

          {/* 4. RECENT OPERATIONAL ACTIVITY TABLE */}
          <section className="pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Recent communication sessions
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Latest mediated proxy calls and alert events across vehicles and properties
                </p>
              </div>
              <Link
                to="/admin/communications"
                className="text-xs font-medium text-muted hover:text-ink flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-surface">
              {recentActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-bg/40 text-muted font-mono uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-4 font-medium">Session Ref</th>
                        <th className="py-2.5 px-4 font-medium">Target Resource & Owner</th>
                        <th className="py-2.5 px-4 font-medium">Type</th>
                        <th className="py-2.5 px-4 font-medium">Status</th>
                        <th className="py-2.5 px-4 font-medium text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {recentActivity.map((act) => {
                        const isCompleted = act.status === 'COMPLETED';
                        const isActive = act.status === 'ACTIVE';
                        const isPending = act.status === 'PENDING';
                        const isExpired = act.status === 'EXPIRED';

                        return (
                          <tr
                            key={act.id}
                            onClick={() => navigate('/admin/communications')}
                            className="hover:bg-bg/50 transition-colors cursor-pointer group"
                          >
                            {/* Session Ref */}
                            <td className="py-3 px-4 font-mono font-medium text-ink group-hover:underline">
                              {act.reference}
                            </td>

                            {/* Resource & Owner */}
                            <td className="py-3 px-4">
                              <span className="font-medium text-ink">
                                {act.resourceName || '—'}
                              </span>
                              {act.ownerName && (
                                <span className="text-muted">
                                  {' '}· {act.ownerName}
                                </span>
                              )}
                            </td>

                            {/* Type */}
                            <td className="py-3 px-4 font-mono text-muted text-[11px] uppercase">
                              {act.type}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    : isCompleted
                                    ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                                    : isPending
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                    : isExpired
                                    ? 'bg-neutral-50 text-neutral-500 border border-neutral-200/60'
                                    : 'bg-neutral-100 text-neutral-600'
                                }`}
                              >
                                {act.status}
                              </span>
                            </td>

                            {/* Time with Freshness */}
                            <td className="py-3 px-4 text-right font-mono text-muted text-[11px]">
                              <span
                                title={formatAbsoluteTime(act.createdAt)}
                                className="inline-flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3 text-muted/60" />
                                {formatRelativeTime(act.createdAt)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted font-mono">
                  No communication sessions recorded yet.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {/* Batch Generation Modal */}
      <AdminBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={() => fetchDashboard(true)}
      />

      {/* Quick Lookup Modal */}
      {isLookupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-ink" />
                <h3 className="font-display text-base font-semibold text-ink">
                  Inspect Resource Analytics
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLookupOpen(false);
                  setLookupId('');
                }}
                className="text-muted hover:text-ink p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted">
              Enter a Resource ID to inspect real-time visitor traffic, QR scans, device breakdowns, and conversion metrics.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = lookupId.trim();
                if (trimmed) {
                  setIsLookupOpen(false);
                  setAnalyticsResource({ id: trimmed });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
                  Resource ID
                </label>
                <input
                  type="text"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder="e.g. res_clxyz... or UUID"
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-xs text-ink placeholder:text-muted/60 focus:outline-hidden focus:border-ink font-mono"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLookupOpen(false);
                    setLookupId('');
                  }}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!lookupId.trim()}
                  className="px-4 py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  View Analytics
                </button>
              </div>
            </form>
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

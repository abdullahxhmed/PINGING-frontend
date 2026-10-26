import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminBatchModal } from '../../components/admin/AdminBatchModal';
import { adminApi } from '../../lib/adminApi';
import type { AdminDashboardData, AdminOrderMetrics } from '../../types/admin';
import {
  RefreshCw,
  Plus,
  ArrowRight,
  BarChart2,
  X,
  Package,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { ResourceAnalyticsModal } from '../../components/admin/ResourceAnalyticsModal';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [orderMetrics, setOrderMetrics] = useState<AdminOrderMetrics | null>(null);
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
      const [dashRes, metricsRes] = await Promise.allSettled([
        adminApi.getDashboard(),
        adminApi.getOrderMetrics(),
      ]);

      if (dashRes.status === 'fulfilled') {
        const payload = (dashRes.value as any)?.data || dashRes.value;
        setData(payload);
      }
      if (metricsRes.status === 'fulfilled') {
        const m = (metricsRes.value as any)?.data || metricsRes.value;
        setOrderMetrics(m);
      }
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

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
            Overview
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              All systems operational
            </span>
            <span className="text-border">•</span>
            <span className="font-satoshi font-medium">Updated {formatRelativeTime(lastUpdated.toISOString())}</span>
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

        {/* Clean Header Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/orders"
            className="btn btn-primary !min-h-[32px] !py-0 !px-3 text-xs flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-accent" />
            <span>Orders ({orderMetrics?.totalOrders ?? 0})</span>
          </Link>
          <Link
            to="/admin/catalog"
            className="btn btn-secondary !min-h-[32px] !py-0 !px-3 text-xs flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5 text-muted" />
            <span>Catalog</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="btn btn-secondary !min-h-[32px] !py-0 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Batch</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="my-4 p-3 border-y border-red-500/30 text-xs text-danger font-medium flex items-center justify-between">
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
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent mb-3" />
          <p className="font-satoshi text-xs text-muted tracking-wider uppercase">
            Loading metrics...
          </p>
        </div>
      ) : data ? (
        <div className="mt-4 space-y-6">
          {/* ── 2. Metric Columns (Clean Alignment, Metric-First Focus) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 py-2">
            {/* Orders */}
            <Link to="/admin/orders" className="space-y-0.5 group">
              <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
                Total Orders
              </span>
              <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-ink tracking-tight group-hover:underline block">
                {(orderMetrics?.totalOrders ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-600 font-satoshi font-medium block">
                {orderMetrics?.paidOrders ?? 0} paid · ₹{(orderMetrics?.totalRevenueRupees ?? 0).toLocaleString()}
              </span>
            </Link>

            {/* Users */}
            <Link to="/admin/users" className="space-y-0.5 group">
              <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
                Users
              </span>
              <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-ink tracking-tight group-hover:underline block">
                {(users.total ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-muted font-satoshi font-medium block">
                {(users.active ?? users.total ?? 0).toLocaleString()} active accounts
              </span>
            </Link>

            {/* Assets */}
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
                Registered Assets
              </span>
              <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-ink tracking-tight block">
                {(resources.total ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-muted font-satoshi font-medium block">
                Vehicle stickers &amp; keychains
              </span>
            </div>

            {/* QR Stock */}
            <Link to="/admin/inventory" className="space-y-0.5 group">
              <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
                Unsold QR Stock
              </span>
              <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-ink tracking-tight group-hover:underline block">
                {(qrTags.available ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-muted font-satoshi font-medium block">
                Ready for shipping
              </span>
            </Link>

            {/* Communications */}
            <Link to="/admin/communications" className="space-y-0.5 group col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
                Proxy Calls
              </span>
              <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-ink tracking-tight group-hover:underline block">
                {(communications.totalSessions ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-muted font-satoshi font-medium block">
                Masked alert sessions
              </span>
            </Link>
          </div>

          {/* 3. Operations Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Recent Communication Sessions */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    Recent Activity
                  </h2>
                  <p className="text-xs text-muted">
                    Masked calls and proxy communications across tags
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

              {/* Mobile View: Clean Separator-Line List */}
              <div className="block md:hidden border-y border-border divide-y divide-border">
                {recentActivity.length > 0 ? (
                  recentActivity.map((act) => {
                    const isActive = act.status === 'ACTIVE';
                    const isCompleted = act.status === 'COMPLETED';

                    return (
                      <div
                        key={act.id}
                        className="py-3 space-y-1.5 hover:bg-surface/40 transition-colors group"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-satoshi font-medium text-ink">
                            {act.reference}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-satoshi font-medium">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive
                                  ? 'bg-emerald-600'
                                  : isCompleted
                                  ? 'bg-neutral-400'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span>{act.status}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span className="truncate max-w-[200px]">
                            {act.resourceName || 'Asset'} {act.ownerName ? `· ${act.ownerName}` : ''}
                          </span>
                          <span className="font-satoshi font-medium text-[10px]">
                            {formatRelativeTime(act.createdAt)}
                          </span>
                        </div>
                        <div className="pt-1.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => navigate('/admin/communications')}
                            className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface hover:bg-ink border border-ink/20 hover:border-ink text-ink hover:text-surface text-xs font-medium tracking-tight shadow-2xs hover:shadow-xs active:scale-[0.96] transition-all duration-150 cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-ink group-hover:bg-accent transition-colors" />
                            <span>Logs</span>
                            <ArrowRight className="w-3 h-3 text-muted group-hover:text-surface group-hover:translate-x-0.5 transition-all" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-muted font-satoshi">
                    No communication sessions recorded yet.
                  </div>
                )}
              </div>

              {/* Desktop View: Clean Line Table */}
              <div className="hidden md:block border-y border-border overflow-x-auto">
                {recentActivity.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted font-satoshi uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3 font-medium">Session</th>
                        <th className="py-2 px-3 font-medium">Resource</th>
                        <th className="py-2 px-3 font-medium">Type</th>
                        <th className="py-2 px-3 font-medium">Status</th>
                        <th className="py-2 px-3 font-medium text-right">Time</th>
                        <th className="py-2 px-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentActivity.map((act) => {
                        const isActive = act.status === 'ACTIVE';
                        const isCompleted = act.status === 'COMPLETED';

                        return (
                          <tr
                            key={act.id}
                            className="hover:bg-surface/50 transition-colors group"
                          >
                            <td className="py-2.5 px-3 font-satoshi font-medium text-ink">
                              {act.reference}
                            </td>
                            <td className="py-2.5 px-3 text-ink">
                              <span className="font-medium">{act.resourceName || '—'}</span>
                              {act.ownerName && (
                                <span className="text-muted"> · {act.ownerName}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-satoshi font-medium text-muted text-[11px] uppercase">
                              {act.type}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-satoshi font-medium text-ink">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isActive
                                      ? 'bg-emerald-600'
                                      : isCompleted
                                      ? 'bg-neutral-400'
                                      : 'bg-amber-500'
                                  }`}
                                />
                                <span>{act.status}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-satoshi font-medium text-muted text-[11px]">
                              {formatRelativeTime(act.createdAt)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => navigate('/admin/communications')}
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface hover:bg-ink border border-ink/20 hover:border-ink text-ink hover:text-surface text-xs font-medium tracking-tight shadow-2xs hover:shadow-xs active:scale-[0.96] transition-all duration-150 cursor-pointer"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-ink group-hover:bg-accent transition-colors" />
                                <span>Logs</span>
                                <ArrowRight className="w-3 h-3 text-muted group-hover:text-surface group-hover:translate-x-0.5 transition-all" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-xs text-muted font-satoshi">
                    No communication sessions recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right col: Quick Operations & Inventory Status Panel */}
            <div>
              <div className="bg-surface border border-border/80 rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    Fulfillment & Stock
                  </h2>
                  <p className="text-xs text-muted">Physical QR print status</p>
                </div>

                <div className="divide-y divide-border text-xs py-1">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-muted">Total printed tags</span>
                    <span className="font-satoshi font-medium text-ink">
                      {(qrTags.total ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-muted">In stock (Ready to pack)</span>
                    <span className="font-satoshi font-medium text-emerald-700">
                      {(qrTags.available ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-muted">Assigned to customer vehicles</span>
                    <span className="font-satoshi font-medium text-ink">
                      {(qrTags.assigned ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(true)}
                    className="w-full py-2.5 bg-ink text-surface hover:opacity-90 active:scale-[0.99] text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Print New QR Batch</span>
                  </button>
                  <Link
                    to="/admin/catalog"
                    className="w-full py-2.5 bg-surface border border-border hover:border-ink text-ink text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 text-center shadow-xs"
                  >
                    <span>Configure Store Packs</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
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
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-ink" />
                <h3 className="text-sm font-semibold text-ink">
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
              Enter a Resource ID or tag number to view scans, traffic, and conversion metrics.
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
                <input
                  type="text"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder="e.g. res_clxyz... or tag number"
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-ink font-mono"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsLookupOpen(false);
                    setLookupId('');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!lookupId.trim()}
                  className="px-3.5 py-1.5 bg-ink text-surface text-xs font-medium rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Inspect
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

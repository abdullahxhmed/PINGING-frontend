import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { Resource, CallRecord, ResourceAnalyticsResponse } from '../../types/api';
import {
  resourcesApi,
  extractResourceTag,
  getResourceContactUrl,
  buildTagQrUrl,
  resourceCache,
  syncResourceTagUpdate,
} from '../../lib/api';
import { Layout } from '../../components/layout/Layout';
import { Surface, Button, Modal, useToast, DelayedSpinner } from '../../components/ui';
import {
  EditResourceModal,
  PairQrModal,
  UnpairQrModal,
  GenerateDigitalQrModal,
  ShareTagSheet,
} from '../../components/resources';
import {
  ResourceHeader,
  type ResourceTabType,
} from './ResourceHeader';
import {
  ResourceOverviewTab,
  type ActivityItem,
} from './ResourceOverviewTab';
import { ResourceActivityTab } from './ResourceActivityTab';
import { ResourceSettingsTab } from './ResourceSettingsTab';
import { ArrowLeft } from 'lucide-react';



function formatEventTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today · ${timeStr}`;
    if (isYesterday) return `Yesterday · ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${timeStr}`;
  } catch {
    return dateStr;
  }
}

export const ResourceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isReload = useMemo(() => resourceCache.isPageReload(), []);

  // Initialize immediately from localStorage cache
  const [resource, setResource] = useState<Resource | null>(() => (id ? resourceCache.getResource(id) : null));
  const [calls, setCalls] = useState<CallRecord[]>(() => (id ? resourceCache.getCalls(id) || [] : []));
  const [analytics, setAnalytics] = useState<ResourceAnalyticsResponse | null>(() => (id ? resourceCache.getAnalytics(id) : null));
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!id) return false;
    if (isReload) return true;
    return !resourceCache.getResource(id);
  });
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<ResourceTabType>('overview');

  // Modals
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isUnpairModalOpen, setIsUnpairModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAnalytics = useCallback(async (force = false) => {
    if (!id) return;
    try {
      const analyticsRes = await resourcesApi.getAnalytics(id, force);
      const analyticsData = (analyticsRes as any)?.data || analyticsRes;
      setAnalytics(analyticsData);
      if (analyticsData) {
        resourceCache.setAnalytics(id, analyticsData);
      }
    } catch {
      // Quietly ignore analytics error
    }
  }, [id]);

  const fetchResource = useCallback(async (showLoadingSpinner = true) => {
    if (!id) return;
    if (showLoadingSpinner) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data: any = await resourcesApi.getById(id);
      const resData = data?.resource || data?.data || data;
      setResource(resData);
      resourceCache.setResource(id, resData);

      // Attempt to load recorded calls if backend supports it
      try {
        const callsRes = await resourcesApi.getCalls(id);
        const callsList = (callsRes as any)?.calls || (callsRes as any)?.data || [];
        if (Array.isArray(callsList)) {
          setCalls(callsList);
          resourceCache.setCalls(id, callsList);
        }
      } catch (err) {
        // Quietly fallback to empty calls list if call history endpoint is not yet mounted
        setCalls([]);
        resourceCache.setCalls(id, []);
      }

      // Fetch analytics for scans and last scan data
      await fetchAnalytics(true);
    } catch (err: any) {
      if (!resourceCache.getResource(id)) {
        setError(err.message || 'Failed to load resource details');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchAnalytics]);

  useEffect(() => {
    if (!id) return;

    const isReload = resourceCache.isPageReload();
    const cached = resourceCache.getResource(id);
    const cachedCalls = resourceCache.getCalls(id);
    const cachedAnalytics = resourceCache.getAnalytics(id);

    if (cached) {
      setResource(cached);
      if (cachedCalls !== null) setCalls(cachedCalls);
      if (cachedAnalytics !== null) setAnalytics(cachedAnalytics);
      setIsLoading(false);
    }

    // Always fetch analytics when opening the resource to display fresh scan counts, last scan, and visits
    fetchAnalytics(isReload);

    // Only fetch fresh resource if not cached OR if the user reloaded/refreshed the page
    if (!cached || cachedCalls === null || isReload) {
      fetchResource(!cached);
      if (isReload) {
        resourceCache.consumeReload();
      }
    }

    const handleUpdate = () => {
      fetchResource(false);
      fetchAnalytics(true);
    };

    window.addEventListener('resource:updated', handleUpdate);
    window.addEventListener('tag:updated', handleUpdate);

    return () => {
      window.removeEventListener('resource:updated', handleUpdate);
      window.removeEventListener('tag:updated', handleUpdate);
    };
  }, [id, fetchResource, fetchAnalytics]);

  const handleConfirmDelete = async () => {
    if (!resource) return;
    const targetId = resource.id || (resource as any)._id || id;
    if (!targetId) return;

    setIsDeleting(true);
    try {
      await resourcesApi.delete(targetId);
      resourceCache.removeResource(targetId);
      syncResourceTagUpdate(targetId, null, activeTag);
      toast.success(`"${resource.name}" deleted successfully`);
      setIsDeleteModalOpen(false);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete resource');
    } finally {
      setIsDeleting(false);
    }
  };

  const [isTogglingPause, setIsTogglingPause] = useState(false);

  const handleTogglePause = async () => {
    if (!resource) return;
    setIsTogglingPause(true);
    try {
      const isCurrentlyPaused = Boolean(resource.isPaused || resource.qrTag?.isPaused);
      if (isCurrentlyPaused) {
        await resourcesApi.resume(resource.id);
        toast.success('QR tag resumed successfully');
      } else {
        await resourcesApi.pause(resource.id);
        toast.success('QR tag paused successfully');
      }
      await fetchResource(false);
      window.dispatchEvent(new CustomEvent('resource:updated', { detail: { id: resource.id } }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update tag status');
    } finally {
      setIsTogglingPause(false);
    }
  };

  const directTag = resource ? extractResourceTag(resource) : '';
  const activeTag = directTag;

  const publicUrl = useMemo(() => {
    if (!resource) return '';
    if (activeTag) {
      return buildTagQrUrl(activeTag);
    }
    return getResourceContactUrl(resource);
  }, [resource, activeTag]);

  const handleCopyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Public contact link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // Convert real calls and analytics visits to ActivityItems
  const activities: ActivityItem[] = useMemo(() => {
    const list: (ActivityItem & { rawTimestamp: number })[] = [];

    if (Array.isArray(calls)) {
      calls.forEach((c) => {
        const isMsg = c.type === 'MESSAGE';
        const isConn = c.status === 'CONNECTED' || c.status === 'COMPLETED';
        const dateStr = c.createdAt || c.incomingAt || '';
        const ts = dateStr ? new Date(dateStr).getTime() : 0;
        list.push({
          id: c.id || c.sessionId,
          type: isMsg ? 'request' : 'call',
          title: isMsg
            ? 'Contact request via private relay'
            : isConn
            ? 'Call connected'
            : 'Private relay call attempted',
          subtitle: c.callerLastTwo
            ? `Private relay (••• ${c.callerLastTwo}) · ${c.duration || `${c.durationSec || 0}s`}`
            : isConn
            ? `Connected · ${c.duration || 'Private relay'}`
            : `Status: ${c.status}`,
          time: formatEventTime(dateStr),
          status: c.status,
          rawTimestamp: isNaN(ts) ? 0 : ts,
        });
      });
    }

    if (Array.isArray(analytics?.recentVisits)) {
      analytics.recentVisits.forEach((v) => {
        const isScan = v.source === 'qr_scan';
        const dateStr = v.createdAt || '';
        const ts = dateStr ? new Date(dateStr).getTime() : 0;
        const device = v.deviceType
          ? `${v.deviceType.charAt(0).toUpperCase()}${v.deviceType.slice(1).toLowerCase()}`
          : '';

        list.push({
          id: v.id,
          type: isScan ? 'scan' : 'click',
          title: isScan ? 'Sticker scanned' : 'Link opened',
          subtitle: isScan
            ? (device ? `Via sticker scan · ${device}` : 'Via sticker scan')
            : (device ? `Via shared link · ${device}` : 'Via shared link'),
          time: formatEventTime(dateStr),
          status: 'Recorded',
          rawTimestamp: isNaN(ts) ? 0 : ts,
        });
      });
    }

    // Sort descending by timestamp
    return list.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  }, [calls, analytics]);

  if (isLoading) {
    return (
      <Layout>
        <DelayedSpinner delay={180}>
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent mb-3" />
            <p className="body-sm text-muted">Loading resource details...</p>
          </div>
        </DelayedSpinner>
      </Layout>
    );
  }

  if (error || !resource) {
    return (
      <Layout>
        <div className="py-12 max-w-lg mx-auto text-center animate-fade-in">
          <Surface className="border-danger/30 bg-danger/5">
            <h3 className="heading-md text-danger">Error Loading Resource</h3>
            <p className="body-sm text-danger/80 mt-1 mb-4">{error || 'Resource not found'}</p>
            <Link to="/dashboard">
              <Button variant="secondary" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Back to Dashboard
              </Button>
            </Link>
          </Surface>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-4 pb-12">
        {/* 1. Header with Breadcrumbs, Badges, Tag Reference, Primary Actions & Segmented Tabs */}
        <ResourceHeader
          resource={resource}
          activeTag={activeTag}
          publicUrl={publicUrl}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenShareSheet={() => setIsShareOpen(true)}
          activityCount={activities.length}
        />

        {/* 2. Active Tab Content View */}
        <div className="pt-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'overview' && (
                <ResourceOverviewTab
                  resource={resource}
                  activeTag={activeTag}
                  publicUrl={publicUrl}
                  recentActivity={activities.slice(0, 5)}
                  isTogglingPause={isTogglingPause}
                  onNavigateToActivity={() => setActiveTab('activity')}
                  onOpenShareSheet={() => setIsShareOpen(true)}
                  onOpenPairModal={() => setIsPairModalOpen(true)}
                  onTogglePause={handleTogglePause}
                  analytics={analytics}
                  callsCount={calls.length}
                />
              )}

              {activeTab === 'activity' && (
                <ResourceActivityTab
                  events={activities}
                  resourceId={resource.id}
                />
              )}

              {activeTab === 'settings' && (
                <ResourceSettingsTab
                  resource={resource}
                  activeTag={activeTag}
                  publicUrl={publicUrl}
                  copied={copied}
                  isTogglingPause={isTogglingPause}
                  onOpenEditModal={() => setIsEditing(true)}
                  onOpenPairModal={() => setIsPairModalOpen(true)}
                  onOpenUnpairModal={() => setIsUnpairModalOpen(true)}
                  onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
                  onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
                  onCopyUrl={handleCopyUrl}
                  onTogglePause={handleTogglePause}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modals & Slide-overs */}

        {/* Share Tag Sheet */}
        <ShareTagSheet
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          resource={resource}
        />

        {/* Edit Resource Modal */}
        <EditResourceModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          resource={resource}
          onUpdated={(updated) => {
            setResource(updated);
            if (id) resourceCache.setResource(id, updated);
          }}
          onDelete={() => {
            if (id) resourceCache.removeResource(id);
            navigate('/dashboard');
          }}
        />

        {/* Pair Physical Tag Modal */}
        <PairQrModal
          isOpen={isPairModalOpen}
          onClose={() => setIsPairModalOpen(false)}
          initialResourceId={resource.id}
          onSuccess={() => {
            fetchResource(false);
            setIsPairModalOpen(false);
          }}
        />

        {/* Unpair Tag Modal */}
        <UnpairQrModal
          isOpen={isUnpairModalOpen}
          onClose={() => setIsUnpairModalOpen(false)}
          resourceId={resource.id}
          resourceName={resource.name}
          tagNumber={activeTag}
          onUnpaired={() => {
            syncResourceTagUpdate(resource.id, null, activeTag);
            fetchResource(false);
            setIsUnpairModalOpen(false);
          }}
        />

        {/* Generate Digital QR Modal */}
        <GenerateDigitalQrModal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          resourceId={resource.id}
          resourceName={resource.name}
          onGenerated={() => {
            fetchResource(false);
            setIsGenerateModalOpen(false);
          }}
        />

        {/* Delete Resource Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={`Delete ${resource.name}`}
        >
          <div className="space-y-4 pt-1">
            <p className="text-sm text-ink leading-relaxed">
              Are you sure you want to delete <strong className="font-semibold text-ink">&ldquo;{resource.name}&rdquo;</strong>?
            </p>
            <p className="text-xs text-muted leading-relaxed">
              This permanently removes the {resource.type?.toLowerCase() || 'vehicle'} and deactivates its physical sticker{activeTag ? ` (#${activeTag})` : ''}. Anyone who scans the sticker will see an inactive tag page instead of reaching you. You can re-link the sticker to another {resource.type?.toLowerCase() || 'vehicle'} later.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium rounded-xs border border-border bg-surface hover:bg-bg text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium rounded-xs bg-danger text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

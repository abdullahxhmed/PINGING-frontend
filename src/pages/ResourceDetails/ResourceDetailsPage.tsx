import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { Resource, CallRecord } from '../../types/api';
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
import { ArrowLeft, Trash2 } from 'lucide-react';



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
      }
    } catch (err: any) {
      if (!resourceCache.getResource(id)) {
        setError(err.message || 'Failed to load resource details');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const cached = resourceCache.getResource(id);
    if (cached) {
      setResource(cached);
      const cachedCalls = resourceCache.getCalls(id);
      if (cachedCalls) setCalls(cachedCalls);
      setIsLoading(false);
    }

    // Always fetch fresh resource from backend to reflect tag additions, changes, or removals
    fetchResource(!cached);

    const handleUpdate = () => {
      fetchResource(false);
    };

    window.addEventListener('resource:updated', handleUpdate);
    window.addEventListener('tag:updated', handleUpdate);

    return () => {
      window.removeEventListener('resource:updated', handleUpdate);
      window.removeEventListener('tag:updated', handleUpdate);
    };
  }, [id, fetchResource]);

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

  // Convert real calls to ActivityItems if they exist
  const activities: ActivityItem[] = useMemo(() => {
    if (!calls || calls.length === 0) return [];
    return calls.map((c) => {
      const isMsg = c.type === 'MESSAGE';
      const isConn = c.status === 'CONNECTED' || c.status === 'COMPLETED';
      return {
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
        time: formatEventTime(c.createdAt || c.incomingAt),
        status: c.status,
      };
    });
  }, [calls]);

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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activeTab === 'overview' && (
              <ResourceOverviewTab
                resource={resource}
                activeTag={activeTag}
                publicUrl={publicUrl}
                recentActivity={activities.slice(0, 5)}
                onNavigateToActivity={() => setActiveTab('activity')}
                onOpenShareSheet={() => setIsShareOpen(true)}
                onOpenPairModal={() => setIsPairModalOpen(true)}
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
                onOpenEditModal={() => setIsEditing(true)}
                onOpenPairModal={() => setIsPairModalOpen(true)}
                onOpenUnpairModal={() => setIsUnpairModalOpen(true)}
                onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
                onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
                onCopyUrl={handleCopyUrl}
              />
            )}
          </motion.div>
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
          title="Delete resource"
        >
          <div className="space-y-5">
            <p className="text-sm text-ink leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-ink">&ldquo;{resource.name}&rdquo;</span>?
              This action is permanent and will immediately detach the physical tag and deactivate all public contact gateways.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xs border border-border bg-surface hover:bg-bg text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xs bg-danger text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete resource'}</span>
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

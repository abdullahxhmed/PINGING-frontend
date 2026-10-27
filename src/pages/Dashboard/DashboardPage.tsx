import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../../types/api';
import { resourcesApi, resourceCache } from '../../lib/api';
import { Layout } from '../../components/layout/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { ResourceRow, CreateResourceModal, EditResourceModal, PairQrModal, TagSetupFlow, MobileTagDetailView } from '../../components/resources';
import { Button, DelayedSpinner, useToast } from '../../components/ui';
import { useSubscription } from '../../features/subscription';
import { Plus, ShieldAlert, ArrowLeft, Sparkles } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const isReload = useMemo(() => resourceCache.isPageReload(), []);
  const cachedList = useMemo(() => resourceCache.getResourcesList(), []);

  const [resources, setResources] = useState<Resource[]>(() => cachedList || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (isReload) return true;
    return !cachedList;
  });
  const [error, setError] = useState<string | null>(null);

  // Modals & Flow State
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPairOpen, setIsPairOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [selectedMobileIndex, setSelectedMobileIndex] = useState(0);

  const fetchResources = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await resourcesApi.list();
      const list = Array.isArray(data) ? data : [];
      setResources(list);
      resourceCache.setResourcesList(list);
    } catch (err: any) {
      if (!resourceCache.getResourcesList()) {
        setError(err.message || 'Failed to load resources');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Stale-while-revalidate: display cached resources immediately without blocking,
    // but always fetch fresh server data so tag additions/updates/unpairings are never missed!
    fetchResources(!cachedList);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchResources(false);
      }, 350);
    };

    window.addEventListener('resource:updated', handleUpdate);
    window.addEventListener('tag:updated', handleUpdate);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('resource:updated', handleUpdate);
      window.removeEventListener('tag:updated', handleUpdate);
    };
  }, [fetchResources, cachedList]);

  const { toast } = useToast();
  const { tags, subscription, isPlus, openUpgradeModal, refetch: refetchSubscription } = useSubscription();

  const handleCreated = (newResource: Resource) => {
    const newId = newResource.id || (newResource as any)._id;
    setResources((prev) => {
      const exists = prev.some((r) => (r.id || (r as any)._id) === newId);
      const next = exists
        ? prev.map((r) => ((r.id || (r as any)._id) === newId ? { ...r, ...newResource } : r))
        : [newResource, ...prev];
      resourceCache.setResourcesList(next);
      return next;
    });
    setSelectedMobileIndex(0);
    setIsAddingTag(false);
    refetchSubscription();
  };

  const handleUpdated = (updated: Resource) => {
    const updatedId = updated.id || (updated as any)._id;
    setResources((prev) => {
      const next = prev.map((r) => ((r.id || (r as any)._id) === updatedId ? { ...r, ...updated } : r));
      resourceCache.setResourcesList(next);
      return next;
    });
    if (updatedId) {
      resourceCache.setResource(updatedId, updated);
    }
  };

  const handleDelete = (id: string) => {
    setResources((prev) => {
      const next = prev.filter((r) => (r.id || (r as any)._id) !== id);
      resourceCache.setResourcesList(next);
      setSelectedMobileIndex((curr) => Math.min(curr, Math.max(0, next.length - 1)));
      return next;
    });
    resourceCache.removeResource(id);
    refetchSubscription();
  };

  // Synchronously calculate remaining tag quota before opening pairing flow
  const handleAddTagClick = () => {
    const maxLimit = tags?.maxLimit ?? subscription?.maxActiveTags ?? (isPlus ? 8 : 2);
    const activeCount = typeof tags?.activeCount === 'number'
      ? Math.max(tags.activeCount, resources.length)
      : resources.length;
    const remainingTags = Math.max(0, maxLimit - activeCount);

    if (remainingTags === 0) {
      if (isPlus) {
        toast.info('Maximum tag limit reached (8 tags on Kauntact Plus).');
      } else {
        toast.info('Tag limit reached. Upgrade to Kauntact Plus to add up to 8 tags.', {
          actionLabel: 'View plan',
          onClick: () => openUpgradeModal(),
        });
      }
      return;
    }

    setIsAddingTag(true);
  };



  // Stable header title and subtitle: never flash "GET STARTED." while loading tags
  const headerTitle = isAddingTag
    ? 'ADD TAG.'
    : !isLoading && resources.length === 0
    ? 'GET STARTED.'
    : 'YOUR TAGS.';

  const headerSubtitle = isAddingTag
    ? 'Pair a physical sticker or create a digital tag'
    : isLoading
    ? 'Checking active tags...'
    : resources.length === 0
    ? 'Pair your first physical sticker or digital tag'
    : `You have ${resources.length} active tag${resources.length === 1 ? '' : 's'}`;

  return (
    <Layout>
      {/* Direct Editorial Header - Fast, deliberate, quiet load */}
      <div className="pb-4 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-3"
        >
          <h1 className="font-display font-medium text-3xl sm:text-5xl lg:text-6xl tracking-[-0.03em] text-ink uppercase leading-none">
            {headerTitle}
          </h1>

          {/* Subtitle and Add Tag in one line */}
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-sm sm:text-base text-muted tracking-normal">
              {headerSubtitle}
            </p>

            {isAddingTag ? (
              <button
                type="button"
                onClick={() => setIsAddingTag(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.1em] text-muted hover:text-ink uppercase transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span>CANCEL</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddTagClick}
                className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.1em] text-ink hover:text-muted uppercase transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>ADD TAG</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Guest Order Claim & Plus Activation Banner */}
      {sessionStorage.getItem('pending_claim_order') && (
        <div className="my-4 p-4 rounded-xl bg-surface border border-accent/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-accent shrink-0" />
            <div>
              <p className="font-semibold text-ink">
                Unclaimed Order #{sessionStorage.getItem('pending_claim_order')}
              </p>
              <p className="text-muted text-[11px] mt-0.5">
                Claim this purchase to activate your included 12-Month Plus subscription.
              </p>
            </div>
          </div>
          <Link
            to={`/order/${encodeURIComponent(sessionStorage.getItem('pending_claim_order') || '')}`}
            className="px-3.5 py-1.5 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded hover:opacity-90 transition-opacity shrink-0 text-center"
          >
            Claim Plus Plan
          </Link>
        </div>
      )}

      {/* Main Content Area - Immediate Access to Resources */}
      {isLoading ? (
        <DelayedSpinner delay={180}>
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent mb-4" />
            <p className="font-sans text-xs text-muted tracking-widest uppercase">
              Loading tags...
            </p>
          </div>
        </DelayedSpinner>
      ) : error ? (
        <div className="py-16 text-center max-w-md mx-auto animate-fade-in">
          <ShieldAlert className="h-7 w-7 text-danger mx-auto mb-3" />
          <h3 className="heading-md text-danger text-lg uppercase">Registry Unavailable</h3>
          <p className="body-sm text-danger/80 mt-1 max-w-md mx-auto mb-6">{error}</p>
          <Button
            variant="secondary"
            onClick={() => {
              fetchResources();
            }}
            className="!h-10 text-xs tracking-wider uppercase font-semibold"
          >
            TRY AGAIN
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {isAddingTag ? (
            /* Reused Setup Flow when user clicks ADD TAG with smooth roll down / up */
            <motion.div
              key="add-tag-flow"
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: 'auto',
                transition: {
                  height: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.35, delay: 0.08 },
                },
                transitionEnd: { overflow: 'visible' },
              }}
              exit={{
                opacity: 0,
                height: 0,
                overflow: 'hidden',
                transition: {
                  height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.2 },
                },
              }}
              className="py-6 sm:py-12"
            >
              <TagSetupFlow
                existingResources={resources}
                hasExistingTags={resources.length > 0}
                onComplete={(newRes) => {
                  handleCreated(newRes);
                  fetchResources(false);
                }}
                onCancel={() => setIsAddingTag(false)}
              />
            </motion.div>
          ) : resources.length === 0 ? (
            /* Empty State & Initial Onboarding - Clean, quiet, interactive immediately */
            <motion.div
              key="empty-setup-flow"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
              className="py-10 sm:py-16"
            >
              <TagSetupFlow
                existingResources={resources}
                hasExistingTags={false}
                onComplete={(newRes) => {
                  handleCreated(newRes);
                  fetchResources(false);
                }}
              />
            </motion.div>
          ) : (
            /* Returning user tags list with smooth exit and entry */
            <motion.div
              key="user-tags-list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Mobile Single-Tag Focused Experience (< md) */}
              <div className="md:hidden">
                <MobileTagDetailView
                  resources={resources}
                  selectedIndex={selectedMobileIndex}
                  onSelectIndex={setSelectedMobileIndex}
                  onEdit={(r) => setEditingResource(r)}
                  onDelete={handleDelete}
                  onAddTag={handleAddTagClick}
                />
              </div>

              {/* Desktop Multi-Tag Table View (md+) */}
              <div className="hidden md:block max-w-4xl mx-auto divide-y-0">
                {resources.map((resource, idx) => (
                  <ResourceRow
                    key={resource.id}
                    index={idx}
                    resource={resource}
                    onEdit={(r) => setEditingResource(r)}
                    onDelete={handleDelete}
                    onRefresh={fetchResources}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Modals */}
      <CreateResourceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      <EditResourceModal
        isOpen={Boolean(editingResource)}
        onClose={() => setEditingResource(null)}
        resource={editingResource}
        onUpdated={handleUpdated}
        onDelete={handleDelete}
      />

      <PairQrModal
        isOpen={isPairOpen}
        onClose={() => setIsPairOpen(false)}
        onSuccess={() => {
          setIsPairOpen(false);
          fetchResources();
        }}
      />
    </Layout>
  );
};

export default DashboardPage;

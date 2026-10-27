import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Resource } from '../../types/api';
import { resourcesApi, resourceCache } from '../../lib/api';
import { Layout } from '../../components/layout/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { ResourceRow, CreateResourceModal, EditResourceModal, PairQrModal, TagSetupFlow, MobileTagDetailView } from '../../components/resources';
import { Button, DelayedSpinner, useToast } from '../../components/ui';
import { useSubscription } from '../../features/subscription';
import { useAuth } from '../../features/auth/AuthContext';
import { getOrderStatus } from '../../services/checkout';
import { Plus, ShieldAlert, ArrowLeft, QrCode, ArrowRight, X } from 'lucide-react';

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
  const [pendingClaimOrder, setPendingClaimOrder] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get('pending_claim_order') || urlParams.get('claim_order');
      if (fromUrl) return fromUrl;
      const raw = sessionStorage.getItem('pending_claim_order');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed?.orderNumber || raw;
      } catch {
        return raw;
      }
    } catch {
      return null;
    }
  });

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
  const { user } = useAuth();
  const { tags, subscription, isPlus, openUpgradeModal, refetch: refetchSubscription } = useSubscription();

  // Validate that pendingClaimOrder belongs to the current logged-in user
  useEffect(() => {
    if (!pendingClaimOrder) return;

    const userPhone = user?.mobileNumber ? user.mobileNumber.replace(/\D/g, '').slice(-10) : '';

    // 1. Verify against local storage metadata if available
    try {
      const raw = sessionStorage.getItem('pending_claim_order');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.phone && userPhone) {
          const storedPhone = String(parsed.phone).replace(/\D/g, '').slice(-10);
          if (storedPhone && storedPhone !== userPhone) {
            // Order was placed under a different mobile number; purge immediately
            sessionStorage.removeItem('pending_claim_order');
            setPendingClaimOrder(null);
            return;
          }
        }
      }
    } catch {}

    // 2. Authoritative backend check: verify order recipient phone matches logged in user
    let isSubscribed = true;
    getOrderStatus(pendingClaimOrder)
      .then((orderData) => {
        if (!isSubscribed) return;
        const orderPhone = (
          orderData?.customerPhone ||
          orderData?.shippingAddress?.phoneNumber ||
          ''
        )
          .replace(/\D/g, '')
          .slice(-10);

        // If order already claimed, or phone doesn't match the logged-in user
        if (orderData.isClaimed || (userPhone && orderPhone && orderPhone !== userPhone)) {
          try {
            sessionStorage.removeItem('pending_claim_order');
          } catch {}
          setPendingClaimOrder(null);
        }
      })
      .catch(() => {
        // Unresolvable order; do not show
        try {
          sessionStorage.removeItem('pending_claim_order');
        } catch {}
        if (isSubscribed) {
          setPendingClaimOrder(null);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [pendingClaimOrder, user?.mobileNumber]);

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

      {/* Subtle Unclaimed Order Notice */}
      {pendingClaimOrder && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mb-4 py-2 px-3 sm:px-3.5 rounded bg-surface border border-border/80 flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 min-w-0 text-muted">
            <QrCode className="w-3.5 h-3.5 text-ink shrink-0" />
            <span className="truncate">
              Order <span className="font-mono text-ink">#{pendingClaimOrder}</span> &bull; Physical tag ready to pair
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPairOpen(true)}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-ink uppercase tracking-wider hover:opacity-75 transition-opacity cursor-pointer"
            >
              <span>Pair Tag</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem('pending_claim_order');
                } catch {}
                setPendingClaimOrder(null);
              }}
              className="text-muted/60 hover:text-ink transition-colors p-0.5 cursor-pointer"
              title="Dismiss notice"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
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
          try {
            sessionStorage.removeItem('pending_claim_order');
          } catch {}
          setPendingClaimOrder(null);
          fetchResources();
        }}
      />
    </Layout>
  );
};

export default DashboardPage;

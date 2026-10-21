import React, { useState, useEffect, useCallback } from 'react';
import type { Resource } from '../../types/api';
import { resourcesApi } from '../../lib/api';
import { Layout } from '../../components/layout/Layout';
import { motion } from 'motion/react';
import { ResourceRow, CreateResourceModal, EditResourceModal, PairQrModal, TagSetupFlow, MobileTagDetailView } from '../../components/resources';
import { Button, DelayedSpinner } from '../../components/ui';
import { Plus, ShieldAlert, ArrowLeft } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Flow State
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPairOpen, setIsPairOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [selectedMobileIndex, setSelectedMobileIndex] = useState(0);

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await resourcesApi.list();
      setResources(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleCreated = (newResource: Resource) => {
    setResources((prev) => [newResource, ...prev]);
    setSelectedMobileIndex(0);
    setIsAddingTag(false);
  };

  const handleUpdated = (updated: Resource) => {
    const updatedId = updated.id || (updated as any)._id;
    setResources((prev) =>
      prev.map((r) => ((r.id || (r as any)._id) === updatedId ? { ...r, ...updated } : r))
    );
  };

  const handleDelete = (id: string) => {
    setResources((prev) => {
      const next = prev.filter((r) => (r.id || (r as any)._id) !== id);
      setSelectedMobileIndex((curr) => Math.min(curr, Math.max(0, next.length - 1)));
      return next;
    });
  };



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
            {isAddingTag ? 'ADD TAG.' : (resources.length > 0 ? 'YOUR TAGS.' : 'GET STARTED.')}
          </h1>

          {/* Subtitle and Add Tag in one line */}
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-xs sm:text-sm text-muted tracking-normal">
              {isAddingTag
                ? 'Pair a physical sticker or create a digital tag'
                : `You have ${resources.length} active tag${resources.length === 1 ? '' : 's'}`}
            </p>

            {isAddingTag ? (
              <button
                type="button"
                onClick={() => setIsAddingTag(false)}
                className="inline-flex items-center gap-1.5 label text-xs font-semibold tracking-[0.1em] text-muted hover:text-ink uppercase transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>CANCEL</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1.5 label text-xs font-semibold tracking-[0.1em] text-ink hover:text-muted uppercase transition-colors cursor-pointer group"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>ADD TAG</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>

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
            onClick={fetchResources}
            className="!h-10 text-xs tracking-wider uppercase font-semibold"
          >
            TRY AGAIN
          </Button>
        </div>
      ) : isAddingTag ? (
        /* Reused Setup Flow when user clicks ADD TAG */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="py-6 sm:py-12"
        >
          <TagSetupFlow
            existingResources={resources}
            hasExistingTags={resources.length > 0}
            onComplete={(newRes) => {
              handleCreated(newRes);
              fetchResources();
            }}
            onCancel={() => setIsAddingTag(false)}
          />
        </motion.div>
      ) : resources.length === 0 ? (
        /* Empty State & Initial Onboarding - Clean, quiet, interactive immediately */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
          className="py-10 sm:py-16"
        >
          <TagSetupFlow
            existingResources={resources}
            hasExistingTags={false}
            onComplete={(newRes) => {
              handleCreated(newRes);
              fetchResources();
            }}
          />
        </motion.div>
      ) : (
        /* Returning user tags list */
        <div className="animate-fade-in">
          {/* Mobile Single-Tag Focused Experience (< md) */}
          <div className="md:hidden">
            <MobileTagDetailView
              resources={resources}
              selectedIndex={selectedMobileIndex}
              onSelectIndex={setSelectedMobileIndex}
              onEdit={(r) => setEditingResource(r)}
              onDelete={handleDelete}
              onAddTag={() => setIsAddingTag(true)}
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
        </div>
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

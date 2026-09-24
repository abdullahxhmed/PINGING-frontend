import React, { useState, useEffect, useCallback } from 'react';
import type { Resource } from '../../types/api';
import { resourcesApi } from '../../lib/api';
import { Layout } from '../../components/layout/Layout';
import { ResourceRow, CreateResourceModal, EditResourceModal } from '../../components/resources';
import { Button } from '../../components/ui';
import { Plus, ShieldAlert } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

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
  };

  const handleUpdated = (updated: Resource) => {
    const updatedId = updated.id || (updated as any)._id;
    setResources((prev) =>
      prev.map((r) => ((r.id || (r as any)._id) === updatedId ? { ...r, ...updated } : r))
    );
  };

  const handleDelete = (id: string) => {
    setResources((prev) => prev.filter((r) => (r.id || (r as any)._id) !== id));
  };



  return (
    <Layout>
      {/* Direct Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border">
        <div>
          <h1 className="font-display font-medium text-4xl sm:text-6xl lg:text-7xl leading-[0.92] tracking-[-0.04em] text-ink uppercase">
            YOUR<br />
            RESOURCES.
          </h1>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2.5 self-start md:self-end">
          <div className="flex items-center gap-2">
            <span className="label font-sans text-xs text-ink font-semibold tracking-widest uppercase">
              {String(resources.length).padStart(2, '0')} {resources.length === 1 ? 'RESOURCE' : 'RESOURCES'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 label text-xs font-semibold tracking-[0.1em] text-ink hover:text-muted uppercase transition-colors cursor-pointer group pt-1"
          >
            <span>CREATE RESOURCE</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>

      {/* Main Content Area - Immediate Access to Resources */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent mb-4" />
          <p className="font-sans text-xs text-muted tracking-widest uppercase">
            Loading resources...
          </p>
        </div>
      ) : error ? (
        <div className="py-16 text-center max-w-md mx-auto">
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
      ) : resources.length === 0 ? (
        <div className="text-center py-24 max-w-md mx-auto">
          <span className="label font-sans text-xs text-muted tracking-widest uppercase block mb-3">
            NO RESOURCES REGISTERED
          </span>
          <h2 className="heading-md text-ink text-2xl uppercase mb-3 font-medium">
            Add your first vehicle or space
          </h2>
          <p className="body text-muted mb-8 leading-relaxed text-sm">
            Each registered vehicle or space receives a private contact link and QR sticker.
          </p>
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            rightIcon={<Plus className="h-4 w-4" />}
            className="!h-12 text-xs tracking-wider uppercase font-semibold"
          >
            CREATE RESOURCE
          </Button>
        </div>
      ) : (
        <>
          {/* Resource List directly following the header */}
          <div className="divide-y-0">
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

          {/* Controlled Dark Information Strip Below Resources */}
          <div className="mt-14 mb-8 bg-surface-dark text-white px-5 sm:px-6 py-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
            <div className="space-y-1">
              <span className="font-display font-medium text-xs tracking-[0.14em] uppercase text-white block">
                PRIVATE CONTACT
              </span>
              <p className="body-sm text-[#929087] text-xs leading-relaxed max-w-lg">
                Your number is never exposed. Visitors can contact you through your private links.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 shrink-0 self-start md:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-accent ring-1 ring-accent/40" />
              <span className="font-sans text-xs font-semibold tracking-widest uppercase text-white">
                RELAY ACTIVE
              </span>
            </div>
          </div>
        </>
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
    </Layout>
  );
};

export default DashboardPage;

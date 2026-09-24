import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Resource } from '../../types/api';
import { resourcesApi, extractResourceToken } from '../../lib/api';
import { Layout } from '../../components/layout/Layout';
import { Surface, Button, Modal, useToast } from '../../components/ui';
import { EditResourceModal, QrCodeModal, ContactLinkPanel } from '../../components/resources';
import {
  ArrowLeft,
  Calendar,
  Trash2,
  Edit2,
  Car,
  Building2,
  Wrench,
  Layers,
} from 'lucide-react';

export const ResourceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchResource = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data: any = await resourcesApi.getById(id);
      const resData = data?.resource || data?.data || data;
      setResource(resData);
    } catch (err: any) {
      setError(err.message || 'Failed to load resource details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  const handleConfirmDelete = async () => {
    if (!resource) return;
    const targetId = resource.id || (resource as any)._id || id;
    if (!targetId) return;

    setIsDeleting(true);
    try {
      await resourcesApi.delete(targetId);
      toast.success(`"${resource.name}" deleted successfully`);
      setIsDeleteModalOpen(false);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete resource');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent mb-3" />
          <p className="body-sm text-muted">Loading resource details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !resource) {
    return (
      <Layout>
        <div className="py-12 max-w-lg mx-auto text-center">
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

  const token = extractResourceToken(resource);

  return (
    <Layout>
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 body-sm font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Resources
        </Link>
      </div>

      {/* Header bar */}
      {/* Resource Title Header */}
      {(() => {
        const rawDetails = resource.vehicleDetails;
        const parsedDetails: any =
          typeof rawDetails === 'string'
            ? (() => {
                try {
                  return JSON.parse(rawDetails);
                } catch {
                  return {};
                }
              })()
            : rawDetails || {};

        const registration =
          parsedDetails?.registrationNum ||
          parsedDetails?.registrationNumber ||
          parsedDetails?.regNum ||
          parsedDetails?.registrationLast4 ||
          (resource as any)?.registrationNum ||
          (resource as any)?.registrationLast4;

        const color =
          parsedDetails?.vehicleColour ||
          parsedDetails?.vehicleColor ||
          parsedDetails?.colour ||
          parsedDetails?.color ||
          (resource as any)?.vehicleColour ||
          (resource as any)?.color;

        return (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="heading-lg text-ink">
                  {resource.name}
                </h1>
                {resource.type && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-surface border border-border text-ink text-xs font-semibold uppercase tracking-wider">
                    {resource.type === 'VEHICLE' && <Car className="h-3.5 w-3.5" />}
                    {resource.type === 'PROPERTY' && <Building2 className="h-3.5 w-3.5" />}
                    {resource.type === 'EQUIPMENT' && <Wrench className="h-3.5 w-3.5" />}
                    {resource.type === 'OTHER' && <Layers className="h-3.5 w-3.5" />}
                    <span>{resource.type}</span>
                  </span>
                )}
                {registration && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-surface border border-border text-ink text-xs">
                    <span className="text-muted">Plate:</span>
                    <span className="font-mono font-medium">•••• {registration}</span>
                  </span>
                )}
                {color && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-surface border border-border text-ink text-xs">
                    <span className="text-muted">Colour:</span>
                    <span className="font-medium">{color}</span>
                  </span>
                )}
              </div>
              {(() => {
                const rawDate =
                  resource.createdAt ||
                  (resource as any).created_at ||
                  (resource as any).CreatedAt;
                if (!rawDate) return null;
                const date = new Date(rawDate);
                if (isNaN(date.getTime())) return null;
                return (
                  <div className="flex items-center gap-2 body-sm text-muted mt-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Added on{' '}
                      {date.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => setIsDeleteModalOpen(true)}
                isLoading={isDeleting}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Contact Link Panel */}
      <div className="mt-6">
        <ContactLinkPanel
          resource={resource}
          onRefresh={fetchResource}
          onOpenQrModal={() => setShowQrModal(true)}
        />
      </div>

      {/* Edit Modal */}
      <EditResourceModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        resource={resource}
        onUpdated={(updated) => setResource(updated)}
        onDelete={() => navigate('/dashboard')}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="DELETE RESOURCE"
        description={`Are you sure you want to delete "${resource.name}"? This action will deactivate all associated contact links.`}
      >
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirmDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Delete Resource
          </Button>
        </div>
      </Modal>

      {/* QR Modal */}
      {token && (
        <QrCodeModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          token={token}
          resourceName={resource.name}
        />
      )}
    </Layout>
  );
};

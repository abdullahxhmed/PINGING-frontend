import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../../types/api';
import { IconButton, Button, Modal, useToast } from '../ui';
import { QrCodeModal } from './QrCodeModal';
import { resourcesApi, extractResourceToken, getResourceContactUrl } from '../../lib/api';
import {
  ArrowUpRight,
  Trash2,
  Edit2,
  QrCode,
  Copy,
  Check,
  Car,
  Building2,
  Wrench,
  Layers,
} from 'lucide-react';

export interface ResourceRowProps {
  resource: Resource;
  index: number;
  onEdit: (resource: Resource) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export const ResourceRow: React.FC<ResourceRowProps> = ({
  resource,
  index,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const [showQr, setShowQr] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  const resourceId = resource.id || (resource as any)._id;
  const token = extractResourceToken(resource);
  const publicUrl = getResourceContactUrl(resource);

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Public contact link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await resourcesApi.delete(resourceId);
      toast.success(`"${resource.name}" deleted successfully`);
      setIsDeleteModalOpen(false);
      onDelete(resourceId);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete resource');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="py-7 sm:py-9 border-b border-border flex flex-col md:flex-row md:items-start justify-between gap-6 group">
        {/* Left: Index + Name + Meta + Actions */}
        <div className="flex items-start gap-5 sm:gap-8 flex-1 min-w-0">
          {/* Index Counter (01, 02, etc.) */}
          <span className="font-display text-xs sm:text-sm text-subtle font-medium shrink-0 pt-1 select-none">
            {String(index + 1).padStart(2, '0')}
          </span>

          <div className="flex-1 min-w-0">
            <Link
              to={`/resources/${resourceId}`}
              className="font-display font-medium text-xl sm:text-2xl text-ink uppercase tracking-tight hover:underline block truncate"
            >
              {resource.name}
            </Link>

            <div className="flex flex-wrap items-center gap-2 mt-1.5 font-sans text-[11px] text-muted uppercase tracking-wider">
              {resource.type && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-surface border border-border text-ink font-semibold">
                  {resource.type === 'VEHICLE' && <Car className="h-3 w-3" />}
                  {resource.type === 'PROPERTY' && <Building2 className="h-3 w-3" />}
                  {resource.type === 'EQUIPMENT' && <Wrench className="h-3 w-3" />}
                  {resource.type === 'OTHER' && <Layers className="h-3 w-3" />}
                  <span>{resource.type}</span>
                </span>
              )}
              {resource.vehicleDetails?.registrationLast4 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-bg border border-border text-ink">
                  <span>Plate:</span>
                  <span className="font-mono font-medium">•••• {resource.vehicleDetails.registrationLast4}</span>
                </span>
              )}
              {resource.vehicleDetails?.color && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-bg border border-border text-muted">
                  <span>Colour:</span>
                  <span className="text-ink font-medium">{resource.vehicleDetails.color}</span>
                </span>
              )}
              {(() => {
                const rawDate =
                  resource.createdAt ||
                  (resource as any).created_at ||
                  (resource as any).CreatedAt;
                if (!rawDate) return null;
                const date = new Date(rawDate);
                if (isNaN(date.getTime())) return null;
                return (
                  <span>
                    • ADDED{' '}
                    {date.toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                );
              })()}
            </div>

            {/* Direct QR & Share Action Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {token ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowQr(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface border border-border hover:border-ink text-xs font-sans font-semibold tracking-wider uppercase text-ink transition-colors cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>SHARE QR CODE</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-transparent border border-border hover:border-border-strong text-xs font-sans text-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copied ? 'COPIED' : 'COPY LINK'}</span>
                  </button>

                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-sans text-muted hover:text-ink underline ml-1"
                  >
                    <span>Preview</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </>
              ) : (
                <span className="text-xs font-sans text-muted">
                  No active contact token
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quiet Action Controls */}
        <div className="flex items-center justify-end gap-2 shrink-0 pl-10 md:pl-0 pt-0 md:pt-1">
          <div className="flex items-center gap-1">
            <IconButton
              icon={<Edit2 className="h-3.5 w-3.5" />}
              label="Edit resource"
              onClick={() => onEdit(resource)}
            />

            <IconButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete resource"
              variant="danger"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
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

      {/* QR Sticker Modal */}
      {token && (
        <QrCodeModal
          isOpen={showQr}
          onClose={() => setShowQr(false)}
          resourceName={resource.name}
          token={token}
        />
      )}
    </>
  );
};

export default ResourceRow;

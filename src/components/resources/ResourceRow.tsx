import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../../types/api';
import { IconButton, Button, Modal, useToast } from '../ui';
import { QrCodeModal } from './QrCodeModal';
import { resourcesApi, extractResourceToken, getResourceContactUrl, extractResourceTag } from '../../lib/api';
import {
  ArrowUpRight,
  Trash2,
  Edit2,
  QrCode,
  Copy,
  Check,
  Plus,
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
  const tagNumber = extractResourceTag(resource);
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

  // Parse vehicle details
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

  const reg =
    parsedDetails?.registrationNum ||
    parsedDetails?.registrationNumber ||
    parsedDetails?.regNum ||
    parsedDetails?.registrationLast4 ||
    (resource as any)?.registrationNum ||
    (resource as any)?.registrationLast4;

  const clr =
    parsedDetails?.vehicleColour ||
    parsedDetails?.vehicleColor ||
    parsedDetails?.colour ||
    parsedDetails?.color ||
    (resource as any)?.vehicleColour ||
    (resource as any)?.color;

  const rawDate =
    resource.createdAt ||
    (resource as any).created_at ||
    (resource as any).CreatedAt;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const formattedDate =
    parsedDate && !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
        })
      : null;

  return (
    <>
      <div className="py-5 sm:py-6 border-b border-border flex items-start gap-3 sm:gap-6 group">
        {/* Index Counter (01, 02, etc.) */}
        <span className="font-mono text-xs text-muted/60 font-semibold shrink-0 pt-1 select-none w-5 text-right sm:w-auto">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Title + Tag Badge + Edit/Delete actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Link
                to={`/resources/${resourceId}`}
                className="font-display font-medium text-lg sm:text-2xl text-ink uppercase tracking-tight hover:underline truncate"
              >
                {resource.name}
              </Link>

              {tagNumber ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-ink text-surface font-mono font-semibold text-[10px] tracking-wider shrink-0">
                  <QrCode className="h-2.5 w-2.5 text-surface" />
                  <span>#{tagNumber}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-border/50 text-muted font-mono text-[10px] tracking-wider uppercase shrink-0">
                  <span>No Tag</span>
                </span>
              )}
            </div>

            {/* Edit / Delete Actions */}
            <div className="flex items-center gap-1 shrink-0">
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

          {/* Clean Editorial Meta (No repetitive boxes) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted">
            {resource.type && (
              <span className="capitalize text-ink/75 font-medium">
                {resource.type.toLowerCase()}
              </span>
            )}
            {reg && (
              <>
                <span className="text-border select-none">&bull;</span>
                <span className="font-mono text-ink/80">•••• {reg}</span>
              </>
            )}
            {clr && (
              <>
                <span className="text-border select-none">&bull;</span>
                <span className="capitalize text-muted">{clr.toLowerCase()}</span>
              </>
            )}
            {formattedDate && (
              <>
                <span className="text-border select-none">&bull;</span>
                <span className="text-muted/60">Added {formattedDate}</span>
              </>
            )}
          </div>

          {/* Action Bar (Mobile-friendly, no heavy duplicate borders) */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
            {tagNumber ? (
              <button
                type="button"
                onClick={() => setShowQr(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-ink text-surface text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Share QR</span>
              </button>
            ) : (
              <Link
                to={`/resources/${resourceId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-border hover:border-ink text-xs font-semibold uppercase tracking-wider text-ink transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Pair Tag</span>
              </Link>
            )}

            {token && (
              <>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xs text-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy link'}</span>
                </button>

                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xs text-muted hover:text-ink hover:underline transition-colors"
                >
                  <span>Preview</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </>
            )}
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

      {/* QR Sticker Modal - strictly gated to verified QR tag */}
      {Boolean(tagNumber) && (
        <QrCodeModal
          isOpen={showQr}
          onClose={() => setShowQr(false)}
          resourceName={resource.name}
          tagNumber={tagNumber}
        />
      )}
    </>
  );
};

export default ResourceRow;

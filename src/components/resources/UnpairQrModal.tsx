import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { qrApi } from '../../lib/api';
import type { UnpairQrPayload, UnpairQrResponse } from '../../types/api';
import { Unlink, AlertTriangle } from 'lucide-react';

interface UnpairQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId?: string;
  resourceName?: string;
  tagNumber?: string;
  tagId?: string;
  onUnpaired?: (result: UnpairQrResponse) => void;
}

export const UnpairQrModal: React.FC<UnpairQrModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceName,
  tagNumber,
  tagId,
  onUnpaired,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload: UnpairQrPayload = {};
    if (tagNumber) payload.tagNumber = tagNumber;
    if (tagId) payload.tagId = tagId;
    if (resourceId) payload.resourceId = resourceId;

    try {
      const res = await qrApi.unpair(payload);
      toast.success(res.message || 'QR tag successfully unassigned.');
      if (onUnpaired) {
        onUnpaired(res);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err.message || 'Failed to unpair QR tag';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 text-danger">
          <div className="h-8 w-8 rounded-sm bg-danger/10 border border-danger/20 flex items-center justify-center">
            <Unlink className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display font-medium text-lg uppercase tracking-tight block text-ink">
              UNPAIR QR TAG
            </span>
            <span className="font-sans text-[11px] text-muted uppercase tracking-wider block">
              De-allocate physical sticker or digital tag
            </span>
          </div>
        </div>
      }
      maxWidth="md"
    >
      <div className="space-y-4 pt-1 font-sans text-xs">
        <div className="p-4 bg-danger/5 border border-danger/20 rounded-sm space-y-2">
          <div className="flex items-center gap-2 text-danger font-semibold uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Caution: Active Contact Disruption</span>
          </div>
          <p className="text-muted leading-relaxed">
            Are you sure you want to unpair{' '}
            {tagNumber ? (
              <strong className="text-ink font-mono font-bold">#{tagNumber}</strong>
            ) : (
              'the active QR tag'
            )}{' '}
            from <strong className="text-ink">{resourceName || 'this resource'}</strong>?
          </p>
          <p className="text-muted leading-relaxed">
            Anyone who scans this physical sticker in the real world will no longer be able to contact you until it is re-paired.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-danger text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            leftIcon={<Unlink className="h-3.5 w-3.5" />}
          >
            Unpair Tag
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UnpairQrModal;

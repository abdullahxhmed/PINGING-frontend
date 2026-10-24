import React, { useState, useEffect } from 'react';
import {
  Check,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { subscriptionApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import type { UserTagItem } from '../../types/subscription';
import { useSubscription } from './SubscriptionContext';

interface DemotedTagSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemotedTagSelectionModal: React.FC<DemotedTagSelectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { tags, refetch, openUpgradeModal } = useSubscription();
  const { toast } = useToast();

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combine assigned and suspended tags for selection
  const allUserTags: UserTagItem[] = [
    ...(tags?.assigned || []),
    ...(tags?.suspended || []),
  ];

  // Initialize selection with currently assigned tags (up to 2)
  useEffect(() => {
    if (isOpen && tags?.assigned) {
      const initialIds = tags.assigned.slice(0, 2).map((t) => t.id);
      setSelectedTagIds(initialIds);
      setError(null);
    }
  }, [isOpen, tags]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxAllowed = tags?.maxLimit || 2;

  const toggleTag = (tagId: string) => {
    setError(null);
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      if (selectedTagIds.length >= maxAllowed) {
        setError(`You can select at most ${maxAllowed} active tags on the BASIC plan.`);
        return;
      }
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleConfirm = async () => {
    if (selectedTagIds.length === 0) {
      setError('Please select at least 1 tag to keep active.');
      return;
    }

    if (selectedTagIds.length > maxAllowed) {
      setError(`Your BASIC plan allows a maximum of ${maxAllowed} active tags.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await subscriptionApi.selectActiveTags(selectedTagIds);

      toast.success(
        `Successfully set ${selectedTagIds.length} active tag${selectedTagIds.length > 1 ? 's' : ''}. Unselected tags are suspended.`
      );

      await refetch();
      window.dispatchEvent(new CustomEvent('resource:updated'));
      window.dispatchEvent(new CustomEvent('tag:updated'));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update active tags.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-surface-dark/80 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
        />

        {/* Modal Window */}
        <div className="relative transform overflow-hidden rounded-[var(--radius-md)] bg-surface text-left transition-all sm:my-8 w-full max-w-xl p-5 sm:p-7 border border-border z-10 shadow-2xl">
          {/* Header */}
          <div className="flex items-start gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="heading-md text-ink text-lg font-bold">
                Action Required: Choose 2 Active Tags
              </h3>
              <p className="body-sm text-muted mt-1">
                Your Plus subscription has ended. The Free/Basic plan supports up to{' '}
                <strong className="text-ink">2 active tags</strong>. Please choose which 2 tags will
                remain active. All other tags will be suspended.
              </p>
            </div>
          </div>

          {/* Quick Upgrade Callout */}
          <div className="my-4 p-3.5 rounded-[var(--radius-sm)] bg-accent/20 border border-accent/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ink shrink-0" />
              <p className="text-xs text-ink font-medium">
                Want to keep all your tags active simultaneously?
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                openUpgradeModal('PLUS_RENEWAL');
              }}
              className="text-xs font-bold text-ink underline hover:no-underline flex items-center gap-1 shrink-0"
            >
              Renew Plus Plan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
              {error}
            </div>
          )}

          {/* Tag Selection Counter */}
          <div className="flex items-center justify-between py-2 text-xs font-semibold text-ink">
            <span>Select up to 2 active tags:</span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                selectedTagIds.length > maxAllowed
                  ? 'bg-danger/20 text-danger'
                  : 'bg-surface-dark/10 text-ink'
              }`}
            >
              {selectedTagIds.length} / {maxAllowed} Selected
            </span>
          </div>

          {/* Tag List */}
          <div className="max-h-64 overflow-y-auto space-y-2 my-2 pr-1">
            {allUserTags.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">No paired tags found.</p>
            ) : (
              allUserTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                const isCurrentlySuspended = tag.status === 'SUSPENDED';

                return (
                  <div
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`cursor-pointer rounded-[var(--radius-sm)] p-3 border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-ink bg-surface-dark/[0.04] ring-1 ring-ink'
                        : 'border-border hover:border-border-strong bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-ink border-ink text-surface'
                            : 'border-border-strong bg-surface'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-ink tracking-wider bg-surface-dark/10 px-1.5 py-0.5 rounded">
                            {tag.tagNumber}
                          </span>
                          <span className="text-xs font-medium text-ink truncate">
                            {tag.resource?.name || 'Unassigned Resource'}
                          </span>
                        </div>
                        {tag.resource?.vehicleDetail?.registrationNum && (
                          <p className="text-[11px] text-muted mt-0.5">
                            {tag.resource.vehicleDetail.registrationNum}
                            {tag.resource.vehicleDetail.vehicleColour
                              ? ` · ${tag.resource.vehicleDetail.vehicleColour}`
                              : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      {isCurrentlySuspended ? (
                        <span className="text-[10px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5 mt-4">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || selectedTagIds.length === 0}
              className="btn-primary px-5 py-2 text-xs font-semibold rounded-[var(--radius-sm)] flex items-center justify-center gap-2 bg-ink text-surface hover:bg-ink/90 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Tags...
                </>
              ) : (
                `Confirm ${selectedTagIds.length} Active Tag${selectedTagIds.length === 1 ? '' : 's'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

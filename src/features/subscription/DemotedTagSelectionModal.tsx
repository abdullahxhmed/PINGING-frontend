import React, { useState, useEffect } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
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
        setError(`You can select at most ${maxAllowed} active tags on the Basic plan.`);
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
      setError(`Your Basic plan allows a maximum of ${maxAllowed} active tags.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await subscriptionApi.selectActiveTags(selectedTagIds);

      toast.success(
        `Set ${selectedTagIds.length} active tag${selectedTagIds.length > 1 ? 's' : ''}. Unselected tags are suspended.`
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
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-[#0c0c0b]/70 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
        />

        {/* Modal Window */}
        <div className="relative transform overflow-hidden rounded-xl bg-surface text-left transition-all sm:my-8 w-full max-w-lg p-6 border border-border z-10 shadow-2xl space-y-4">
          {/* Header */}
          <div className="pb-3 border-b border-border space-y-1">
            <h3 className="font-display font-medium text-xl text-ink tracking-tight">
              Choose 2 Active Tags
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Your Plus subscription has ended. The Basic plan supports up to 2 active tags. Choose which 2 tags remain active; unselected tags will be paused.
            </p>
          </div>

          {/* Upgrade Link Row */}
          <div className="py-2.5 px-3 rounded-lg border border-border bg-bg/50 flex items-center justify-between gap-3 text-xs">
            <span className="text-muted">Keep all tags active simultaneously?</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                openUpgradeModal('PLUS_RENEWAL');
              }}
              className="font-medium text-ink hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              Renew Plus Plan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
              {error}
            </div>
          )}

          {/* Tag Selection Counter */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted font-medium">Select up to {maxAllowed} active tags:</span>
            <span className="font-mono text-xs font-semibold text-ink">
              {selectedTagIds.length} / {maxAllowed} Selected
            </span>
          </div>

          {/* Tag List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {allUserTags.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center font-mono">No paired tags found.</p>
            ) : (
              allUserTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                const isCurrentlySuspended = tag.status === 'SUSPENDED';

                return (
                  <div
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`cursor-pointer rounded-lg p-3 border transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-ink bg-bg/60'
                        : 'border-border hover:border-ink/40 bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-ink border-ink text-surface'
                            : 'border-border bg-surface'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-ink">
                            {tag.tagNumber}
                          </span>
                          <span className="text-xs text-ink/80 truncate">
                            {tag.resource?.name || 'Unassigned'}
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

                    <span className="text-[11px] font-mono text-muted shrink-0">
                      {isCurrentlySuspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || selectedTagIds.length === 0}
              className="py-2.5 px-5 rounded-lg bg-ink text-surface font-mono text-xs font-semibold uppercase tracking-wider hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </span>
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

export default DemotedTagSelectionModal;

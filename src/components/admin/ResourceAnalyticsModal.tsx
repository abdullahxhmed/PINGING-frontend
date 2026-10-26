import React from 'react';
import { X, BarChart2, Shield } from 'lucide-react';
import { ResourceAnalyticsView } from '../analytics/ResourceAnalyticsView';

interface ResourceAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string | null;
  resourceName?: string;
  tagNumber?: string;
  ownerName?: string;
}

export const ResourceAnalyticsModal: React.FC<ResourceAnalyticsModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceName,
  tagNumber,
  ownerName,
}) => {
  if (!isOpen || !resourceId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
              <BarChart2 className="w-4 h-4 text-ink" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-ink truncate">
                  {resourceName ? `${resourceName} Analytics` : 'Resource Scan Analytics'}
                </h3>
                {tagNumber && (
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-surface border border-border text-muted font-bold">
                    #{tagNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted truncate">
                {ownerName ? `Owner: ${ownerName} • ` : ''}Resource ID: {resourceId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1.5 rounded-md hover:bg-bg transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <ResourceAnalyticsView
            resourceId={resourceId}
            resourceName={resourceName}
            tagNumber={tagNumber}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-bg/40 flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Admin View • Privacy-scrubbed visitor logs</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceAnalyticsModal;

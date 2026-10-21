import React from 'react';
import type { Resource } from '../../types/api';
import {
  Edit2,
  Tag,
  Unlink,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface ResourceSettingsTabProps {
  resource: Resource;
  activeTag: string;
  publicUrl: string;
  copied: boolean;
  onOpenEditModal: () => void;
  onOpenPairModal: () => void;
  onOpenUnpairModal: () => void;
  onOpenGenerateModal: () => void;
  onOpenDeleteModal: () => void;
  onCopyUrl: () => void;
}

export const ResourceSettingsTab: React.FC<ResourceSettingsTabProps> = ({
  resource,
  activeTag,
  publicUrl,
  copied,
  onOpenEditModal,
  onOpenPairModal,
  onOpenUnpairModal,
  onOpenDeleteModal,
  onCopyUrl,
}) => {
  const isVehicle = resource.type?.toUpperCase() === 'VEHICLE' || !resource.type;

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

  const registration =
    parsedDetails?.registrationNum ||
    parsedDetails?.registrationNumber ||
    parsedDetails?.regNum ||
    parsedDetails?.registrationLast4 ||
    (resource as any)?.registrationNum;

  const color =
    parsedDetails?.vehicleColour ||
    parsedDetails?.vehicleColor ||
    parsedDetails?.colour ||
    parsedDetails?.color ||
    (resource as any)?.vehicleColour;

  const isConnected = Boolean(activeTag);

  return (
    <div className="space-y-3.5 max-w-3xl animate-fade-in">
      {/* 1. Main Management Card */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {/* Section A: Resource Details */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Resource details
            </span>
            <button
              type="button"
              onClick={onOpenEditModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xs border border-border bg-bg/60 hover:bg-surface text-ink transition-all cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit details</span>
            </button>
          </div>

          <div
            className={`grid gap-3 pt-1 ${
              isVehicle ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
            }`}
          >
            <div>
              <span className="text-[11px] text-muted block">Name</span>
              <span className="text-xs font-medium text-ink truncate block mt-0.5">
                {resource.name}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-muted block">Category</span>
              <span className="text-xs font-medium text-ink truncate block mt-0.5 capitalize">
                {resource.type ? resource.type.toLowerCase() : 'Vehicle'}
              </span>
            </div>

            {/* Plate & Color ONLY shown for vehicles */}
            {isVehicle && (
              <>
                <div>
                  <span className="text-[11px] text-muted block">Plate</span>
                  <span className="text-xs font-mono font-medium text-ink truncate block mt-0.5">
                    {registration ? `•••• ${registration}` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted block">Color</span>
                  <span className="text-xs font-medium text-ink truncate block mt-0.5 capitalize">
                    {color || '—'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section B: Physical Tag Assignment */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted block">
                Physical tag assignment
              </span>
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted" />
                <span className="font-mono text-xs font-medium text-ink">
                  {isConnected ? `#${activeTag}` : 'No tag currently paired'}
                </span>
                {isConnected && (
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-xs bg-bg border border-border text-muted">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Tag Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenPairModal}
                className="px-3 py-1.5 text-xs font-medium rounded-xs border border-border bg-bg/60 hover:bg-surface text-ink transition-all cursor-pointer"
              >
                <span>{isConnected ? 'Replace tag' : 'Pair tag'}</span>
              </button>

              {isConnected && (
                <button
                  type="button"
                  onClick={onOpenUnpairModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xs border border-border text-muted hover:text-danger hover:border-danger/40 transition-all cursor-pointer"
                >
                  <Unlink className="h-3 w-3" />
                  <span>Unpair</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            Unpairing detaches the physical sticker while keeping this resource and all past records intact.
          </p>
        </div>

        {/* Section C: Public Contact Link */}
        <div className="p-4 sm:p-5 space-y-2.5">
          <span className="text-xs font-semibold text-muted block">
            Public contact gateway
          </span>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xs bg-bg border border-border font-mono text-xs text-muted truncate">
              {publicUrl || 'No public gateway URL active'}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onCopyUrl}
                disabled={!publicUrl}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xs border border-border bg-surface hover:bg-bg text-ink transition-all cursor-pointer disabled:opacity-40"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-ink" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {publicUrl && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center p-2 rounded-xs border border-border bg-surface hover:bg-bg text-muted hover:text-ink transition-all"
                  title="Open public page"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Permanent Actions Card (Danger Zone renamed, natural casing) */}
      <div className="rounded-xl border border-danger/30 bg-surface p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-danger font-medium text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Delete resource</span>
            </div>
            <p className="text-[11px] text-muted max-w-md">
              Permanently delete this resource. All associated public contact links will be deactivated immediately.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenDeleteModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xs bg-danger text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete resource</span>
          </button>
        </div>
      </div>
    </div>
  );
};

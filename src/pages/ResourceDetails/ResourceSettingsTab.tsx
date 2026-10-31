import React from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../../types/api';
import { useAuth } from '../../features/auth/AuthContext';

interface ResourceSettingsTabProps {
  resource: Resource;
  activeTag: string;
  publicUrl: string;
  copied: boolean;
  onOpenEditModal: () => void;
  onOpenPairModal: () => void;
  onOpenUnpairModal: () => void;
  onOpenDeleteModal: () => void;
  onCopyUrl: () => void;
  isTogglingPause?: boolean;
  onTogglePause?: () => void;
  onOpenGenerateModal?: () => void;
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
  const { user } = useAuth();
  const isVehicle = resource.type?.toUpperCase() === 'VEHICLE' || !resource.type;

  const tagIdentifier =
    activeTag ||
    resource.tagNumber ||
    (typeof resource.qrTag === 'object' && resource.qrTag?.tagNumber) ||
    '';
  const isConnected = Boolean(tagIdentifier);

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

  const rawPlate =
    parsedDetails?.registrationNum ||
    parsedDetails?.registrationNumber ||
    parsedDetails?.regNum ||
    parsedDetails?.registrationLast4 ||
    (resource as any)?.registrationNum ||
    '';

  const cleanDigits = String(rawPlate).replace(/\D/g, '');
  const last4Plate = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : (rawPlate ? String(rawPlate).slice(-4) : '');

  const rawColor =
    parsedDetails?.vehicleColour ||
    parsedDetails?.vehicleColor ||
    parsedDetails?.colour ||
    parsedDetails?.color ||
    (resource as any)?.vehicleColour ||
    '';
  const colorDisplay = rawColor ? rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase() : '';

  // Masked phone number for Calls ring row
  const rawPhone = user?.mobileNumber || (resource as any)?.phoneNumber || '';
  const cleanPhoneDigits = String(rawPhone).replace(/\D/g, '');
  const last4Phone = cleanPhoneDigits.length >= 4 ? cleanPhoneDigits.slice(-4) : '';
  const maskedPhone = last4Phone ? `+91 ••••• ${last4Phone}` : '+91 ••••• ••••';

  const sectionLabel = isVehicle ? 'Vehicle details' : 'Resource details';
  const itemType = isVehicle ? 'vehicle' : 'resource';

  return (
    <div className="divide-y divide-border border-y border-border">
      {/* 1. Resource / Vehicle details */}
      <div className="py-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink">
            {sectionLabel}
          </span>
          <button
            type="button"
            onClick={onOpenEditModal}
            className="text-xs font-medium text-ink hover:underline cursor-pointer"
          >
            Edit
          </button>
        </div>

        <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-y-2 text-xs">
          <span className="text-muted">Name</span>
          <span className="font-medium text-ink truncate">{resource.name}</span>

          {isVehicle ? (
            <>
              <span className="text-muted">Plate</span>
              <span className="font-mono font-medium text-ink truncate">
                {last4Plate ? `•••• ${last4Plate}` : '—'}
              </span>

              <span className="text-muted">Colour</span>
              <span className="font-medium text-ink truncate">{colorDisplay || '—'}</span>
            </>
          ) : (
            <>
              <span className="text-muted">Category</span>
              <span className="font-medium text-ink truncate capitalize">
                {resource.type?.toLowerCase() || 'Resource'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. Calls ring */}
      <div className="py-4 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink">Calls ring</span>
          <Link
            to="/settings"
            className="text-xs font-medium text-ink hover:underline cursor-pointer"
          >
            Edit
          </Link>
        </div>
        <div>
          <span className="font-mono text-xs font-medium text-ink">
            {maskedPhone}
          </span>
        </div>
        <p className="text-[11px] text-muted">
          Calls to your sticker are anonymously forwarded to this mobile number.
        </p>
      </div>

      {/* 3. Sticker */}
      <div className="py-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-ink block mb-0.5">Sticker</span>
            <span className="font-mono text-xs font-medium text-ink">
              {isConnected ? `#${tagIdentifier} · Paired` : 'No sticker paired'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenPairModal}
              className="px-3 py-1.5 text-xs font-medium rounded-xs border border-border bg-bg/60 hover:bg-surface text-ink transition-all cursor-pointer"
            >
              <span>{isConnected ? 'Replace' : 'Pair'}</span>
            </button>

            {isConnected && (
              <button
                type="button"
                onClick={onOpenUnpairModal}
                className="text-xs font-medium text-muted hover:text-danger underline-offset-2 hover:underline transition-colors cursor-pointer"
              >
                Unpair
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted">
          Unpairing deactivates this sticker. Anyone who scans it will see an inactive tag page.
        </p>
      </div>

      {/* 4. Public page */}
      <div className="py-4 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-ink block mb-0.5">Public page</span>
            <span className="font-mono text-xs text-ink truncate block">
              {tagIdentifier ? `…/t/${tagIdentifier}` : publicUrl || '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={onCopyUrl}
            disabled={!publicUrl}
            className="text-xs font-medium text-ink hover:underline cursor-pointer disabled:opacity-40 shrink-0"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* 5. Delete row */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-ink block">
            Delete this {itemType}
          </span>
          <p className="text-[11px] text-muted">
            Removes the {itemType} and deactivates its link.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenDeleteModal}
          className="px-3 py-1.5 text-xs font-medium rounded-xs border border-border text-danger hover:bg-danger/5 hover:border-danger/40 transition-colors cursor-pointer self-start sm:self-center shrink-0"
        >
          Delete…
        </button>
      </div>
    </div>
  );
};

export default ResourceSettingsTab;

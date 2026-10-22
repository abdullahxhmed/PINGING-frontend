import React from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../../types/api';
import {
  ArrowLeft,
  QrCode,
  ExternalLink,
  Car,
  Building2,
  Wrench,
  Layers,
} from 'lucide-react';

export type ResourceTabType = 'overview' | 'activity' | 'settings';

interface ResourceHeaderProps {
  resource: Resource;
  activeTag: string;
  publicUrl: string;
  activeTab: ResourceTabType;
  onTabChange: (tab: ResourceTabType) => void;
  onOpenShareSheet: () => void;
  activityCount?: number;
}

const getColorHex = (name: string): string => {
  const lower = name.toLowerCase().trim();
  const map: Record<string, string> = {
    white: '#FFFFFF',
    black: '#11110F',
    silver: '#D1D5DB',
    grey: '#9CA3AF',
    gray: '#9CA3AF',
    red: '#EF4444',
    blue: '#3B82F6',
    navy: '#1E3A8A',
    green: '#22C55E',
    yellow: '#FACC15',
    gold: '#F59E0B',
    orange: '#FB923C',
    brown: '#92400E',
    bronze: '#78350F',
  };
  return map[lower] || '#E5E7EB';
};

export const ResourceHeader: React.FC<ResourceHeaderProps> = ({
  resource,
  activeTag,
  publicUrl,
  activeTab,
  onTabChange,
  onOpenShareSheet,
  activityCount,
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
  const colorHex = colorDisplay ? getColorHex(colorDisplay) : '';

  const getCategoryInfo = () => {
    switch (resource.type?.toUpperCase()) {
      case 'PROPERTY':
        return { label: 'Property', icon: Building2 };
      case 'EQUIPMENT':
        return { label: 'Equipment', icon: Wrench };
      case 'OTHER':
        return { label: 'Item', icon: Layers };
      case 'VEHICLE':
      default:
        return { label: 'Vehicle', icon: Car };
    }
  };

  const { label: categoryLabel, icon: CategoryIcon } = getCategoryInfo();
  const isConnected = Boolean(activeTag);

  const tabs: { key: ResourceTabType; label: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'activity', label: 'Activity', badge: activityCount },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-3.5">
      {/* Top Breadcrumb Navigation */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>All resources</span>
        </Link>
      </div>

      {/* Belonging Plate Header Card */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        {/* Category Label (No "SPEC" keyword) & Physical Tag */}
        <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <CategoryIcon className="h-3.5 w-3.5 text-ink/80" />
            <span>{categoryLabel}</span>
          </div>

          <span className="font-mono text-xs text-muted font-medium">
            {activeTag ? `#${activeTag}` : 'No tag assigned'}
          </span>
        </div>

        {/* Resource Name (Sentence/Title case, status dot without "Connected" word) */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Status dot only (word "Connected" removed) */}
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                isConnected
                  ? 'bg-emerald-600 ring-2 ring-emerald-600/20'
                  : 'bg-muted/50'
              }`}
              title={isConnected ? 'Tag paired' : 'No tag paired'}
            />
            <h1 className="font-display font-medium text-2xl sm:text-3xl text-ink tracking-tight truncate">
              {resource.name}
            </h1>
          </div>

          {/* Plate & Color pill ONLY for vehicles */}
          {isVehicle && (last4Plate || colorDisplay) && (
            <div className="flex items-center gap-2 pt-0.5 sm:pt-0">
              {last4Plate && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-bg border border-border-strong font-mono text-[11px] font-semibold text-ink">
                  <span className="text-[9px] font-sans font-bold text-muted border-r border-border pr-1 tracking-wider">
                    IND
                  </span>
                  <span>•••• {last4Plate}</span>
                </div>
              )}

              {colorDisplay && (
                <div className="inline-flex items-center gap-1.5 text-xs text-muted font-medium">
                  <span
                    className="h-2 w-2 rounded-full border border-border-strong shrink-0"
                    style={{ backgroundColor: colorHex }}
                  />
                  <span>{colorDisplay}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Buttons: Share tag & Preview page */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={onOpenShareSheet}
            className="h-10 bg-ink text-surface text-xs font-medium rounded-xs hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5 text-surface" />
            <span>Share tag</span>
          </button>

          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 border border-border bg-bg/60 text-ink hover:bg-surface text-xs font-medium rounded-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Preview page</span>
              <ExternalLink className="h-3 w-3 text-muted" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="h-10 border border-border bg-bg/40 text-muted text-xs font-medium rounded-xs opacity-50 flex items-center justify-center"
            >
              <span>No public URL</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Balanced Tab Segment (Natural casing) */}
      <div className="grid grid-cols-3 border-b border-border">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`py-2.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                isActive
                  ? 'border-ink text-ink font-semibold'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`font-mono text-[10px] px-1.5 rounded-full ${
                    isActive
                      ? 'bg-ink text-surface'
                      : 'bg-border/60 text-muted'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

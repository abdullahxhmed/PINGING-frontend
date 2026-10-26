import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/adminApi';
import type {
  PrintProfile,
  PrintTemplate,
  UpsertPrintProfilePayload,
  CreatePrintTemplatePayload,
} from '../../types/admin';
import {
  Layers,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Plus,
  X,
  Truck,
  ShieldCheck,
  Maximize2,
} from 'lucide-react';

interface PrintProfilesSectionProps {
  onRefreshInventory?: () => void;
  showToast: (msg: string) => void;
}

const AVAILABLE_SKUS = [
  { sku: 'TAG-VEHICLE-STICKER', label: 'Vehicle Windshield Decal', shape: 'CIRCLE' },
  { sku: 'TAG-KEYCHAIN', label: 'Smart QR Keychain', shape: 'ROUNDED_RECT' },
  { sku: 'TAG-MINI-STICKER', label: 'Mini QR Sticker', shape: 'CIRCLE' },
  { sku: 'TAG-BIKE-WATERPROOF', label: 'Bike Waterproof Tag', shape: 'CIRCLE' },
  { sku: 'TAG-PREPRINTED-STD', label: 'Standard Preprinted Decal', shape: 'CIRCLE' },
];

export const PrintProfilesSection: React.FC<PrintProfilesSectionProps> = ({
  onRefreshInventory,
  showToast,
}) => {
  const [selectedSku, setSelectedSku] = useState<string>('TAG-VEHICLE-STICKER');
  const [profile, setProfile] = useState<PrintProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  // Fetch Print Profile
  const fetchProfile = useCallback(
    async (sku: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await adminApi.getPrintProfile(sku);
        const payload = (res as any)?.data || res;
        setProfile(payload);
      } catch (err: any) {
        setError(err.message || 'Failed to load print profile');
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchProfile(selectedSku);
  }, [selectedSku, fetchProfile]);

  return (
    <div className="space-y-6 mt-6">
      {/* 1. Header & SKU Selection Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-ink" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-satoshi">
              Physical Print Profiles & Printable Dimensions
            </h2>
          </div>
          <p className="text-xs text-muted mt-1 font-satoshi">
            Configure exact manufacturing dimensions (mm), die-cut shape, bleed tolerances, and design templates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchProfile(selectedSku)}
            disabled={isLoading}
            className="p-1.5 rounded border border-border bg-surface hover:border-ink text-muted hover:text-ink cursor-pointer disabled:opacity-50"
            title="Refresh profile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {profile && (
            <>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="px-3 py-1.5 rounded border border-border bg-surface hover:border-ink text-ink text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Template</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3.5 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit Dimensions & Material</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. SKU Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {AVAILABLE_SKUS.map((item) => {
          const isSelected = selectedSku === item.sku;
          return (
            <button
              key={item.sku}
              type="button"
              onClick={() => setSelectedSku(item.sku)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-ink bg-surface shadow-xs ring-1 ring-ink/10'
                  : 'border-border bg-bg/50 hover:border-ink/50 hover:bg-surface/50 text-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono tracking-tight font-medium px-1.5 py-0.5 rounded bg-muted/10 text-ink">
                  {item.shape}
                </span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                )}
              </div>
              <p className="text-xs font-semibold text-ink truncate font-satoshi">{item.label}</p>
              <p className="text-[10px] font-mono text-muted truncate mt-0.5">{item.sku}</p>
            </button>
          );
        })}
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Main Profile Overview */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted font-satoshi flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-ink" />
          <span>Loading physical profile specifications for {selectedSku}...</span>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Top Informational Architecture Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Catalog & Shiprocket Volumetric Callout */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-emerald-900 font-satoshi">
                <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Dynamic Catalog & Shiprocket Volumetric Sync</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed font-satoshi">
                Printable dimensions are <strong className="font-semibold">100% changeable</strong>. When updated in millimeters, the system automatically synchronizes the associated store catalog dimensions to:
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-100/90 text-emerald-900 font-mono text-xs font-semibold">
                <span>Product.lengthCm: {(profile.widthMm / 10).toFixed(1)} cm</span>
                <span className="text-emerald-500">×</span>
                <span>Product.breadthCm: {(profile.heightMm / 10).toFixed(1)} cm</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-satoshi">
                Guarantees Shiprocket dead-weight and volumetric packaging calculations stay automatically aligned.
              </p>
            </div>

            {/* Historical Snapshot Immutability Guarantee */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-950 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-blue-900 font-satoshi">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Historical Batch Snapshot Immutability</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed font-satoshi">
                When a vendor print run is created, the system takes an <strong className="font-semibold">immutable snapshot</strong> (<code className="font-mono text-[10px]">profileSnapshot</code>).
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed font-satoshi">
                Resizing from {profile.widthMm}mm to new dimensions will apply to <strong className="font-semibold">future print batches</strong>, while past historical batches retain their exact manufacturing record.
              </p>
              <p className="text-[10px] text-blue-700 font-satoshi">
                The underlying QR token identity is completely decoupled from the sticker&apos;s physical shape.
              </p>
            </div>
          </div>

          {/* Grid: Physical Specs & Decal SVG Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Physical Metrics & Specs (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-xl border border-border bg-surface space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-sm font-semibold text-ink font-satoshi">{profile.name}</h3>
                    <p className="font-mono text-[11px] text-muted">SKU: {profile.sku}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      profile.active
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    {profile.active ? 'ACTIVE PROFILE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-bg/50">
                    <span className="text-[10px] uppercase font-medium text-muted block mb-0.5 font-satoshi">
                      Physical Dimensions
                    </span>
                    <span className="text-base font-semibold text-ink font-mono block">
                      {profile.widthMm} × {profile.heightMm}{' '}
                      <span className="text-xs font-normal text-muted">mm</span>
                    </span>
                    <span className="text-[10px] text-muted font-mono block mt-0.5">
                      {(profile.widthMm / 10).toFixed(1)} × {(profile.heightMm / 10).toFixed(1)} cm
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-bg/50">
                    <span className="text-[10px] uppercase font-medium text-muted block mb-0.5 font-satoshi">
                      Die-Cut Shape
                    </span>
                    <span className="text-base font-semibold text-ink font-mono block">
                      {profile.shape}
                    </span>
                    <span className="text-[10px] text-muted font-satoshi block mt-0.5">
                      Cutting plotter contour
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-bg/50">
                    <span className="text-[10px] uppercase font-medium text-muted block mb-0.5 font-satoshi">
                      Bleed Margin
                    </span>
                    <span className="text-base font-semibold text-ink font-mono block">
                      +{profile.bleedMm}{' '}
                      <span className="text-xs font-normal text-muted">mm</span>
                    </span>
                    <span className="text-[10px] text-muted font-satoshi block mt-0.5">
                      Total: {profile.widthMm + profile.bleedMm * 2}mm
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-bg/50">
                    <span className="text-[10px] uppercase font-medium text-muted block mb-0.5 font-satoshi">
                      Safe Margin
                    </span>
                    <span className="text-base font-semibold text-ink font-mono block">
                      {profile.safeMarginMm}{' '}
                      <span className="text-xs font-normal text-muted">mm</span>
                    </span>
                    <span className="text-[10px] text-muted font-satoshi block mt-0.5">
                      Inner boundary limit
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-bg/50 sm:col-span-2">
                    <span className="text-[10px] uppercase font-medium text-muted block mb-0.5 font-satoshi">
                      Material Specification
                    </span>
                    <span className="text-xs font-semibold text-ink font-satoshi block truncate">
                      {profile.material}
                    </span>
                    <span className="text-[10px] text-muted font-satoshi block mt-0.5 truncate">
                      Finish: {profile.finish}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Reusable Templates List */}
              <div className="p-5 rounded-xl border border-border bg-surface space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink font-satoshi">
                    Active Design Templates ({profile.templates?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="text-xs font-medium text-ink hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Template</span>
                  </button>
                </div>

                {!profile.templates?.length ? (
                  <p className="text-xs text-muted font-satoshi py-2">
                    No custom templates configured. Default decal layout will be used for vendor runs.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {profile.templates.map((tpl: PrintTemplate) => (
                      <div
                        key={tpl.id}
                        className="p-3 rounded-lg border border-border bg-bg/40 flex items-center justify-between text-xs hover:border-ink/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink font-satoshi">{tpl.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted/15 text-muted">
                              v{tpl.version}
                            </span>
                            {tpl.isDefault && (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted font-mono">
                            QR Size: {tpl.qrSizeMm}mm • Tag Number Position: {tpl.tagNumberPosition} • Offset: ({tpl.qrXPosition ?? 0}, {tpl.qrYPosition ?? 0})mm
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Interactive Decal SVG Visualizer (5 cols) */}
            <div className="lg:col-span-5">
              <div className="p-5 rounded-xl border border-border bg-surface flex flex-col items-center justify-center space-y-4 text-center">
                <div className="flex items-center justify-between w-full pb-2 border-b border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink font-satoshi flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-muted" />
                    <span>Die-Cut Geometry Preview</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted">Scale 1:1 Aspect Ratio</span>
                </div>

                {/* SVG Visualizer */}
                <div className="w-full flex items-center justify-center py-6 bg-bg/60 rounded-xl border border-dashed border-border overflow-hidden">
                  <DecalVisualizer profile={profile} />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-2 w-full text-[10px] font-mono text-muted pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-0.5 bg-ink" />
                    <span>Cutline ({profile.widthMm}mm)</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-0.5 bg-red-400 border-b border-dashed border-red-500" />
                    <span>Bleed (+{profile.bleedMm}mm)</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-0.5 bg-cyan-500 border-b border-dashed border-cyan-600" />
                    <span>Safe (-{profile.safeMarginMm}mm)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* MODAL 1: EDIT PRINT PROFILE (DIMENSIONS & MATERIAL)       */}
      {/* ========================================================= */}
      {isEditModalOpen && profile && (
        <EditPrintProfileModal
          profile={profile}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updatedProfile) => {
            setProfile(updatedProfile);
            setIsEditModalOpen(false);
            showToast(`Print profile updated. Dimensions synced to Product length/breadth: ${(updatedProfile.widthMm / 10).toFixed(1)} cm × ${(updatedProfile.heightMm / 10).toFixed(1)} cm.`);
            if (onRefreshInventory) onRefreshInventory();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD REUSABLE DESIGN TEMPLATE                     */}
      {/* ========================================================= */}
      {isTemplateModalOpen && profile && (
        <CreateTemplateModal
          profileId={profile.id}
          profileSku={profile.sku}
          onClose={() => setIsTemplateModalOpen(false)}
          onSuccess={(newTemplate) => {
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    templates: [...(prev.templates || []), newTemplate],
                  }
                : null
            );
            setIsTemplateModalOpen(false);
            showToast(`Template '${newTemplate.name}' added successfully.`);
          }}
        />
      )}
    </div>
  );
};

// =========================================================================
// Decal Visualizer Component (SVG Rendering)
// =========================================================================
const DecalVisualizer: React.FC<{ profile: PrintProfile }> = ({ profile }) => {
  const isCircle = profile.shape?.toUpperCase().includes('CIRCLE');
  const isRoundedRect =
    profile.shape?.toUpperCase().includes('ROUND') ||
    profile.shape?.toUpperCase().includes('KEYCHAIN');

  // Compute viewBox scaling relative to width/height
  const svgSize = 220;
  const padding = 24;
  const maxDim = Math.max(profile.widthMm, profile.heightMm, 100);
  const scale = (svgSize - padding * 2) / maxDim;

  const widthPx = profile.widthMm * scale;
  const heightPx = profile.heightMm * scale;
  const bleedPx = profile.bleedMm * scale;
  const safeMarginPx = profile.safeMarginMm * scale;

  const cx = svgSize / 2;
  const cy = svgSize / 2;

  const defaultTemplate = profile.templates?.find((t) => t.isDefault) || profile.templates?.[0];
  const qrSizeMm = defaultTemplate?.qrSizeMm || 36;
  const qrSizePx = qrSizeMm * scale;

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="drop-shadow-sm select-none"
    >
      {/* Bleed Guide (Red dashed) */}
      {isCircle ? (
        <circle
          cx={cx}
          cy={cy}
          r={widthPx / 2 + bleedPx}
          fill="none"
          stroke="#f87171"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
      ) : (
        <rect
          x={cx - widthPx / 2 - bleedPx}
          y={cy - heightPx / 2 - bleedPx}
          width={widthPx + bleedPx * 2}
          height={heightPx + bleedPx * 2}
          rx={isRoundedRect ? 14 : 4}
          fill="none"
          stroke="#f87171"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
      )}

      {/* Finished Physical Decal Cutline (Solid black border) */}
      {isCircle ? (
        <circle
          cx={cx}
          cy={cy}
          r={widthPx / 2}
          fill="#fafafa"
          stroke="#18181b"
          strokeWidth="2"
        />
      ) : (
        <rect
          x={cx - widthPx / 2}
          y={cy - heightPx / 2}
          width={widthPx}
          height={heightPx}
          rx={isRoundedRect ? 12 : 2}
          fill="#fafafa"
          stroke="#18181b"
          strokeWidth="2"
        />
      )}

      {/* Safe Inner Margin (Cyan dashed) */}
      {isCircle ? (
        <circle
          cx={cx}
          cy={cy}
          r={Math.max(10, widthPx / 2 - safeMarginPx)}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      ) : (
        <rect
          x={cx - widthPx / 2 + safeMarginPx}
          y={cy - heightPx / 2 + safeMarginPx}
          width={Math.max(10, widthPx - safeMarginPx * 2)}
          height={Math.max(10, heightPx - safeMarginPx * 2)}
          rx={isRoundedRect ? 8 : 1}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      )}

      {/* QR Code Graphic Representation */}
      <g transform={`translate(${cx - qrSizePx / 2}, ${cy - qrSizePx / 2 - 8})`}>
        <rect
          width={qrSizePx}
          height={qrSizePx}
          fill="#18181b"
          rx="4"
        />
        {/* Mock QR corner markers */}
        <rect x="3" y="3" width={qrSizePx * 0.28} height={qrSizePx * 0.28} fill="#ffffff" rx="1" />
        <rect x="5" y="5" width={qrSizePx * 0.16} height={qrSizePx * 0.16} fill="#18181b" />

        <rect x={qrSizePx * 0.68} y="3" width={qrSizePx * 0.28} height={qrSizePx * 0.28} fill="#ffffff" rx="1" />
        <rect x={qrSizePx * 0.74} y="5" width={qrSizePx * 0.16} height={qrSizePx * 0.16} fill="#18181b" />

        <rect x="3" y={qrSizePx * 0.68} width={qrSizePx * 0.28} height={qrSizePx * 0.28} fill="#ffffff" rx="1" />
        <rect x="5" y={qrSizePx * 0.74} width={qrSizePx * 0.16} height={qrSizePx * 0.16} fill="#18181b" />
      </g>

      {/* Tag Number Label Representation */}
      <text
        x={cx}
        y={cy + qrSizePx / 2 + 10}
        textAnchor="middle"
        fontSize="8"
        fontFamily="monospace"
        fontWeight="600"
        fill="#27272a"
      >
        KT-DEMO-2026
      </text>

      {/* Brand logo representation */}
      <text
        x={cx}
        y={cy + qrSizePx / 2 + 20}
        textAnchor="middle"
        fontSize="6.5"
        fontFamily="sans-serif"
        letterSpacing="0.08em"
        fill="#71717a"
        fontWeight="500"
      >
        KAUNTACT PRIVATE
      </text>
    </svg>
  );
};

// =========================================================================
// Edit Print Profile Modal Component
// =========================================================================
interface EditPrintProfileModalProps {
  profile: PrintProfile;
  onClose: () => void;
  onSuccess: (updated: PrintProfile) => void;
}

const EditPrintProfileModal: React.FC<EditPrintProfileModalProps> = ({
  profile,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(profile.name);
  const [widthMm, setWidthMm] = useState<number>(profile.widthMm);
  const [heightMm, setHeightMm] = useState<number>(profile.heightMm);
  const [shape, setShape] = useState<string>(profile.shape);
  const [material, setMaterial] = useState<string>(profile.material);
  const [finish, setFinish] = useState<string>(profile.finish);
  const [bleedMm, setBleedMm] = useState<number>(profile.bleedMm);
  const [safeMarginMm, setSafeMarginMm] = useState<number>(profile.safeMarginMm);
  const [active, setActive] = useState<boolean>(profile.active);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (widthMm <= 0 || heightMm <= 0) {
      setError('Physical dimensions must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: UpsertPrintProfilePayload = {
      name: name.trim(),
      widthMm: Number(widthMm),
      heightMm: Number(heightMm),
      shape: shape.trim().toUpperCase(),
      material: material.trim(),
      finish: finish.trim(),
      bleedMm: Number(bleedMm),
      safeMarginMm: Number(safeMarginMm),
      active,
    };

    try {
      const res = await adminApi.upsertPrintProfile(profile.sku, payload);
      const data = (res as any)?.data || res;
      onSuccess({
        ...profile,
        ...payload,
        id: data.id || profile.id,
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update print profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink font-satoshi">
              Edit Physical Print Profile & Dimensions
            </h3>
            <p className="font-mono text-[11px] text-muted">SKU: {profile.sku}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-satoshi">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Dynamic Sync Notice */}
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-900 space-y-1">
            <span className="font-semibold block text-[11px]">
              Automatic Catalog & Shipping Synchronization:
            </span>
            <p className="text-[10px] text-emerald-800 leading-normal">
              Updating dimensions here will automatically synchronize associated catalog{' '}
              <code className="font-mono font-semibold">Product.lengthCm</code> to{' '}
              <strong className="font-mono font-semibold">{(widthMm / 10).toFixed(1)} cm</strong> and{' '}
              <code className="font-mono font-semibold">Product.breadthCm</code> to{' '}
              <strong className="font-mono font-semibold">{(heightMm / 10).toFixed(1)} cm</strong> for Shiprocket carrier dead-weight calculations.
            </p>
          </div>

          <div>
            <label className="block font-medium text-ink mb-1">Profile Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            />
          </div>

          {/* Dimensions Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">
                Width (mm) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={widthMm}
                onChange={(e) => setWidthMm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
              <span className="text-[10px] text-muted font-mono mt-0.5 block">
                = {(widthMm / 10).toFixed(1)} cm
              </span>
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">
                Height (mm) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={heightMm}
                onChange={(e) => setHeightMm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
              <span className="text-[10px] text-muted font-mono mt-0.5 block">
                = {(heightMm / 10).toFixed(1)} cm
              </span>
            </div>
          </div>

          {/* Shape & Bleed */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">Die-Cut Shape *</label>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none font-mono"
              >
                <option value="CIRCLE">CIRCLE</option>
                <option value="ROUNDED_RECT">ROUNDED_RECTANGLE</option>
                <option value="RECTANGLE">RECTANGLE</option>
                <option value="SQUARE">SQUARE</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">Bleed Tolerance (mm) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={bleedMm}
                onChange={(e) => setBleedMm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          {/* Safe Margin & Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">Safe Margin (mm) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={safeMarginMm}
                onChange={(e) => setSafeMarginMm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">Status</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="profileActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-border text-ink focus:ring-ink"
                />
                <label htmlFor="profileActive" className="text-xs text-ink cursor-pointer">
                  Active for Production
                </label>
              </div>
            </div>
          </div>

          {/* Material & Finish */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">Material Spec</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. 140 GSM Premium Outdoor Vinyl"
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">Lamination Finish</label>
              <input
                type="text"
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                placeholder="e.g. Gloss UV Weatherproof"
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded border border-border hover:border-ink text-ink text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Save & Sync Dimensions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// Create Print Template Modal Component
// =========================================================================
interface CreateTemplateModalProps {
  profileId: string;
  profileSku: string;
  onClose: () => void;
  onSuccess: (template: PrintTemplate) => void;
}

const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  profileId,
  profileSku,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('Minimalist Dark Mode Layout');
  const [version, setVersion] = useState<number>(2);
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [qrSizeMm, setQrSizeMm] = useState<number>(32.0);
  const [qrXPosition, setQrXPosition] = useState<number>(0);
  const [qrYPosition, setQrYPosition] = useState<number>(-5);
  const [tagNumberPosition, setTagNumberPosition] = useState<string>('BELOW_QR');
  const [fontFamily, setFontFamily] = useState<string>('Inter');
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [fontSizePt, setFontSizePt] = useState<number>(10);
  const [logoUrl, setLogoUrl] = useState<string>('https://assets.kauntact.in/logo-white.svg');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreatePrintTemplatePayload = {
      name: name.trim(),
      version: Number(version),
      isDefault,
      qrSizeMm: Number(qrSizeMm),
      qrXPosition: Number(qrXPosition),
      qrYPosition: Number(qrYPosition),
      tagNumberPosition,
      typographyJson: {
        fontFamily,
        color: textColor,
        fontSizePt: Number(fontSizePt),
      },
      brandingAssets: {
        logoUrl: logoUrl.trim() || undefined,
      },
    };

    try {
      const res = await adminApi.addPrintTemplate(profileId, payload);
      const data = (res as any)?.data || res;
      onSuccess({
        id: data.id || `tpl_${Date.now()}`,
        profileId,
        name: payload.name,
        version: payload.version || 1,
        isDefault: Boolean(payload.isDefault),
        qrSizeMm: payload.qrSizeMm,
        tagNumberPosition: payload.tagNumberPosition || 'BELOW_QR',
        qrXPosition: payload.qrXPosition,
        qrYPosition: payload.qrYPosition,
        typographyJson: payload.typographyJson,
        brandingAssets: payload.brandingAssets,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink font-satoshi">Add Reusable Design Template</h3>
            <p className="font-mono text-[11px] text-muted">SKU: {profileSku}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-satoshi">
          {error && (
            <div className="p-2.5 rounded border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-medium text-ink mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Minimalist Dark Mode Layout"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">Version</label>
              <input
                type="number"
                min="1"
                value={version}
                onChange={(e) => setVersion(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">QR Code Size (mm) *</label>
              <input
                type="number"
                step="0.5"
                min="10"
                required
                value={qrSizeMm}
                onChange={(e) => setQrSizeMm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">Tag Number Position</label>
              <select
                value={tagNumberPosition}
                onChange={(e) => setTagNumberPosition(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              >
                <option value="BELOW_QR">BELOW_QR</option>
                <option value="ABOVE_QR">ABOVE_QR</option>
                <option value="INSIDE_FRAME">INSIDE_FRAME</option>
                <option value="NONE">NONE</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                id="isDefaultTemplate"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-border text-ink focus:ring-ink"
              />
              <label htmlFor="isDefaultTemplate" className="text-xs text-ink cursor-pointer">
                Set as Default Layout
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">QR X-Offset (mm)</label>
              <input
                type="number"
                step="0.5"
                value={qrXPosition}
                onChange={(e) => setQrXPosition(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">QR Y-Offset (mm)</label>
              <input
                type="number"
                step="0.5"
                value={qrYPosition}
                onChange={(e) => setQrYPosition(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">Font Family</label>
              <input
                type="text"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">Text Color</label>
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">Font Size (pt)</label>
              <input
                type="number"
                value={fontSizePt}
                onChange={(e) => setFontSizePt(Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink mb-1">Logo Asset URL</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://assets.kauntact.in/logo-white.svg"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none font-mono"
            />
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded border border-border hover:border-ink text-ink text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

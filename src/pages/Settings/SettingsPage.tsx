import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { authApi, resourcesApi, extractResourceTag, syncResourceTagUpdate } from '../../lib/api';
import type { UserProfile, Resource } from '../../types/api';
import {
  ArrowLeft,
  Check,
  Copy,
  AlertCircle,
  X,
  Shield,
  PhoneCall,
  QrCode,
  Loader2,
  Unlink,
  ChevronRight,
  MoreVertical,
  Plus,
  Edit2,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DelayedSpinner, Modal, useToast } from '../../components/ui';
import { PingInSvgLogo, PlusLogo } from '../../components/brand/PingInLogo';
import { PairQrModal, UnpairQrModal } from '../../components/resources';
import { useAuth } from '../../features/auth/AuthContext';
import { useSubscription } from '../../features/subscription';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateUser } = useAuth();
  const { subscription, isPlus, openUpgradeModal } = useSubscription();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  // Editable Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Change Password Modal state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Resources state for tag management
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);

  // Modals state
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [unpairTarget, setUnpairTarget] = useState<{
    resourceId: string;
    resourceName: string;
    tagNumber?: string;
  } | null>(null);

  // Overflow menu state per tag
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchResources = useCallback(async () => {
    setIsLoadingResources(true);
    try {
      const data = await resourcesApi.list();
      setResources(Array.isArray(data) ? data : []);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingResources(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchMe() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await authApi.getMe();
        if (isMounted) {
          setProfile(data);
          setEditName(data?.name || '');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load profile details');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchMe();
    fetchResources();

    const handleUpdate = () => {
      fetchMe();
      fetchResources();
    };

    window.addEventListener('resource:updated', handleUpdate);
    window.addEventListener('tag:updated', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('resource:updated', handleUpdate);
      window.removeEventListener('tag:updated', handleUpdate);
    };
  }, [fetchResources]);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile?.id) return;
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Helper to mask phone number: e.g. •••• 0333
  const getMaskedPhone = (phone?: string) => {
    if (!phone) return '•••• 0333';
    const digits = phone.replace(/\D/g, '');
    const last4 = digits.length >= 4 ? digits.slice(-4) : digits;
    return `•••• ${last4}`;
  };

  // Handle saving edited name (validated: 2 to 100 characters)
  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }

    if (trimmed.length < 2 || trimmed.length > 100) {
      toast.error('Name must be between 2 and 100 characters');
      return;
    }

    setIsSavingName(true);
    try {
      const res = await authApi.updateProfile({ name: trimmed });
      const newName = res?.user?.name || trimmed;
      const updatedUser = res?.user
        ? { ...res.user, name: newName }
        : { ...(profile || {}), name: newName };
      setProfile(updatedUser as UserProfile);

      // Immediately sync with AuthContext so the Navbar header updates automatically
      updateUser({
        ...(res?.user || {}),
        name: newName,
      });

      setIsEditingName(false);
      toast.success(res?.message || 'Name updated successfully');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to update name';
      toast.error(msg);
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle changing password (validated: 8-128 chars, non-identical to current)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      setPasswordError('New password must be between 8 and 128 characters');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success(res?.message || 'Password changed successfully');
      setIsChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to update password';
      setPasswordError(msg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Tag inventory stats
  const pairedResources = resources.filter((r) => Boolean(extractResourceTag(r)));
  const totalTags = pairedResources.length;
  const assignedTags = pairedResources.filter((r) => r.active !== false).length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-10 animate-fade-in pb-20">
        {/* Top Breadcrumb Navigation */}
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to resources</span>
          </Link>
        </div>

        {/* Screen Header with Clash Display */}
        <div className="space-y-1.5 pb-6 border-b border-border">
          <h1 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight leading-none">
            Settings
          </h1>
          <p className="text-sm text-muted font-sans">
            Account and connected tags
          </p>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <DelayedSpinner delay={180}>
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent mb-3" />
              <p className="text-sm text-muted font-sans">
                Loading settings...
              </p>
            </div>
          </DelayedSpinner>
        ) : error ? (
          <div className="py-12 text-center max-w-md mx-auto animate-fade-in font-sans">
            <AlertCircle className="h-7 w-7 text-danger mx-auto mb-2" />
            <h3 className="font-semibold text-base text-danger">
              Settings unavailable
            </h3>
            <p className="text-sm text-danger/80 mt-1 mb-4">
              {error}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-border hover:border-ink text-xs font-semibold text-ink rounded-xs transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : profile ? (
          <div className="space-y-12">
            {/* 1. ACCOUNT (Editable Name, Change Password, Account Details with NO bottom lines) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display font-medium text-xl sm:text-2xl text-ink tracking-tight">
                  Account
                </h2>

                {!isEditingName ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(profile.name || '');
                      setIsEditingName(true);
                    }}
                    className="p-1 text-muted hover:text-ink transition-colors cursor-pointer"
                    title="Edit name"
                    aria-label="Edit name"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditName(profile.name || '');
                    }}
                    className="text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Rows inside Account: Clean dividers between fields, NO bottom line after account details */}
              <div className="space-y-3 font-sans">
                {/* Name Row (Editable) */}
                {isEditingName ? (
                  <div className="py-2 space-y-2">
                    <span className="text-sm sm:text-base text-muted font-medium block">Name</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter your name"
                        className="h-10 px-3 rounded-xs border border-border bg-bg text-sm font-medium text-ink flex-1 focus:outline-none focus:border-ink transition-colors"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={isSavingName || !editName.trim()}
                        className="px-4 h-10 bg-ink text-surface text-xs font-semibold rounded-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSavingName ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4 py-2">
                    <span className="text-sm sm:text-base text-muted font-medium">Name</span>
                    <span className="text-base sm:text-lg font-medium text-ink text-right">
                      {profile.name}
                    </span>
                  </div>
                )}

                {/* Login Mobile */}
                <div className="flex items-center justify-between gap-4 py-2 border-t border-border/50">
                  <span className="text-sm sm:text-base text-muted font-medium">Login mobile</span>
                  <span className="text-base sm:text-lg font-medium text-ink text-right font-mono">
                    {profile.mobileNumber}
                  </span>
                </div>

                {/* Change Password Row */}
                <div className="flex items-center justify-between gap-4 py-2 border-t border-border/50">
                  <span className="text-sm sm:text-base text-muted font-medium">Security</span>
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="text-xs sm:text-sm font-semibold text-ink hover:text-muted transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Change password</span>
                  </button>
                </div>

                {/* Account Details Disclosure (No lines below this!) */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setShowAccountDetails((prev) => !prev)}
                      className="text-sm text-muted hover:text-ink transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>Account details</span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 transition-transform ${
                          showAccountDetails ? 'rotate-90 text-ink' : ''
                        }`}
                      />
                    </button>

                    {showAccountDetails && (
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="px-2.5 py-1 text-xs font-medium text-muted hover:text-ink border border-border hover:border-ink rounded-xs transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                      >
                        {copiedId ? (
                          <>
                            <Check className="h-3 w-3 text-ink" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {showAccountDetails && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 text-xs text-muted flex items-center justify-between">
                      <span className="text-muted">Account ID:</span>
                      <span className="font-mono text-ink select-all text-right truncate pl-2">
                        {profile.id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. YOUR STICKERS (Moved to second position, separated by fine divider) */}
            <section className="space-y-4 pt-8 border-t border-border">
              <div className="flex items-baseline justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="font-display font-medium text-xl sm:text-2xl text-ink tracking-tight">
                    Your stickers
                  </h2>
                  <p className="text-sm text-muted font-sans">
                    {totalTags} tag{totalTags === 1 ? '' : 's'} · {assignedTags} assigned
                  </p>
                </div>

                {/* Primary Action: Pair sticker */}
                <button
                  type="button"
                  onClick={() => setIsPairModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xs bg-ink text-surface hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 font-sans"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Pair sticker</span>
                </button>
              </div>

              {/* Tag Inventory Items with fine row dividers */}
              <div className="pt-1">
                {isLoadingResources ? (
                  <div className="py-8 text-center text-sm text-muted flex items-center justify-center gap-2 font-sans border-y border-border/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading stickers...</span>
                  </div>
                ) : pairedResources.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted space-y-2 font-sans border-y border-border/70">
                    <p>No stickers currently paired to your account.</p>
                    <button
                      type="button"
                      onClick={() => setIsPairModalOpen(true)}
                      className="text-sm font-semibold text-ink underline underline-offset-4 cursor-pointer"
                    >
                      Pair your first sticker
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 border-y border-border/70">
                    {pairedResources.map((res) => {
                      const tag = extractResourceTag(res);
                      const resId = res.id || (res as any)._id;
                      const isAssigned = res.active !== false && Boolean(tag);
                      const isMenuOpen = openMenuId === resId;

                      return (
                        <div
                          key={resId}
                          className="py-3.5 sm:py-4 flex items-center justify-between gap-4 relative"
                        >
                          {/* Tapping row navigates to resource */}
                          <div
                            onClick={() => navigate(`/resources/${resId}`)}
                            className="min-w-0 flex-1 cursor-pointer group"
                          >
                            <h3 className="font-display font-medium text-lg sm:text-xl text-ink tracking-tight truncate group-hover:opacity-85 transition-opacity">
                              {res.name}
                            </h3>
                            <span className="text-xs sm:text-sm text-muted font-mono block mt-0.5">
                              #{tag} · {isAssigned ? 'Assigned' : 'Unassigned'}
                            </span>
                          </div>

                          {/* Actions: Primary action + overflow menu */}
                          <div className="flex items-center gap-2 shrink-0 font-sans">
                            {isAssigned ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/resources/${resId}`)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xs border border-border hover:border-ink text-ink bg-surface transition-colors cursor-pointer"
                              >
                                Manage tag
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIsPairModalOpen(true)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xs bg-ink text-surface hover:opacity-90 transition-all cursor-pointer"
                              >
                                Pair tag
                              </button>
                            )}

                            {/* Overflow Menu Button */}
                            <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(isMenuOpen ? null : resId);
                                }}
                                className="p-1.5 rounded-xs border border-transparent hover:border-border text-muted hover:text-ink transition-colors cursor-pointer"
                                aria-label="More actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-44 rounded-sm border border-border bg-surface shadow-xl z-30 py-1 text-xs animate-fade-in font-sans">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      navigate(`/resources/${resId}`);
                                    }}
                                    className="w-full text-left px-3 py-2 text-ink hover:bg-bg transition-colors cursor-pointer font-medium"
                                  >
                                    View details
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setIsPairModalOpen(true);
                                    }}
                                    className="w-full text-left px-3 py-2 text-ink hover:bg-bg transition-colors cursor-pointer font-medium"
                                  >
                                    Replace tag
                                  </button>

                                  <div className="border-t border-border/60 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setUnpairTarget({
                                        resourceId: resId,
                                        resourceName: res.name,
                                        tagNumber: tag,
                                      });
                                    }}
                                    className="w-full text-left px-3 py-2 text-danger hover:bg-danger/10 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
                                  >
                                    <Unlink className="h-3.5 w-3.5" />
                                    <span>Unpair tag</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 3. SUBSCRIPTION */}
            <section className="space-y-4 pt-8 border-t border-border font-sans">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display font-medium text-xl sm:text-2xl text-ink tracking-tight">
                  Subscription
                </h2>

                {isPlus ? (
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('PLUS_RENEWAL')}
                    className="text-xs sm:text-sm font-semibold text-ink hover:text-muted transition-colors cursor-pointer"
                  >
                    Renew plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('PACK_499')}
                    className="text-xs sm:text-sm font-semibold text-ink hover:text-muted transition-colors cursor-pointer"
                  >
                    Upgrade to Plus
                  </button>
                )}
              </div>

              <div className="space-y-3 font-sans">
                {/* Plan Tier Row */}
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm sm:text-base text-muted font-medium">Plan</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-medium text-ink text-right">
                      {isPlus ? 'Kauntact Plus' : 'Basic'}
                    </span>
                    {isPlus && <PlusLogo height={18} width={18} />}
                  </div>
                </div>

                {/* Status / Expiry Row */}
                <div className="flex items-center justify-between gap-4 py-2 border-t border-border/50">
                  <span className="text-sm sm:text-base text-muted font-medium">Status</span>
                  <span className="text-base sm:text-lg font-medium text-ink text-right">
                    {isPlus
                      ? `${subscription?.daysRemaining ?? 365} days remaining`
                      : 'Free tier'}
                  </span>
                </div>
              </div>
            </section>

            {/* 4. PRIVATE CALLING (Renamed from Private Relay & Moved to the bottom!) */}
            <section className="space-y-4 pt-8 border-t border-border">
              <h2 className="font-display font-medium text-xl sm:text-2xl text-ink tracking-tight">
                Private calling
              </h2>

              <div
                onClick={() => setShowPrivacyModal(true)}
                className="p-4 rounded-sm bg-surface/50 hover:bg-surface border border-border/70 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="space-y-1">
                  <span className="text-base sm:text-lg font-semibold text-ink font-sans block">
                    Call forwarding active
                  </span>
                  <p className="text-sm text-muted font-sans">
                    Calls forwarded to {getMaskedPhone(profile.contactEndpoint?.phoneNumber || profile.mobileNumber)}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-muted group-hover:text-ink transition-colors shrink-0">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {/* Modal: Change Password */}
        <Modal
          isOpen={isChangePasswordOpen}
          onClose={() => {
            setIsChangePasswordOpen(false);
            setPasswordError(null);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
          }}
          title="Change password"
        >
          <form onSubmit={handleChangePassword} className="space-y-4 pt-1 font-sans">
            {passwordError && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-xs text-xs text-danger">
                {passwordError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted font-medium block">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-10 px-3 rounded-xs border border-border bg-bg text-sm text-ink focus:outline-none focus:border-ink transition-colors"
                autoFocus
              />
            </div>

            {/* New Password with View Password Toggle */}
            <div className="space-y-1">
              <label className="text-xs text-muted font-medium block">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-10 pl-3 pr-10 rounded-xs border border-border bg-bg text-sm text-ink focus:outline-none focus:border-ink transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-0.5 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'View password'}
                  aria-label={showNewPassword ? 'Hide password' : 'View password'}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password with View Password Toggle */}
            <div className="space-y-1">
              <label className="text-xs text-muted font-medium block">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-10 pl-3 pr-10 rounded-xs border border-border bg-bg text-sm text-ink focus:outline-none focus:border-ink transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-0.5 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'View password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'View password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsChangePasswordOpen(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
                className="px-4 py-2 border border-border text-muted hover:text-ink text-xs font-semibold rounded-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPassword || !newPassword || !confirmPassword}
                className="px-4 py-2 bg-ink text-surface text-xs font-semibold rounded-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingPassword ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: How Private Calling Works */}
        {showPrivacyModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowPrivacyModal(false)}
          >
            <div
              className="w-full max-w-md bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <h3 className="font-display font-medium text-lg text-ink tracking-tight">
                  How private calling works
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-muted hover:text-ink transition-colors p-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full border border-border flex items-center justify-center shrink-0 text-ink">
                    <QrCode className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-medium text-ink block text-sm">1. Visitor scans sticker</span>
                    <p className="text-muted leading-relaxed">
                      A visitor scans the sticker on your belonging and initiates private contact.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full border border-border flex items-center justify-center shrink-0 text-ink">
                    <PhoneCall className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-medium text-ink block text-sm">2. Private bridge</span>
                    <p className="text-muted leading-relaxed">
                      <PingInSvgLogo inline className="mr-1 text-ink" /> routes the call to {getMaskedPhone(profile?.contactEndpoint?.phoneNumber || profile?.mobileNumber)} through a secure relay.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full border border-border flex items-center justify-center shrink-0 text-ink">
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-medium text-ink block text-sm">3. Personal numbers stay hidden</span>
                    <p className="text-muted leading-relaxed">
                      Neither party ever sees the other&rsquo;s phone number.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/70 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-4 py-2 bg-ink text-surface text-xs font-medium rounded-xs hover:opacity-90 transition-all cursor-pointer font-sans"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Modals */}
        <PairQrModal
          isOpen={isPairModalOpen}
          onClose={() => setIsPairModalOpen(false)}
          onSuccess={() => {
            setIsPairModalOpen(false);
            fetchResources();
          }}
        />

        {unpairTarget && (
          <UnpairQrModal
            isOpen={Boolean(unpairTarget)}
            onClose={() => setUnpairTarget(null)}
            resourceId={unpairTarget.resourceId}
            resourceName={unpairTarget.resourceName}
            tagNumber={unpairTarget.tagNumber}
            onUnpaired={() => {
              if (unpairTarget?.resourceId) {
                syncResourceTagUpdate(unpairTarget.resourceId, null, unpairTarget.tagNumber);
              }
              setUnpairTarget(null);
              fetchResources();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default SettingsPage;

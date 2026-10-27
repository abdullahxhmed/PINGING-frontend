import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type {
  UserSubscription,
  SubscriptionTagsState,
  SubscriptionPack,
  PackType,
  UserSubscriptionMeData,
} from '../../types/subscription';
import { subscriptionApi } from '../../lib/api';
import { authStorage } from '../../lib/auth';
import { useAuth } from '../auth/AuthContext';
import { SubscriptionPlansModal } from './SubscriptionPlansModal';
import { DemotedTagSelectionModal } from './DemotedTagSelectionModal';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  tags: SubscriptionTagsState | null;
  catalog: SubscriptionPack[];
  isPlus: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  // Modals state & controls
  isUpgradeModalOpen: boolean;
  selectedPackForUpgrade: PackType | null;
  openUpgradeModal: (packType?: PackType) => void;
  closeUpgradeModal: () => void;
  isTagSelectionModalOpen: boolean;
  openTagSelectionModal: () => void;
  closeTagSelectionModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [tags, setTags] = useState<SubscriptionTagsState | null>(null);
  const [catalog, setCatalog] = useState<SubscriptionPack[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPackForUpgrade, setSelectedPackForUpgrade] = useState<PackType | null>(null);
  const [isTagSelectionModalOpen, setIsTagSelectionModalOpen] = useState(false);

  const prevAuthRef = useRef<boolean>(isAuthenticated);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSubscriptionData = useCallback(async (force = false) => {
    const hasToken = Boolean(authStorage.getAccessToken());

    if (!hasToken) {
      setSubscription(null);
      setTags(null);
      // Fetch public catalog for shop/guest views using cached packs
      try {
        const packs = await subscriptionApi.getPacks(force);
        if (Array.isArray(packs) && packs.length > 0) {
          setCatalog(packs);
        }
      } catch {
        // Ignore public fetch error
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data: UserSubscriptionMeData = await subscriptionApi.getMe(force);
      if (data) {
        setSubscription(data.subscription || null);
        setTags(data.tags || null);
        if (Array.isArray(data.catalog) && data.catalog.length > 0) {
          setCatalog(data.catalog);
        }

        // Check if user was demoted and needs to select active tags
        if (data.tags?.needsTagSelection) {
          setIsTagSelectionModalOpen(true);
        }
      }
    } catch (err: any) {
      // If 401, session expired
      if (err.statusCode === 401) {
        setSubscription(null);
        setTags(null);
      } else {
        setError(err.message || 'Failed to load subscription details');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only force-refetch if authentication state actually transitioned across sessions
    const authChanged = prevAuthRef.current !== isAuthenticated;
    prevAuthRef.current = isAuthenticated;

    fetchSubscriptionData(authChanged);

    const handleDebouncedUpdate = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchSubscriptionData(true);
      }, 350);
    };

    window.addEventListener('subscription:updated', handleDebouncedUpdate);
    window.addEventListener('auth:refresh', handleDebouncedUpdate);
    window.addEventListener('resource:updated', handleDebouncedUpdate);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('subscription:updated', handleDebouncedUpdate);
      window.removeEventListener('auth:refresh', handleDebouncedUpdate);
      window.removeEventListener('resource:updated', handleDebouncedUpdate);
    };
  }, [fetchSubscriptionData, isAuthenticated]);

  const openUpgradeModal = useCallback((packType?: PackType) => {
    setSelectedPackForUpgrade(packType || null);
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setSelectedPackForUpgrade(null);
  }, []);

  const openTagSelectionModal = useCallback(() => {
    setIsTagSelectionModalOpen(true);
  }, []);

  const closeTagSelectionModal = useCallback(() => {
    setIsTagSelectionModalOpen(false);
  }, []);

  const isPlus = Boolean(
    subscription?.tier === 'PLUS' &&
      subscription?.status === 'ACTIVE' &&
      !subscription?.isExpired
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        tags,
        catalog,
        isPlus,
        isLoading,
        error,
        refetch: fetchSubscriptionData,
        isUpgradeModalOpen,
        selectedPackForUpgrade,
        openUpgradeModal,
        closeUpgradeModal,
        isTagSelectionModalOpen,
        openTagSelectionModal,
        closeTagSelectionModal,
      }}
    >
      {children}

      {/* Global Modals Mounted with Subscription Context */}
      <SubscriptionPlansModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        initialPackType={selectedPackForUpgrade}
      />

      <DemotedTagSelectionModal
        isOpen={isTagSelectionModalOpen}
        onClose={closeTagSelectionModal}
      />
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

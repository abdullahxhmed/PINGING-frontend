import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
  refetch: () => Promise<void>;
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

  const fetchSubscriptionData = useCallback(async () => {
    const hasToken = Boolean(authStorage.getAccessToken());

    if (!hasToken) {
      setSubscription(null);
      setTags(null);
      // Still fetch public catalog for shop/guest views
      try {
        const packs = await subscriptionApi.getPacks();
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
      const data: UserSubscriptionMeData = await subscriptionApi.getMe();
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
    fetchSubscriptionData();

    const handleSubscriptionUpdate = () => {
      fetchSubscriptionData();
    };

    window.addEventListener('subscription:updated', handleSubscriptionUpdate);
    window.addEventListener('auth:refresh', handleSubscriptionUpdate);
    window.addEventListener('resource:updated', handleSubscriptionUpdate);

    return () => {
      window.removeEventListener('subscription:updated', handleSubscriptionUpdate);
      window.removeEventListener('auth:refresh', handleSubscriptionUpdate);
      window.removeEventListener('resource:updated', handleSubscriptionUpdate);
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

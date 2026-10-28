import React from 'react';
import type { OverviewLifetimeMetrics } from '../../../types/admin.overview.types';
import { formatCount } from './overviewFormatters';

interface LifetimeFooterProps {
  lifetime?: OverviewLifetimeMetrics;
}

export const LifetimeFooter: React.FC<LifetimeFooterProps> = ({ lifetime }) => {
  const users = formatCount(lifetime?.users);
  const tags = formatCount(lifetime?.registeredTags);
  const total = formatCount(lifetime?.tagsMade);

  return (
    <footer className="pt-2 pb-6 border-t border-border/40 text-center">
      <p className="text-xs text-muted font-sans">
        Lifetime: {users} users · {tags} registered tags · {total} total tags made
      </p>
    </footer>
  );
};

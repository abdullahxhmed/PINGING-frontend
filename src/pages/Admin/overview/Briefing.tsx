import React from 'react';
import type { AdminOverviewResponse } from '../../../types/admin.overview.types';
import { generateBriefingSentence } from './overviewFormatters';

interface BriefingProps {
  data: AdminOverviewResponse;
}

export const Briefing: React.FC<BriefingProps> = ({ data }) => {
  const sentence = generateBriefingSentence(data);

  return (
    <div className="py-1">
      <p className="text-[15px] sm:text-base font-medium text-ink font-sans leading-relaxed tracking-tight">
        {sentence}
      </p>
    </div>
  );
};


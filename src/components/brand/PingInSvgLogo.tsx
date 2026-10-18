import React from 'react';
import { KauntactLogo, type KauntactLogoProps } from './KauntactLogo';

export type PingInLogoSvgProps = KauntactLogoProps;

/**
 * PingInSvgLogo renders the official Kauntact vector logo.
 */
export const PingInSvgLogo: React.FC<PingInLogoSvgProps> = (props) => {
  return <KauntactLogo {...props} />;
};

export default PingInSvgLogo;

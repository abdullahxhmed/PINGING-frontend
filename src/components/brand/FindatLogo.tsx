import React from 'react';
import { KauntactLogo, type KauntactLogoProps } from './KauntactLogo';

export type FindatLogoProps = KauntactLogoProps;

/**
 * FindatLogo is now an alias for the Kauntact vector brand logo.
 */
export const FindatLogo: React.FC<FindatLogoProps> = (props) => {
  return <KauntactLogo {...props} />;
};

export const FindatSvgLogo = FindatLogo;
export { KauntactLogo, KauntactSvgLogo } from './KauntactLogo';
export default FindatLogo;

import React from 'react';
import { KauntactLogo, type KauntactLogoProps } from './KauntactLogo';

export interface PingInLogoProps extends KauntactLogoProps {
  fallbackText?: boolean;
  alignFlushLeft?: boolean;
}

/**
 * PingInLogo renders the official Kauntact vector logo.
 * Default height is 16px for an understated, balanced look.
 */
export const PingInLogo: React.FC<PingInLogoProps> = ({
  height,
  width,
  className = '',
  ...props
}) => {
  return (
    <KauntactLogo
      height={height}
      width={width}
      className={className}
      {...props}
    />
  );
};

export { KauntactLogo, KauntactSvgLogo } from './KauntactLogo';
export { KauntactFavicon } from './KauntactFavicon';
export { PingInSvgLogo } from './PingInSvgLogo';
export { PlusLogo } from './PlusLogo';
export { FindatLogo, FindatSvgLogo } from './FindatLogo';
export const ParkPingLogo = PingInLogo;
export default PingInLogo;

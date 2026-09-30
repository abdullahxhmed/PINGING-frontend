import React from 'react';
import { FindatLogo, type FindatLogoProps } from './FindatLogo';

export interface PingInLogoProps extends FindatLogoProps {
  fallbackText?: boolean;
  alignFlushLeft?: boolean;
}

/**
 * PingInLogo renders the official Findat vector logo from public/findat.svg.
 * Default height is 16px for an understated, balanced look.
 */
export const PingInLogo: React.FC<PingInLogoProps> = ({
  height,
  width,
  className = '',
  ...props
}) => {
  return (
    <FindatLogo
      height={height}
      width={width}
      className={className}
      {...props}
    />
  );
};

export { FindatLogo, FindatSvgLogo } from './FindatLogo';
export { PingInSvgLogo } from './PingInSvgLogo';
export const ParkPingLogo = PingInLogo;
export default PingInLogo;

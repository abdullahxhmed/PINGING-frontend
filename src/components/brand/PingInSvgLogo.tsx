import React from 'react';
import { FindatLogo, type FindatLogoProps } from './FindatLogo';

export type PingInLogoSvgProps = FindatLogoProps;

/**
 * PingInSvgLogo now renders the new Findat vector logo from public/findat.svg.
 * Re-exported for seamless backwards-compatibility across the app.
 */
export const PingInSvgLogo: React.FC<PingInLogoSvgProps> = (props) => {
  return <FindatLogo {...props} />;
};

export default PingInSvgLogo;

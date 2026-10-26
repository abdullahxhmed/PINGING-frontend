import React from 'react';
import { FallingNavMenu, type FallingNavMenuProps } from '../layout/FallingNavMenu';

export const MobileMenu: React.FC<FallingNavMenuProps> = (props) => {
  return <FallingNavMenu {...props} />;
};

export default MobileMenu;

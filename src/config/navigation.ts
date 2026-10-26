/**
 * Canonical Application Navigation Configuration
 * Single source of truth for public, storefront, and falling navigation routes.
 */

export interface NavItemConfig {
  id: string;
  label: string;
  to: string;
  isExternalHash?: boolean;
}

export const MAIN_NAV_CONFIG: NavItemConfig[] = [
  { id: 'home', label: 'Home', to: '/' },
  { id: 'shop', label: 'Shop', to: '/shop' },
  { id: 'track', label: 'Track Order', to: '/track' },
  { id: 'contact', label: 'Contact & Support', to: '/contact' },
  { id: 'signin', label: 'Sign In', to: '/login' },
];

/**
 * Returns navigation links customized for the current user authentication state.
 */
export function getNavItems(isAuthenticated: boolean = false): NavItemConfig[] {
  return [
    { id: 'home', label: 'Home', to: '/' },
    { id: 'shop', label: 'Shop', to: '/shop' },
    { id: 'track', label: 'Track Order', to: '/track' },
    { id: 'contact', label: 'Contact & Support', to: '/contact' },
    {
      id: isAuthenticated ? 'dashboard' : 'signin',
      label: isAuthenticated ? 'Dashboard' : 'Sign In',
      to: isAuthenticated ? '/dashboard' : '/login',
    },
  ];
}

import { Surface, type SurfaceProps } from './Surface';

/**
 * @deprecated Prefer using `Surface` when a genuinely contained region is required,
 * or layout structure (div, section, Divider) rather than stacking Cards.
 */
export const Card = Surface;
export type CardProps = SurfaceProps;
export default Surface;

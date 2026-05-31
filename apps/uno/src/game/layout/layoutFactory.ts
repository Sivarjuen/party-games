/**
 * Layout factory — selects the appropriate TableLayoutProvider based on
 * current screen dimensions and device context.
 */
import type { TableLayoutProvider } from './types';
import { landscapeLayout } from './landscapeLayout';
import { portraitLayout } from './portraitLayout';
import { getLayoutMode } from './deviceContext';

export function getLayoutProvider(W: number, H: number): TableLayoutProvider {
  const mode = getLayoutMode(W, H);
  return mode === 'portrait' ? portraitLayout : landscapeLayout;
}

export { landscapeLayout, portraitLayout };

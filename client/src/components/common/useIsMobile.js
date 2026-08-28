import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport is at or below `breakpoint` px, and stays
 * in sync as the window resizes. Feature-detects window.matchMedia so this
 * degrades to "false" (desktop) rather than crashing in environments that
 * don't implement it (some test runners) instead of assuming it exists.
 */
export function useIsMobile(breakpoint = 640) {
  const supportsMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';

  const [isMobile, setIsMobile] = useState(() => {
    if (!supportsMatchMedia) return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    if (!supportsMatchMedia) return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handleChange = (event) => setIsMobile(event.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [breakpoint, supportsMatchMedia]);

  return isMobile;
}

import { useEffect, useState } from "react";

export function useMediaQuery(maxWidth: number): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(`(max-width: ${maxWidth - 1}px)`).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [maxWidth]);

  return matches;
}

export function useBreakpoint() {
  const isMobile = useMediaQuery(480);
  const isTablet = useMediaQuery(1024);
  const isNarrow = useMediaQuery(1024);
  return { isMobile, isTablet, isNarrow };
}

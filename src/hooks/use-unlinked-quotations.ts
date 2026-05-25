import { useState, useEffect, useCallback, useRef } from "react";
import type { UnlinkedQuotation } from "../data/detail-types";
import { quotationsService } from "../data";

export function useUnlinkedQuotations() {
  const [quotations, setQuotations] = useState<UnlinkedQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (hasLoadedOnce.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);

    quotationsService
      .getUnlinkedQuotations()
      .then((data) => {
        if (!cancelled) {
          setQuotations(data);
          hasLoadedOnce.current = true;
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setIsRefetching(false);
        }
      });

    return () => { cancelled = true; };
  }, [refetchKey]);

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  return { quotations, loading, isRefetching, error, refetch };
}

import { useState, useEffect, useCallback, useRef } from "react";
import type { Project, ListOptions } from "../data/types";
import { projectsService } from "../data";

export function useProjects(options?: ListOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasLoadedOnce = useRef(false);

  const optionsStr = JSON.stringify(options ?? {});

  useEffect(() => {
    let cancelled = false;
    if (hasLoadedOnce.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);
    projectsService
      .list(options)
      .then((p) => {
        if (!cancelled) {
          setProjects(p);
          hasLoadedOnce.current = true;
        }
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setIsRefetching(false);
        }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsStr, refetchKey]);

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  return { projects, loading, isRefetching, error, refetch };
}

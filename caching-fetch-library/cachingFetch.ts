import { useEffect, useState } from 'react';

type UseCachingFetch = (url: string) => {
  isLoading: boolean;
  data: unknown;
  error: Error | null;
};

type CacheEntry = {
  data: unknown | null;
  error: Error | null;
  promise?: Promise<void>;
};

const cache = new Map<string, CacheEntry>();

/**
 * Shared internal fetch logic
 */
const fetchAndCache = (url: string): Promise<void> => {
  const existing = cache.get(url);

  // Deduplicate in-flight request
  if (existing?.promise) {
    return existing.promise;
  }

  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      cache.set(url, { data, error: null });
    })
    .catch((error: Error) => {
      cache.set(url, { data: null, error });
    });

  cache.set(url, {
    data: existing?.data ?? null,
    error: null,
    promise,
  });

  return promise;
};

/**
 * 1. useCachingFetch
 */
export const useCachingFetch: UseCachingFetch = (url) => {
  const cached = cache.get(url);

  const [data, setData] = useState<unknown>(cached?.data ?? null);
  const [error, setError] = useState<Error | null>(cached?.error ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(
    !cached || (!cached.data && !cached.error),
  );

  useEffect(() => {
    let isMounted = true;

    const cachedEntry = cache.get(url);

    // If data already available (SSR or previous fetch)
    if (cachedEntry?.data || cachedEntry?.error) {
      setData(cachedEntry.data);
      setError(cachedEntry.error);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    fetchAndCache(url).then(() => {
      if (!isMounted) return;

      const updated = cache.get(url);
      setData(updated?.data ?? null);
      setError(updated?.error ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return { data, error, isLoading };
};

/**
 * 2. preloadCachingFetch (SSR)
 */
export const preloadCachingFetch = async (url: string): Promise<void> => {
  const cached = cache.get(url);

  // If already resolved, skip
  if (cached?.data || cached?.error) {
    return;
  }

  await fetchAndCache(url);
};

/**
 * 3. Serialize cache (server)
 */
export const serializeCache = (): string => {
  const serializable: Record<string, { data: unknown; error: string | null }> =
    {};

  for (const [key, value] of cache.entries()) {
    serializable[key] = {
      data: value.data,
      error: value.error ? value.error.message : null,
    };
  }

  return JSON.stringify(serializable);
};

/**
 * 3. Initialize cache (browser hydration)
 */
export const initializeCache = (serializedCache: string): void => {
  if (!serializedCache) return;

  try {
    const parsed: Record<
      string,
      { data: unknown; error: string | null }
    > = JSON.parse(serializedCache);

    Object.entries(parsed).forEach(([url, value]) => {
      cache.set(url, {
        data: value.data,
        error: value.error ? new Error(value.error) : null,
      });
    });
  } catch {
    // fail silently – invalid cache should not break app
  }
};

/**
 * Utility (for testing)
 */
export const wipeCache = (): void => {
  cache.clear();
};

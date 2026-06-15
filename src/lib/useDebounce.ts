'use client';

import { useState, useEffect } from 'react';

/**
 * Debounce a value — useful for search inputs that trigger API calls.
 * Returns the debounced value that only updates after `delay` ms of inactivity.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

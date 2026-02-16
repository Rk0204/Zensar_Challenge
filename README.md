# Caching Fetch Library Implementation

## Overview

This project contains:

* A minimal custom framework (server + client runtime)
* An MSW mock server (no external network required)
* A simple People Directory application
* A custom caching fetch library (`cachingFetch.ts`)

The framework and application were already complete.
The goal of this task was to fully implement the caching fetch library **without modifying any other files** in the repository.

---

# Getting Started

```bash
npm install
npm start
git checkout master
git pull origin master
```

Visit:

* [http://localhost:3000](http://localhost:3000)
* `/appWithoutSSRData`
* `/appWithSSRData`

---

# What Was Implemented

The following functions were completed inside `cachingFetch.ts`:

* `useCachingFetch`
* `preloadCachingFetch`
* `serializeCache`
* `initializeCache`
* `wipeCache`

No other files were changed.

---

# Functional Requirements & Results

## `/appWithoutSSRData`

* Renders correctly
* Only **1 network request** is made
* Multiple components share cached data
* No duplicate fetches
* Passes type-check

## `/appWithSSRData` (JavaScript Disabled)

* Fully server-rendered
* Data visible in HTML
* No client-side rendering required

## `/appWithSSRData` (JavaScript Enabled)

* No network requests occur
* Cache is hydrated correctly
* Immediate rendering

---

# Implementation Architecture

## Cache Structure

An in-memory `Map<string, CacheEntry>` is used:

```ts
type CacheEntry = {
  data: unknown | null;
  error: Error | null;
  promise?: Promise<void>;
};
```

Each URL maps to:

* `data` → fetched result
* `error` → fetch error (if any)
* `promise` → in-flight request (for deduplication)

---

# Client-Side Logic (`useCachingFetch`)

### Responsibilities

* Fetch data if not cached
* Reuse in-flight requests
* Return loading, data, and error states
* Avoid duplicate network calls

### Deduplication Strategy

If multiple components request the same URL:

1. First call triggers `fetch`
2. Promise stored in cache
3. Other calls reuse same promise
4. Only one network request occurs

This ensures the acceptance criterion:

> Only 1 network request should appear for `/appWithoutSSRData`.

---

# Server-Side Preloading (`preloadCachingFetch`)

Before rendering:

1. Server calls `preloadCachingFetch`
2. Data is fetched and stored in cache
3. React renders using populated cache

This enables:

* Fully server-rendered HTML
* No loading state during SSR
* Correct rendering even with JavaScript disabled

---

# Cache Serialization & Hydration

To transfer cache from server to browser:

## `serializeCache()`

* Converts cache Map to JSON
* Excludes promises
* Serializes errors safely

## `initializeCache(serializedCache)`

* Parses JSON
* Restores cache on browser
* Prevents refetching after hydration

Result:

* No network requests on `/appWithSSRData`
* Immediate data availability on client

---

# Data Flow

## Without SSR

Client Load →
Multiple `useCachingFetch` calls →
Single fetch →
Shared cache →
Render data

---

## With SSR

Server:

* `preloadCachingFetch`
* `serializeCache`
* Render full HTML

Client:

* `initializeCache`
* No fetch required
* Instant render

---

# Design Decisions

## 1. In-Memory Cache

Chosen because:

* Simple and predictable
* No additional dependencies
* Sufficient for challenge scope
* Easy to serialize

---

## 2. Promise-Based Deduplication

Storing the in-flight promise prevents duplicate requests.

This avoids:

* Race conditions
* Multiple identical network calls
* Inconsistent UI state

---

## 3. No External File Changes

All behavior implemented entirely inside:

```
cachingFetch.ts
```

This strictly follows the challenge constraints.

---

# Known Limitations

This is a minimal but functional implementation.

Limitations:

* Cache is global (not scoped per SSR request)
* No TTL or expiration
* No LRU eviction
* No stale-while-revalidate
* No AbortController support
* Error serialization only preserves message
* Cache grows indefinitely during runtime

---

# Potential Improvements (Production-Ready Enhancements)

If extended for real-world usage:

1. Scope cache per SSR request (avoid cross-user data leakage)
2. Add TTL expiration
3. Add stale-while-revalidate strategy
4. Implement LRU eviction
5. Support request cancellation (AbortController)
6. Add generics for stronger typing
7. Add Suspense support
8. Add testing (unit + integration)
9. Add devtools debugging support

---

# Why This Solution Works

This implementation:

* Deduplicates concurrent requests
* Supports full SSR rendering
* Hydrates cache correctly on client
* Avoids unnecessary network calls
* Meets all acceptance criteria
* Passes type-check
* Respects all constraints

The solution prioritizes correctness, clarity, and minimal surface complexity.

---

# Conclusion

The caching fetch library is now fully functional and:

* Works with both CSR and SSR
* Avoids duplicate requests
* Requires no framework changes
* Cleanly separates responsibilities
* Is easy to extend

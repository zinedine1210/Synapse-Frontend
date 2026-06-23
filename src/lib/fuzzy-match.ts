/**
 * Fuzzy matching utility for Command Palette search.
 * Uses a combination of substring matching and Levenshtein distance
 * to produce a relevance score for search queries against target strings.
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Create a 2D matrix for dynamic programming
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Check if the query is a substring of the target (case-insensitive).
 */
function isSubstring(query: string, target: string): boolean {
  return target.toLowerCase().includes(query.toLowerCase());
}

/**
 * Compute a fuzzy relevance score for a query against a target string.
 *
 * Scoring strategy:
 * - Exact match: highest score (target length * 3)
 * - Substring match: score based on query length relative to target (positive)
 * - Close edit distance (≤2): positive score inversely proportional to distance
 * - No reasonable match: 0
 *
 * @param query - The search query string
 * @param target - The target string to match against
 * @returns A relevance score (higher = better match). 0 = no match.
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match — highest possible score
  if (q === t) {
    return target.length * 3;
  }

  // Substring match — strong positive signal
  if (isSubstring(q, t)) {
    // Score based on how much of the target the query covers
    const coverage = q.length / t.length;
    return Math.max(1, Math.round(target.length * 2 * coverage));
  }

  // Check if target contains query as a subsequence or is close by edit distance
  // For short queries, check edit distance against the full target
  // For queries of similar length to target, check overall distance
  const distance = levenshteinDistance(q, t);

  // If edit distance is small relative to the target length, it's a good fuzzy match
  if (distance <= 2) {
    // Score inversely proportional to distance
    return Math.max(1, target.length - distance);
  }

  // Check if any window of the target (same length as query) has small edit distance
  if (q.length <= t.length) {
    let minWindowDistance = Infinity;
    for (let i = 0; i <= t.length - q.length; i++) {
      const window = t.substring(i, i + q.length);
      const d = levenshteinDistance(q, window);
      if (d < minWindowDistance) {
        minWindowDistance = d;
      }
    }

    if (minWindowDistance <= 2) {
      // Positive score — fuzzy substring match
      const coverage = q.length / t.length;
      return Math.max(1, Math.round(target.length * coverage) - minWindowDistance);
    }
  }

  // No meaningful match
  return 0;
}

/**
 * Match a query against an array of items, returning only those with a positive score.
 * Results are sorted by score descending.
 *
 * @param query       The search query
 * @param items       Array of items to match against
 * @param getText     Function to extract the matchable text(s) from an item
 * @param threshold   Minimum score to include (default: 0.3 — note: this implementation
 *                    uses integer scores so threshold maps to score > 0)
 * @returns Array of { item, score } sorted by score descending
 */
export function fuzzyMatch<T>(
  query: string,
  items: T[],
  getText: (item: T) => string | string[],
  _threshold: number = 0.3,
): { item: T; score: number }[] {
  if (!query.trim()) return [];

  const results: { item: T; score: number }[] = [];

  for (const item of items) {
    const texts = getText(item);
    const textArray = Array.isArray(texts) ? texts : [texts];

    let bestScore = 0;
    for (const text of textArray) {
      const score = fuzzyScore(query, text);
      bestScore = Math.max(bestScore, score);
    }

    if (bestScore > 0) {
      results.push({ item, score: bestScore });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

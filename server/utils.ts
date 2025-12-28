/**
 * DATA TRANSFORMATION & MERGE UTILITIES
 * ======================================
 *
 * These utilities power the "Lazy Overlay" pattern:
 * 1. transformExternalPlayer: Maps external API field names to our schema
 * 2. mergePlayerData: Overlays local MongoDB edits onto external API data
 */

import type { ExternalPlayerData, Player } from './types';

/**
 * Transform External API Data to Our Schema
 * ==========================================
 *
 * External API uses inconsistent field names:
 *   "Player name", "home run", "third baseman" (actually triples!)
 *
 * We normalize to camelCase:
 *   playerName, homeRuns, triples
 *
 * Also generates player ID from name:
 *   "Barry Bonds" → "barry-bonds"
 *   "Hank Aaron" → "hank-aaron"
 *
 * This ID is used as the key for merging with MongoDB data
 */
export function transformExternalPlayer(external: ExternalPlayerData): Player {
  // Generate ID from player name (slug format)
  // This ID is used to match external players with MongoDB overrides
  const id = external["Player name"]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    id,
    playerName: external["Player name"],
    position: external.position,
    games: external.Games,
    atBat: external["At-bat"],
    runs: external.Runs,
    hits: external.Hits,
    doubles: external["Double (2B)"],
    triples: external["third baseman"], // API has incorrect field name!
    homeRuns: external["home run"],
    rbi: external["run batted in"],
    walks: external["a walk"],
    strikeouts: external.Strikeouts,
    stolenBases: external["stolen base"],
    caughtStealing: external["Caught stealing"],
    avg: external.AVG,
    obp: external["On-base Percentage"],
    slg: external["Slugging Percentage"],
    ops: external["On-base Plus Slugging"]
  };
}

/**
 * Merge External + Local Data (Local Overrides External)
 * ========================================================
 *
 * This is the CORE of the Lazy Overlay pattern!
 *
 * Example scenario:
 * - External API has 271 players
 * - MongoDB has 2 players (Barry Bonds with bio, Hank Aaron with bio)
 *
 * Process:
 * 1. Create fast lookup map of local players by ID
 *    Map: { "barry-bonds" → {...}, "hank-aaron" → {...} }
 *
 * 2. For each external player (271 total):
 *    - Check if local override exists in map
 *    - If YES: Merge external + local (local fields override)
 *      Example: { ...externalStats, bio: "Behold Barry Bonds..." }
 *    - If NO: Use external data as-is
 *
 * 3. Return merged array (271 players, 2 have local overrides)
 *
 * Performance: O(n) time complexity due to Map lookup
 */
export function mergePlayerData(
  externalPlayers: Player[],
  localPlayers: Player[]
): Player[] {
  // Create map of local players by ID for O(1) lookup
  const localMap = new Map(localPlayers.map(p => [p.id, p]));

  // Merge: local data overwrites external data
  // Spread operator ensures local fields override external fields
  return externalPlayers.map(external => {
    const local = localMap.get(external.id);
    if (local) {
      // Local override exists - merge with local taking precedence
      // Example: External has stats, local has bio
      // Result: { ...stats from external, ...bio from local }
      return { ...external, ...local };
    }
    // No local override - use external data as-is
    return external;
  });
}

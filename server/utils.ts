import type { ExternalPlayerData, Player } from './types';

export function transformExternalPlayer(external: ExternalPlayerData): Player {
  // Generate ID from player name (slug format)
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
    triples: external["third baseman"],
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

export function mergePlayerData(
  externalPlayers: Player[],
  localPlayers: Player[]
): Player[] {
  // Create map of local players by ID for O(1) lookup
  const localMap = new Map(localPlayers.map(p => [p.id, p]));

  // Merge: local data overwrites external data
  return externalPlayers.map(external => {
    const local = localMap.get(external.id);
    if (local) {
      return { ...external, ...local };
    }
    return external;
  });
}

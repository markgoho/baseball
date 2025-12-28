export interface Player {
  id: string;
  playerName: string;
  position: string;
  games: number;
  atBat: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  bio?: string;
}

export interface ExternalPlayerData {
  "Player name": string;
  position: string;
  Games: number;
  "At-bat": number;
  Runs: number;
  Hits: number;
  "Double (2B)": number;
  "third baseman": number;
  "home run": number;
  "run batted in": number;
  "a walk": number;
  Strikeouts: number;
  "stolen base": number;
  "Caught stealing": number;
  AVG: number;
  "On-base Percentage": number;
  "Slugging Percentage": number;
  "On-base Plus Slugging": number;
}

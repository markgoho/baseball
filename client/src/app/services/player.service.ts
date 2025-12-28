import { Injectable, resource, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  // Using experimental httpResource for reactive data fetching
  players = resource<Player[], void>({
    loader: async () => {
      const response = await fetch(`${this.apiUrl}/players`);
      if (!response.ok) throw new Error('Failed to fetch players');
      return response.json();
    }
  });

  async updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/players/${id}`, updates)
    );
    // Reload players after update
    this.players.reload();
  }

  async generateBio(player: Player): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ bio: string }>(`${this.apiUrl}/generate-bio`, player)
    );
    return response.bio;
  }
}

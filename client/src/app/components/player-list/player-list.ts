import { Component, output, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { PlayerService, Player } from '../../services/player.service';

type SortField = 'hits' | 'homeRuns' | 'hitsPerGame' | null;

@Component({
  selector: 'app-player-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player-list">
      <div class="controls">
        <button (click)="sortBy('hits')" [class.active]="sortField() === 'hits'">
          Sort by Hits
        </button>
        <button (click)="sortBy('homeRuns')" [class.active]="sortField() === 'homeRuns'">
          Sort by Home Runs
        </button>
        <button (click)="sortBy('hitsPerGame')" [class.active]="sortField() === 'hitsPerGame'">
          Sort by Hits/Game
        </button>
      </div>

      @if (playerService.players.isLoading()) {
        <div class="loading">Loading players...</div>
      } @else if (playerService.players.error()) {
        <div class="error">Error: {{ playerService.players.error() }}</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Games</th>
              <th>Hits</th>
              <th>Home Runs</th>
              <th>Hits/Game</th>
              <th>AVG</th>
              <th>OPS</th>
            </tr>
          </thead>
          <tbody>
            @for (player of sortedPlayers(); track player.id) {
              <tr (click)="onPlayerClick(player)" [class.selected]="selectedId() === player.id">
                <td>{{ player.playerName }}</td>
                <td>{{ player.position }}</td>
                <td>{{ player.games }}</td>
                <td>{{ player.hits }}</td>
                <td>{{ player.homeRuns }}</td>
                <td>{{ player.hitsPerGame.toFixed(3) }}</td>
                <td>{{ player.avg.toFixed(3) }}</td>
                <td>{{ player.ops.toFixed(3) }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .player-list { padding: 1rem; }
    .controls { margin-bottom: 1rem; }
    button {
      padding: 0.5rem 1rem;
      margin-right: 0.5rem;
      cursor: pointer;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
    }
    button.active { background: #1976d2; color: white; border-color: #1976d2; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:hover { background: #f9f9f9; cursor: pointer; }
    tr.selected { background: #e3f2fd; }
    .loading, .error { padding: 2rem; text-align: center; }
    .error { color: #d32f2f; }
  `]
})
export class PlayerList {
  protected readonly playerService = inject(PlayerService);

  protected sortField = signal<SortField>(null);
  protected selectedId = signal<string | null>(null);

  playerSelected = output<Player>();

  protected sortedPlayers = computed(() => {
    const players = this.playerService.players.value() || [];
    const field = this.sortField();

    if (!field) return players;

    return [...players].sort((a, b) => b[field] - a[field]);
  });

  protected sortBy(field: SortField): void {
    this.sortField.set(field);
  }

  protected onPlayerClick(player: Player): void {
    this.selectedId.set(player.id);
    this.playerSelected.emit(player);
  }
}

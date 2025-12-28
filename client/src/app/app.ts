import { Component, signal } from '@angular/core';
import { PlayerDetail } from './components/player-detail/player-detail';
import { PlayerList } from './components/player-list/player-list';
import type { Player } from './services/player.service';

@Component({
  selector: 'app-root',
  imports: [PlayerList, PlayerDetail],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected selectedPlayer = signal<Player | null>(null);

  protected onPlayerSelected(player: Player): void {
    this.selectedPlayer.set(player);
  }
}

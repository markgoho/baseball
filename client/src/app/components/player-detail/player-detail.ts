import { Component, input, signal, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { PlayerService, Player } from '../../services/player.service';

@Component({
  selector: 'app-player-detail',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (player(); as p) {
      <div class="player-detail">
        <h2>{{ p.playerName }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSave()">
          <div class="form-group">
            <label>Player Name</label>
            <input formControlName="playerName" />
          </div>

          <div class="form-group">
            <label>Position</label>
            <input formControlName="position" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Games</label>
              <input type="number" formControlName="games" />
            </div>
            <div class="form-group">
              <label>Hits</label>
              <input type="number" formControlName="hits" />
            </div>
            <div class="form-group">
              <label>Home Runs</label>
              <input type="number" formControlName="homeRuns" />
            </div>
          </div>

          <div class="form-group">
            <label>Bio</label>
            <textarea formControlName="bio" rows="4" placeholder="Player biography..."></textarea>
            @if (generatingBio()) {
              <p class="generating-message">Generating bio...</p>
            }
          </div>

          <div class="actions">
            <button type="submit" [disabled]="!form.dirty || saving()">
              {{ saving() ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    } @else {
      <div class="empty-state">
        <p>Select a player to view details</p>
      </div>
    }
  `,
  styles: [`
    .player-detail { padding: 1rem; }
    h2 { margin-top: 0; color: #333; }
    .form-group { margin-bottom: 1rem; }
    .form-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 600;
      color: #555;
    }
    input, textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-family: inherit;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #1976d2;
    }
    .generating-message {
      margin-top: 0.5rem;
      color: #666;
      font-style: italic;
      font-size: 0.9rem;
    }
    .actions { margin-top: 1.5rem; }
    button[type="submit"] {
      padding: 0.75rem 1.5rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
    }
    button[type="submit"]:hover:not(:disabled) { background: #1565c0; }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .empty-state {
      padding: 3rem;
      text-align: center;
      color: #999;
    }
  `]
})
export class PlayerDetail {
  private readonly fb = inject(FormBuilder);
  private readonly playerService = inject(PlayerService);

  player = input.required<Player | null>();

  protected saving = signal(false);
  protected generatingBio = signal(false);

  protected form: FormGroup = this.fb.group({
    playerName: [''],
    position: [''],
    games: [0],
    hits: [0],
    homeRuns: [0],
    bio: ['']
  });

  constructor() {
    // Watch for player changes and update form
    effect(() => {
      const p = this.player();
      if (p) {
        this.form.patchValue({
          playerName: p.playerName,
          position: p.position,
          games: p.games,
          hits: p.hits,
          homeRuns: p.homeRuns,
          bio: p.bio || ''
        });
        this.form.markAsPristine();

        // Auto-generate bio if missing
        if (!p.bio) {
          this.onGenerateBio();
        }
      }
    });
  }

  /**
   * Save Player Edits
   * ==================
   *
   * Data Flow:
   * 1. Get form values (all fields: name, position, stats, bio)
   * 2. Call playerService.updatePlayer(id, updates)
   *    ↓
   *    Server: PUT /players/:id → MongoDB upsert
   *    ↓
   *    Server: Returns success
   *    ↓
   *    Service: players.reload() fetches fresh merged data
   *    ↓
   *    UI: PlayerList automatically updates with new data
   * 3. Mark form as pristine (disables Save button)
   */
  protected async onSave(): Promise<void> {
    const p = this.player();
    if (!p || !this.form.valid) return;

    this.saving.set(true);
    try {
      // Send all form changes to server → MongoDB
      await this.playerService.updatePlayer(p.id, this.form.value);
      this.form.markAsPristine();
    } catch (error) {
      console.error('Error saving player:', error);
      alert('Failed to save player');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Generate AI Bio
   * ================
   *
   * Data Flow:
   * 1. Call playerService.generateBio(player)
   *    ↓
   *    Server: POST /generate-bio → Gemini API
   *    ↓
   *    Gemini: Generates 2-sentence bio
   *    ↓
   *    Server: Returns bio text
   * 2. Populate form field with bio (NOT saved yet!)
   * 3. Mark form as dirty (enables Save button)
   * 4. User can edit AI-generated text
   * 5. User clicks "Save Changes" to persist
   *
   * Note: Bio is NOT automatically saved!
   * - Gives user chance to review/edit AI output
   * - User must explicitly click "Save Changes"
   */
  protected async onGenerateBio(): Promise<void> {
    const p = this.player();
    if (!p) return;

    this.generatingBio.set(true);
    try {
      // Generate bio via Gemini API
      const bio = await this.playerService.generateBio(p);
      // Populate form field (not saved yet - user must click Save)
      this.form.patchValue({ bio });
      this.form.markAsDirty(); // Enables Save button
    } catch (error) {
      console.error('Error generating bio:', error);
      alert('Failed to generate bio');
    } finally {
      this.generatingBio.set(false);
    }
  }
}

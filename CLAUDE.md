# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Baseball stats app with Angular 21 frontend, Bun/Elysia backend, MongoDB, and Google Gemini AI integration.

Stack:
- Client: Angular 21 (standalone components, signals, httpResource)
- Server: Bun + Elysia (TypeScript runtime and web framework)
- Database: MongoDB (Docker container)
- AI: Google Gemini API (bio generation)

## Development Commands

### Starting the Application

```bash
# Start all services (Docker, server, client)
bun run start

# Start individually
bun run start:docker  # MongoDB container on port 27017
bun run start:server  # API server on port 3000
bun run start:client  # Angular dev server on port 4200

# Stop Docker
bun run stop:docker
```

### Client Commands (from /client)

```bash
bun run start   # Dev server
bun run build   # Production build
bun run test    # Run tests with Vitest
```

### Server Commands (from /server)

```bash
bun run index.ts   # Start server directly
```

## Environment Variables

Server requires `GEMINI_API_KEY` environment variable for AI bio generation:

```bash
# Set in shell or .env file
export GEMINI_API_KEY=your_key_here
```

MongoDB URI defaults to `mongodb://localhost:27017` but can be overridden with `MONGODB_URI`.

## Core Architecture

### "Lazy Overlay" Pattern (server/index.ts)

Server implements lazy overlay where:
1. External API (hirefraction.com) = source of truth for base player stats
2. MongoDB stores ONLY user modifications (bios, edited stats)
3. Every GET request merges external + local data (local overrides external)

**Critical**: MongoDB does NOT store all 271 players, only edited ones. This prevents duplication and keeps external stats fresh.

Data flow:
- `GET /players`: External API → MongoDB → Merge → Client
- `PUT /players/:id`: Client → MongoDB (upsert) → triggers reload
- `POST /generate-bio`: Client → Gemini → Client (not saved until user clicks Save)

### Server File Responsibilities

- **index.ts**: API routes, lazy overlay orchestration, extensive architecture comments
- **db.ts**: MongoDB connection management (singleton pattern)
- **gemini.ts**: Google Gemini API integration for bio generation
- **types.ts**: Shared TypeScript interfaces (Player, ExternalPlayerData)
- **utils.ts**:
  - `transformExternalPlayer()`: Maps external API's inconsistent field names to our schema
  - `mergePlayerData()`: Core merge logic (local overrides external), handles duplicate IDs

### Client Architecture

Angular 21 using modern patterns:
- **Standalone components** (no NgModules)
- **Signals** for state management (`signal()`, `computed()`)
- **httpResource** for reactive data fetching (experimental Angular feature)
- **OnPush change detection**

Components:
- `App`: Root component, manages selected player state
- `PlayerList`: Table with sorting, emits player selection events
- `PlayerDetail`: Edit form with AI bio generation (uses reactive forms)

Service:
- `PlayerService`: Wraps API calls, uses `httpResource` for players endpoint, provides `updatePlayer()` and `generateBio()` methods

### Angular Best Practices (from .claude/rules/angular.md)

**MUST follow**:
- NO `standalone: true` (default in v20+)
- Use `input()` and `output()` functions, NOT decorators
- Use signals (`signal()`, `computed()`) for state
- Set `changeDetection: ChangeDetectionStrategy.OnPush`
- Use native control flow (`@if`, `@for`) NOT `*ngIf`, `*ngFor`
- Use `class` bindings NOT `ngClass`
- Use `style` bindings NOT `ngStyle`
- NO `@HostBinding`/`@HostListener` (use `host` object instead)
- Use `inject()` NOT constructor injection
- Must pass AXE accessibility checks and WCAG AA

## Type Definitions

`Player` interface shared between client and server:
- `id`: string (slug from player name, e.g., "barry-bonds")
- Stats: `playerName`, `position`, `games`, `atBat`, `runs`, `hits`, `doubles`, `triples`, `homeRuns`, `rbi`, `walks`, `strikeouts`, `stolenBases`, `caughtStealing`, `avg`, `obp`, `slg`, `ops`
- `bio?`: Optional AI-generated or user-edited bio

`ExternalPlayerData`: Maps external API's inconsistent field names (e.g., "Player name", "home run", "third baseman" for triples)

## API Endpoints

- `GET /players`: Returns merged player data (external + local overrides)
- `PUT /players/:id`: Upsert player edits to MongoDB (triggers reload)
- `POST /generate-bio`: Generate AI bio via Gemini (body: Player object)

## Key Implementation Details

### ID Generation
Player IDs generated from names (server/utils.ts:31-34):
```ts
"Barry Bonds" → "barry-bonds"
"Hank Aaron" → "hank-aaron"
```

Handles duplicates by appending suffix (`barry-bonds-2`).

### Merge Logic
Local MongoDB data ALWAYS overrides external API data using spread operator:
```ts
return { ...external, ...local };
```

### httpResource Usage
Client uses experimental Angular feature for reactive data:
```ts
players = httpResource<Player[]>(() => `${this.apiUrl}/players`);
players.reload(); // Called after updates
```

## Database

MongoDB collection: `baseball.players`

Only stores players with user modifications. Each document has all Player fields but only modified players exist in collection.

## Code Style

Client: Prettier configured (printWidth: 100, singleQuote: true, angular parser for HTML)

Both: TypeScript strict mode enabled

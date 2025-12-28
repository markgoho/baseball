/**
 * BASEBALL STATS API SERVER
 *
 * Architecture Pattern: "Lazy Overlay"
 * ===================================
 * This server implements a lazy overlay pattern where:
 * 1. External API (hirefraction.com) is the source of truth for base player data
 * 2. MongoDB stores ONLY user modifications (edits, bios)
 * 3. Every request merges external + local data (local overrides external)
 *
 * Data Flow:
 * - GET /players: External API → MongoDB → Merge → Client
 * - PUT /players/:id: Client → MongoDB (upsert) → triggers reload
 * - POST /generate-bio: Client → Gemini API → Client (not saved until user clicks Save)
 *
 * Benefits:
 * - External data stays fresh (always latest stats from API)
 * - User edits persist in MongoDB
 * - No duplication of 271 players in our DB (only edited ones stored)
 */

import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { closeDB, connectDB, getPlayersCollection } from "./db";
import { generatePlayerBio } from "./gemini";
import type { ExternalPlayerData, Player } from "./types";
import { mergePlayerData, transformExternalPlayer } from "./utils";

const EXTERNAL_API = "https://api.hirefraction.com/api/test/baseball";
const PORT = 3000;

// Initialize DB connection on startup
await connectDB();

const app = new Elysia()
  .use(
    cors({
      origin: "http://localhost:4200",
      credentials: true,
    })
  )

  /**
   * GET /players - Implements Lazy Overlay Pattern
   * ===============================================
   *
   * Data Flow (executed on EVERY request):
   *
   * Step 1: Fetch from External API
   *   ↓ GET https://api.hirefraction.com/api/test/baseball
   *   ↓ Returns 271 players with pristine stats
   *   ↓ Transform field names (e.g., "Player name" → playerName)
   *
   * Step 2: Fetch from MongoDB
   *   ↓ Query all documents from 'players' collection
   *   ↓ Returns ONLY players that have been edited (e.g., 2 players)
   *   ↓ Each document contains user modifications (edited stats, bios)
   *
   * Step 3: Merge (Local Overrides External)
   *   ↓ For each external player:
   *   ↓   - Check if local override exists (by player ID)
   *   ↓   - If exists: spread external, then spread local (local wins)
   *   ↓   - If not: use external data as-is
   *
   * Step 4: Return to Client
   *   ↓ Client receives 271 players (external + local edits merged)
   *
   * Why this pattern?
   * - External API always has latest stats
   * - User edits (bios, corrections) persist
   * - MongoDB only stores delta (not all 271 players)
   */
  .get("/players", async () => {
    try {
      // STEP 1: Fetch external API data (source of truth for base stats)
      const externalResponse = await fetch(EXTERNAL_API);
      if (!externalResponse.ok) {
        throw new Error("External API failed");
      }
      const externalData =
        (await externalResponse.json()) as ExternalPlayerData[];
      const externalPlayers = externalData.map(transformExternalPlayer);

      // STEP 2: Fetch local MongoDB data (user modifications only)
      const collection = await getPlayersCollection();
      const localPlayers = await collection.find({}).toArray();

      // STEP 3: Merge with local data taking precedence
      // See utils.ts mergePlayerData() for merge logic
      const merged = mergePlayerData(externalPlayers, localPlayers);

      // STEP 4: Return merged data to client
      return merged;
    } catch (error) {
      console.error("Error fetching players:", error);
      throw error;
    }
  })

  /**
   * PUT /players/:id - Save User Edits (Upsert to MongoDB)
   * ========================================================
   *
   * Data Flow:
   *
   * Client sends edited player data
   *   ↓ { playerName: "...", position: "...", bio: "..." }
   *
   * Upsert to MongoDB
   *   ↓ If player document exists: UPDATE it
   *   ↓ If player document doesn't exist: INSERT it
   *   ↓ MongoDB now stores this player's overrides
   *
   * Next GET /players request will merge this data
   *   ↓ External API provides base stats
   *   ↓ MongoDB provides this user's edits
   *   ↓ Merged result sent to client
   *
   * Key Point: MongoDB stores ONLY what user changed
   * - If user edits Barry Bonds' bio, only that player gets a MongoDB document
   * - The other 270 players remain unmodified (not in MongoDB)
   */
  .put("/players/:id", async ({ params, body }) => {
    try {
      const { id } = params;
      const playerUpdate = body as Partial<Player>;

      const collection = await getPlayersCollection();

      // Upsert: update if exists, insert if not
      // This ensures we only store players that have been modified
      const result = await collection.updateOne(
        { id },
        { $set: { id, ...playerUpdate } },
        { upsert: true }
      );

      return {
        success: true,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      };
    } catch (error) {
      console.error("Error updating player:", error);
      throw error;
    }
  })

  /**
   * POST /generate-bio - Generate AI Bio with Gemini
   * ==================================================
   *
   * Data Flow:
   *
   * Client sends player data
   *   ↓ { playerName: "...", position: "...", homeRuns: 755, avg: 0.305 }
   *
   * Call Gemini API (see gemini.ts)
   *   ↓ Prompt: "Write energetic 2-sentence bio for {player}..."
   *   ↓ Uses gemini-2.5-flash model
   *   ↓ Returns AI-generated bio text
   *
   * Return bio to client
   *   ↓ Client receives: { bio: "Hammerin' Hank Aaron..." }
   *   ↓ Client populates form field with bio
   *   ↓ User must click "Save Changes" to persist to MongoDB
   *
   * Important: Bio is NOT automatically saved!
   * - User can edit the AI-generated text before saving
   * - Clicking "Save Changes" triggers PUT /players/:id
   * - Only then does bio get stored in MongoDB
   */
  .post("/generate-bio", async ({ body }) => {
    try {
      const player = body as Player;
      const bio = await generatePlayerBio(player);

      return { bio };
    } catch (error) {
      console.error("Error generating bio:", error);
      throw error;
    }
  })

  .listen(PORT);

console.log(`🚀 Server running at http://localhost:${PORT}`);

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeDB();
  process.exit(0);
});

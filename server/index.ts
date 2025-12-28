import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { getPlayersCollection, connectDB, closeDB } from './db';
import { transformExternalPlayer, mergePlayerData } from './utils';
import { generatePlayerBio } from './gemini';
import type { Player, ExternalPlayerData } from './types';

const EXTERNAL_API = 'https://api.hirefraction.com/api/test/baseball';
const PORT = 3000;

// Initialize DB connection on startup
await connectDB();

const app = new Elysia()
  .use(cors({
    origin: 'http://localhost:4200',
    credentials: true,
  }))

  // GET /players - Lazy overlay pattern
  .get('/players', async () => {
    try {
      // Fetch external API data
      const externalResponse = await fetch(EXTERNAL_API);
      if (!externalResponse.ok) {
        throw new Error('External API failed');
      }
      const externalData: ExternalPlayerData[] = await externalResponse.json();
      const externalPlayers = externalData.map(transformExternalPlayer);

      // Fetch local MongoDB data
      const collection = await getPlayersCollection();
      const localPlayers = await collection.find({}).toArray();

      // Merge with local data taking precedence
      const merged = mergePlayerData(externalPlayers, localPlayers);

      return merged;
    } catch (error) {
      console.error('Error fetching players:', error);
      throw error;
    }
  })

  // PUT /players/:id - Upsert player
  .put('/players/:id', async ({ params, body }) => {
    try {
      const { id } = params;
      const playerUpdate = body as Partial<Player>;

      const collection = await getPlayersCollection();

      // Upsert: update if exists, insert if not
      const result = await collection.updateOne(
        { id },
        { $set: { id, ...playerUpdate } },
        { upsert: true }
      );

      return {
        success: true,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      };
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  })

  // POST /generate-bio - Generate bio with Gemini
  .post('/generate-bio', async ({ body }) => {
    try {
      const player = body as Player;
      const bio = await generatePlayerBio(player);

      return { bio };
    } catch (error) {
      console.error('Error generating bio:', error);
      throw error;
    }
  })

  .listen(PORT);

console.log(`🚀 Server running at http://localhost:${PORT}`);

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

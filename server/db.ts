import { MongoClient, Db, Collection } from 'mongodb';
import type { Player } from './types';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'baseball';
const COLLECTION_NAME = 'players';

let db: Db | null = null;
let client: MongoClient | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);

  console.log('Connected to MongoDB');
  return db;
}

export async function getPlayersCollection(): Promise<Collection<Player>> {
  const database = await connectDB();
  return database.collection<Player>(COLLECTION_NAME);
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

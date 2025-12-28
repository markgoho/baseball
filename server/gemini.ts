import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Player } from './types';

const API_KEY = process.env.GEMINI_API_KEY || '';

export async function generatePlayerBio(player: Player): Promise<string> {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable not set');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Write an energetic 2-sentence bio for baseball player ${player.playerName}, a ${player.position} with ${player.homeRuns} home runs and a ${player.avg} batting average. Make it exciting and highlight their key achievements!`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

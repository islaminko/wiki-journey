// Storage interface for the WikiGame
// Since this game is stateless and uses Wikipedia API directly,
// no persistent storage is needed for this MVP

export interface IStorage {}

export class MemStorage implements IStorage {
  constructor() {}
}

export const storage = new MemStorage();

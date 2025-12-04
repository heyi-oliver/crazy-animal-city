export enum CharacterType {
  JUDY = 'JUDY',
  NICK = 'NICK',
  FLASH = 'FLASH',
  CLAWHAUSER = 'CLAWHAUSER',
  EMPTY = 'EMPTY'
}

export interface Seat {
  id: number;
  character: CharacterType;
  isOccupied: boolean;
  isRecording: boolean;
  recordingStartTimestamp: number; // Time when recording started
  recordingDuration: number; // How long they have been recording
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  LEVEL_TRANSITION = 'LEVEL_TRANSITION',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface GameState {
  status: GameStatus;
  score: number;
  leakLevel: number; // 0 to 100
  highScore: number;
  level: number;
}
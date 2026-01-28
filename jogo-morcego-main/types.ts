export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export interface Bat {
  y: number;
  velocity: number;
  rotation: number;
  frame: number; // For animation
}

export interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
}
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRAVITY, 
  JUMP_STRENGTH, 
  BAT_X, 
  BAT_RADIUS, 
  PIPE_WIDTH, 
  PIPE_GAP, 
  PIPE_SPEED, 
  PIPE_SPAWN_RATE,
  PIPE_MIN_HEIGHT,
  MAX_VELOCITY,
  BAT_COLOR,
  BAT_WING_COLOR,
  PIPE_COLOR,
  PIPE_BORDER_COLOR
} from '../constants';
import { GameState, GameStatus, Bat, Pipe, Particle } from '../types';
import GameOverlay from './GameOverlay';

const BatGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Game State Refs (Mutable for performance in loop)
  const batRef = useRef<Bat>({ y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0, frame: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef<number>(0);
  
  // React State for UI
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.IDLE,
    score: 0,
    highScore: 0
  });

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('batflap-highscore');
    if (saved) {
      setGameState(prev => ({ ...prev, highScore: parseInt(saved, 10) }));
    }
  }, []);

  const spawnPipe = () => {
    const minPipe = PIPE_MIN_HEIGHT;
    const maxPipe = CANVAS_HEIGHT - PIPE_GAP - minPipe;
    const randomHeight = Math.floor(Math.random() * (maxPipe - minPipe + 1)) + minPipe;
    
    pipesRef.current.push({
      x: CANVAS_WIDTH,
      topHeight: randomHeight,
      passed: false
    });
  };

  const createExplosion = (x: number, y: number) => {
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color: i % 2 === 0 ? '#a78bfa' : '#ef4444'
      });
    }
  };

  const resetGame = useCallback(() => {
    batRef.current = { y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0, frame: 0 };
    pipesRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    frameCountRef.current = 0;
    setGameState(prev => ({ ...prev, status: GameStatus.IDLE, score: 0 }));
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setGameState(prev => ({ ...prev, status: GameStatus.PLAYING }));
  }, [resetGame]);

  const gameOver = useCallback(() => {
    setGameState(prev => {
      const newHigh = Math.max(prev.highScore, scoreRef.current);
      localStorage.setItem('batflap-highscore', newHigh.toString());
      return { ...prev, status: GameStatus.GAME_OVER, highScore: newHigh };
    });
    // Create death effect
    createExplosion(BAT_X, batRef.current.y);
  }, []);

  const jump = useCallback(() => {
    if (gameState.status === GameStatus.PLAYING) {
      batRef.current.velocity = JUMP_STRENGTH;
    } else if (gameState.status === GameStatus.IDLE) {
      startGame();
      batRef.current.velocity = JUMP_STRENGTH;
    } else if (gameState.status === GameStatus.GAME_OVER) {
       // Optional: Allow tap to restart quickly
       // resetGame(); 
       // setGameState(prev => ({ ...prev, status: GameStatus.PLAYING }));
    }
  }, [gameState.status, startGame]); // Removed resetGame dependence to avoid loop, handled by explicit restart button

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault(); // Prevent scrolling
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);


  // The Game Loop
  const update = useCallback((time: number) => {
    if (gameState.status !== GameStatus.PLAYING && gameState.status !== GameStatus.GAME_OVER) {
       // Just draw idle animation if needed, but we usually pause loop or just render static
       if (gameState.status === GameStatus.IDLE) {
          // Bobbing animation for idle
          batRef.current.y = CANVAS_HEIGHT / 2 + Math.sin(time / 300) * 20;
          batRef.current.frame++;
       }
    }

    if (gameState.status === GameStatus.PLAYING) {
      // 1. Update Bat Physics
      batRef.current.velocity += GRAVITY;
      batRef.current.velocity = Math.min(batRef.current.velocity, MAX_VELOCITY);
      batRef.current.y += batRef.current.velocity;
      batRef.current.frame++;

      // Rotation based on velocity
      batRef.current.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (batRef.current.velocity * 0.1)));

      // 2. Floor/Ceiling Collision
      if (batRef.current.y + BAT_RADIUS >= CANVAS_HEIGHT || batRef.current.y - BAT_RADIUS <= 0) {
        gameOver();
      }

      // 3. Pipe Management
      frameCountRef.current++;
      if (frameCountRef.current % PIPE_SPAWN_RATE === 0) {
        spawnPipe();
      }

      // 4. Update Pipes & Collision
      for (let i = pipesRef.current.length - 1; i >= 0; i--) {
        const pipe = pipesRef.current[i];
        pipe.x -= PIPE_SPEED;

        // Remove off-screen pipes
        if (pipe.x + PIPE_WIDTH < 0) {
          pipesRef.current.splice(i, 1);
          continue;
        }

        // Score counting
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BAT_X - BAT_RADIUS) {
          pipe.passed = true;
          scoreRef.current += 1;
          setGameState(prev => ({ ...prev, score: scoreRef.current }));
        }

        // Collision Detection
        // AABB check mainly. 
        // Bat is circle, Pipe is rect. Simple Rect vs Rect is usually enough for this gameplay
        // But let's be a bit precise: treating bat as a smaller square hitbox inside visual circle
        const hitBoxInset = 6;
        const batLeft = BAT_X - BAT_RADIUS + hitBoxInset;
        const batRight = BAT_X + BAT_RADIUS - hitBoxInset;
        const batTop = batRef.current.y - BAT_RADIUS + hitBoxInset;
        const batBottom = batRef.current.y + BAT_RADIUS - hitBoxInset;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;
        
        // Top Pipe Collision
        if (
          batRight > pipeLeft &&
          batLeft < pipeRight &&
          batTop < pipe.topHeight
        ) {
          gameOver();
        }

        // Bottom Pipe Collision
        if (
          batRight > pipeLeft &&
          batLeft < pipeRight &&
          batBottom > pipe.topHeight + PIPE_GAP
        ) {
          gameOver();
        }
      }
    }
    
    // Update Particles (runs even in Game Over for explosion effect)
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY; // Particles fall
        p.life -= 0.02;
        if(p.life <= 0) {
            particlesRef.current.splice(i, 1);
        }
    }
  }, [gameState.status, gameOver]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Background (Gradient)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0f172a'); // Slate 900
    gradient.addColorStop(1, '#312e81'); // Indigo 900
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Stars (Static for now, could be animated)
    ctx.fillStyle = '#ffffff';
    for(let i=0; i<30; i++) {
        const x = (i * 53 + frameCountRef.current * 0.2) % CANVAS_WIDTH;
        const y = (i * 127) % (CANVAS_HEIGHT / 1.5);
        ctx.globalAlpha = Math.abs(Math.sin((frameCountRef.current + i * 10) * 0.05));
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    
    // Moon
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 50, 50, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 60, 45, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';


    // Draw Pipes
    pipesRef.current.forEach(pipe => {
        // Top Pipe
        ctx.fillStyle = PIPE_COLOR;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.fillStyle = PIPE_BORDER_COLOR; // Border detail
        ctx.fillRect(pipe.x + 4, 0, PIPE_WIDTH - 8, pipe.topHeight);
        
        // Cap for top pipe
        ctx.fillStyle = PIPE_COLOR;
        ctx.fillRect(pipe.x - 2, pipe.topHeight - 20, PIPE_WIDTH + 4, 20);

        // Bottom Pipe
        const bottomPipeY = pipe.topHeight + PIPE_GAP;
        const bottomPipeHeight = CANVAS_HEIGHT - bottomPipeY;
        ctx.fillStyle = PIPE_COLOR;
        ctx.fillRect(pipe.x, bottomPipeY, PIPE_WIDTH, bottomPipeHeight);
        ctx.fillStyle = PIPE_BORDER_COLOR;
        ctx.fillRect(pipe.x + 4, bottomPipeY, PIPE_WIDTH - 8, bottomPipeHeight);

        // Cap for bottom pipe
        ctx.fillStyle = PIPE_COLOR;
        ctx.fillRect(pipe.x - 2, bottomPipeY, PIPE_WIDTH + 4, 20);
    });

    // Draw Ground strip scrolling
    const groundOffset = (frameCountRef.current * PIPE_SPEED) % 20;
    ctx.fillStyle = '#1e1b4b'; // Dark indigo ground
    ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
    
    // Draw Particles
    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw Bat (Only if not game over, or if game over draw it falling? Let's hide on explode)
    // Actually, if exploded, we hide it.
    const isExploded = gameState.status === GameStatus.GAME_OVER && particlesRef.current.length > 0;
    
    if (!isExploded) {
        ctx.save();
        ctx.translate(BAT_X, batRef.current.y);
        ctx.rotate(batRef.current.rotation);

        // Wings Animation
        // Flap speed depends on status
        const flapSpeed = 0.3;
        const wingOffset = Math.sin(batRef.current.frame * flapSpeed) * 10;

        // Draw Wings (Triangles relative to body)
        ctx.fillStyle = BAT_WING_COLOR;
        ctx.beginPath();
        // Left Wing
        ctx.moveTo(-5, 0);
        ctx.quadraticCurveTo(-20, -15 + wingOffset, -35, 5 + wingOffset); 
        ctx.quadraticCurveTo(-20, 10 + wingOffset, -5, 5);
        ctx.fill();
        
        // Right Wing
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.quadraticCurveTo(20, -15 + wingOffset, 35, 5 + wingOffset); 
        ctx.quadraticCurveTo(20, 10 + wingOffset, 5, 5);
        ctx.fill();

        // Body
        ctx.fillStyle = BAT_COLOR;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(-9, -16);
        ctx.lineTo(-2, -8);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.lineTo(9, -16);
        ctx.lineTo(2, -8);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-3, -2, 3, 0, Math.PI * 2);
        ctx.arc(3, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-3, -2, 1, 0, Math.PI * 2);
        ctx.arc(3, -2, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

  }, [gameState.status]);

  // Animation Loop setup
  useEffect(() => {
    const loop = (time: number) => {
      update(time);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) draw(ctx);
      requestRef.current = requestAnimationFrame(loop);
    };
    
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update, draw]);

  // Pause handling
  const togglePause = () => {
    if (gameState.status === GameStatus.PLAYING) {
      setGameState(prev => ({ ...prev, status: GameStatus.PAUSED }));
    } else if (gameState.status === GameStatus.PAUSED) {
      setGameState(prev => ({ ...prev, status: GameStatus.PLAYING }));
    }
  };

  const restart = () => {
      resetGame();
      setTimeout(() => {
          setGameState(prev => ({ ...prev, status: GameStatus.PLAYING }));
      }, 50); // Small delay to ensure state clears
  };

  return (
    <div className="relative w-full max-w-md mx-auto h-[100dvh] overflow-hidden bg-slate-900 shadow-2xl flex flex-col items-center justify-center">
      <div className="relative shadow-2xl rounded-xl overflow-hidden border-4 border-slate-800">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block bg-slate-900 w-full h-auto max-h-[80vh] object-contain cursor-pointer"
            onClick={jump}
            style={{
                width: '100%',
                maxWidth: '400px',
                aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`
            }}
          />
          <GameOverlay 
            status={gameState.status}
            score={gameState.score}
            highScore={gameState.highScore}
            onStart={startGame}
            onPause={togglePause}
            onResume={togglePause}
            onRestart={restart}
          />
      </div>
      
      <div className="mt-4 text-slate-500 text-sm font-spooky tracking-widest opacity-60">
        BAT FLAP
      </div>
    </div>
  );
};

export default BatGame;
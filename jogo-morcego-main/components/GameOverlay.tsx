import React from 'react';
import { GameStatus } from '../types';
import { Play, Pause, RotateCcw, Trophy } from 'lucide-react';

interface GameOverlayProps {
  status: GameStatus;
  score: number;
  highScore: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({
  status,
  score,
  highScore,
  onStart,
  onPause,
  onResume,
  onRestart,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 z-10">
      
      {/* HUD - Always visible except initial maybe */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col">
           <span className="text-white text-4xl font-bold drop-shadow-lg font-spooky tracking-widest">
             {score}
           </span>
           <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Current</span>
        </div>

        {status === GameStatus.PLAYING && (
          <button 
            onClick={onPause}
            className="p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <Pause size={24} fill="currentColor" />
          </button>
        )}
        
        {status === GameStatus.PAUSED && (
           <button 
           onClick={onResume}
           className="p-2 bg-yellow-500/90 backdrop-blur-sm rounded-full text-white hover:bg-yellow-400 transition-colors shadow-lg animate-pulse"
         >
           <Play size={24} fill="currentColor" />
         </button>
        )}
      </div>

      {/* IDLE Screen */}
      {status === GameStatus.IDLE && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-auto">
          <h1 className="text-6xl text-violet-400 font-spooky drop-shadow-[0_0_15px_rgba(167,139,250,0.5)] mb-2 animate-bounce">
            BAT FLAP
          </h1>
          <p className="text-white/80 mb-8 animate-pulse">Tap, Click or Spacebar to Fly</p>
          
          <button 
            onClick={onStart}
            className="group relative px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Play size={20} fill="currentColor" />
            <span>START GAME</span>
          </button>
        </div>
      )}

      {/* GAME OVER Screen */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300">
           <h2 className="text-5xl text-red-500 font-spooky drop-shadow-lg mb-6 transform rotate-[-2deg]">
            GAME OVER
          </h2>
          
          <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700 shadow-2xl mb-8 w-64 text-center">
            <div className="flex flex-col items-center mb-4">
              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Score</span>
              <span className="text-4xl text-white font-bold">{score}</span>
            </div>
            
            <div className="w-full h-px bg-slate-700 my-4"></div>

            <div className="flex flex-col items-center">
              <span className="text-yellow-500 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                <Trophy size={12} /> Best
              </span>
              <span className="text-2xl text-yellow-400 font-bold">{highScore}</span>
            </div>
          </div>

          <button 
            onClick={onRestart}
            className="px-8 py-3 bg-white text-slate-900 font-bold rounded-full shadow-lg hover:bg-slate-200 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <RotateCcw size={20} />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
      
      {/* Paused Text */}
      {status === GameStatus.PAUSED && (
        <div className="absolute top-1/3 text-white/80 font-bold text-2xl tracking-widest uppercase">
          Paused
        </div>
      )}

      {/* Footer / High Score display in corner */}
      {status === GameStatus.IDLE && (
         <div className="absolute bottom-6 flex items-center gap-2 text-white/50 bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
             <Trophy size={14} />
             <span className="text-sm font-semibold">High Score: {highScore}</span>
         </div>
      )}
    </div>
  );
};

export default GameOverlay;
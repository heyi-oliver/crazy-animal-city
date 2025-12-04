import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Seat, CharacterType } from './types';
import SeatComponent from './components/Seat';
import { generateGameOverMessage } from './services/geminiService';

// --- Audio Context Helpers ---
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

const playSound = (type: 'zap' | 'error' | 'start' | 'win' | 'levelUp') => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'zap') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start();
    osc.stop(now + 0.1);
  } else if (type === 'error') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start();
    osc.stop(now + 0.3);
  } else if (type === 'start') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start();
    osc.stop(now + 0.5);
  } else if (type === 'levelUp') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554, now + 0.1); // C#
    osc.frequency.setValueAtTime(659, now + 0.2); // E
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    osc.start();
    osc.stop(now + 0.6);
  } else if (type === 'win') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.2);
    osc.frequency.setValueAtTime(783.99, now + 0.4);
    osc.frequency.setValueAtTime(1046.50, now + 0.6);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.5);
    osc.start();
    osc.stop(now + 1.5);
  }
};

// --- Movie Screen Component ---
const MovieScreen = () => {
  const [sceneIndex, setSceneIndex] = useState(0);

  const scenes = [
    { 
      name: "City", 
      bg: "bg-gradient-to-t from-blue-900 via-purple-900 to-black",
      icon: "🏙️",
      text: "Zootopia"
    },
    { 
      name: "Jungle", 
      bg: "bg-gradient-to-b from-green-800 to-green-900",
      icon: "🍃",
      text: "Rainforest" 
    },
    { 
      name: "Chase", 
      bg: "bg-gradient-to-r from-red-900 to-blue-900",
      icon: "🚔",
      text: "Pursuit"
    },
    { 
      name: "Ice", 
      bg: "bg-gradient-to-tr from-cyan-900 to-white/10",
      icon: "❄️",
      text: "Tundratown"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setSceneIndex((prev) => (prev + 1) % scenes.length);
    }, 4000); // Change scene every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const currentScene = scenes[sceneIndex];

  return (
    <div className={`w-full h-full relative overflow-hidden transition-colors duration-1000 ${currentScene.bg}`}>
       {/* Simple animated content */}
       <div className="absolute inset-0 flex items-center justify-center opacity-80">
          <div className="text-6xl animate-pulse grayscale brightness-150 transform scale-150">
             {currentScene.icon}
          </div>
       </div>
       
       {/* Movie Overlay Noise */}
       <div className="absolute inset-0 bg-white opacity-5 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=")' }}></div>
       
       <div className="absolute bottom-2 left-4 text-white/50 text-xs font-mono">
         PLAYING: {currentScene.text}
       </div>
    </div>
  );
};

// --- Constants ---
const MAX_LEAK = 100;
const COLS = 5;

// Level Configuration
const LEVEL_CONFIG = [
  { 
    level: 1, 
    rows: 1, 
    targetScore: 500, 
    spawnRate: 0.02, 
    recordRate: 0.02, 
    leakMultiplier: 1.0,
    name: "第一关: 预告片" 
  },
  { 
    level: 2, 
    rows: 2, 
    targetScore: 1500, 
    spawnRate: 0.03, 
    recordRate: 0.04, 
    leakMultiplier: 1.2,
    name: "第二关: 正片开始" 
  },
  { 
    level: 3, 
    rows: 4, 
    targetScore: 5000, 
    spawnRate: 0.08, 
    recordRate: 0.12, 
    leakMultiplier: 1.5, // Reduced from 2.0 to give more time
    name: "第三关: 决战时刻" 
  }
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.IDLE,
    score: 0,
    leakLevel: 0,
    highScore: 0,
    level: 1,
  });

  const [seats, setSeats] = useState<Seat[]>([]);
  const [gameOverMsg, setGameOverMsg] = useState<string>("");
  const [feedback, setFeedback] = useState<{id: number, text: string} | null>(null);

  // Game Loop Ref
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const seatsRef = useRef(seats);
  seatsRef.current = seats;

  // --- Initialization ---
  const initSeats = (rowCount: number) => {
    const totalSeats = rowCount * COLS;
    return Array.from({ length: totalSeats }).map((_, i) => ({
      id: i,
      character: CharacterType.EMPTY,
      isOccupied: false,
      isRecording: false,
      recordingStartTimestamp: 0,
      recordingDuration: 0,
    }));
  };

  const startGame = () => {
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    playSound('start');
    
    // Start at Level 1
    const startLevel = 1;
    const config = LEVEL_CONFIG.find(l => l.level === startLevel)!;
    
    setSeats(initSeats(config.rows));
    setGameState({
      status: GameStatus.PLAYING,
      score: 0,
      leakLevel: 0,
      highScore: stateRef.current.highScore,
      level: startLevel,
    });
    setGameOverMsg("");
  };

  const nextLevel = () => {
    const nextLvl = stateRef.current.level + 1;
    const config = LEVEL_CONFIG.find(l => l.level === nextLvl);
    
    if (config) {
      playSound('start');
      setSeats(initSeats(config.rows));
      setGameState(prev => ({
        ...prev,
        level: nextLvl,
        status: GameStatus.PLAYING,
        leakLevel: Math.max(0, prev.leakLevel - 20) // Bonus heal
      }));
    } else {
      handleVictory();
    }
  };

  // --- Game Loop ---
  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;

    const tickRate = 100; // 10Hz logic update
    const interval = setInterval(() => {
      const currentLevel = stateRef.current.level;
      const config = LEVEL_CONFIG.find(l => l.level === currentLevel) || LEVEL_CONFIG[0];
      
      // Check Level Completion
      if (stateRef.current.score >= config.targetScore) {
        if (currentLevel < 3) {
          handleLevelComplete();
        } else {
          handleVictory();
        }
        return; // Skip rest of tick
      }

      setSeats(currentSeats => {
        let leakIncrease = 0;
        const newSeats = currentSeats.map(seat => {
          // Logic 1: Spawn Character if empty
          if (!seat.isOccupied) {
            if (Math.random() < config.spawnRate) {
              const types = [CharacterType.JUDY, CharacterType.NICK, CharacterType.FLASH, CharacterType.CLAWHAUSER];
              return {
                ...seat,
                isOccupied: true,
                character: types[Math.floor(Math.random() * types.length)],
                isRecording: false,
                recordingDuration: 0
              };
            }
          }

          // Logic 2: Despawn logic (only if not recording)
          if (seat.isOccupied && !seat.isRecording && Math.random() < 0.005) {
             return { ...seat, isOccupied: false, character: CharacterType.EMPTY };
          }

          // Logic 3: Start Recording
          if (seat.isOccupied && !seat.isRecording) {
            if (Math.random() < config.recordRate) {
              return { ...seat, isRecording: true, recordingStartTimestamp: Date.now(), recordingDuration: 0 };
            }
          }

          // Logic 4: Update Recording State
          if (seat.isRecording) {
            const newDuration = seat.recordingDuration + 1;
            // Base leak is 1.5, multiplied by level difficulty config
            leakIncrease += (1.5 * config.leakMultiplier); 
            return { ...seat, recordingDuration: newDuration };
          }

          return seat;
        });

        // Update Game State based on logic
        setGameState(prev => {
          const newLeak = Math.min(MAX_LEAK, prev.leakLevel + (leakIncrease * 0.1));
          
          if (newLeak >= MAX_LEAK) {
            handleGameOver(prev.score);
            return { ...prev, status: GameStatus.GAME_OVER, leakLevel: MAX_LEAK };
          }

          return {
            ...prev,
            leakLevel: newLeak,
          };
        });

        return newSeats;
      });
    }, tickRate);

    return () => clearInterval(interval);
  }, [gameState.status]);

  const handleLevelComplete = () => {
    playSound('levelUp');
    setGameState(prev => ({ ...prev, status: GameStatus.LEVEL_TRANSITION }));
    
    // Auto advance after 2 seconds
    setTimeout(() => {
       if (stateRef.current.status === GameStatus.LEVEL_TRANSITION) {
         nextLevel();
       }
    }, 2500);
  };

  const handleVictory = () => {
    playSound('win');
    setGameState(prev => ({ ...prev, status: GameStatus.VICTORY }));
  };

  const handleGameOver = async (finalScore: number) => {
    playSound('error');
    if (!gameOverMsg) {
      const msg = await generateGameOverMessage(finalScore, 0);
      setGameOverMsg(msg);
    }
  };

  // --- Interaction ---
  const handleSeatClick = useCallback((id: number) => {
    if (stateRef.current.status !== GameStatus.PLAYING) return;

    setSeats(currentSeats => {
      const seatIndex = currentSeats.findIndex(s => s.id === id);
      if (seatIndex === -1) return currentSeats;

      const seat = currentSeats[seatIndex];
      const newSeats = [...currentSeats];

      if (seat.isRecording) {
        // SUCCESS: Caught a pirate
        playSound('zap');
        newSeats[seatIndex] = {
          ...seat,
          isRecording: false,
          recordingDuration: 0,
        };

        setFeedback({ id, text: "+100" });
        setTimeout(() => setFeedback(null), 500);

        setGameState(prev => ({
          ...prev,
          score: prev.score + 100,
          leakLevel: Math.max(0, prev.leakLevel - 5) // Heal leak slightly
        }));

      } else if (seat.isOccupied) {
        // FAIL: Disturbed a regular viewer
        playSound('error');
        setFeedback({ id, text: "-50" });
        setTimeout(() => setFeedback(null), 500);

        setGameState(prev => ({
          ...prev,
          score: Math.max(0, prev.score - 50)
        }));
      }

      return newSeats;
    });
  }, []);

  // Helper to get current config
  const currentConfig = LEVEL_CONFIG.find(l => l.level === gameState.level) || LEVEL_CONFIG[0];
  const nextTarget = currentConfig.targetScore;

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center relative select-none">
      
      {/* Title Marquee */}
      <div className="w-full bg-purple-900 border-b-4 border-purple-600 p-4 text-center shadow-[0_0_20px_rgba(147,51,234,0.5)] z-20">
        <h1 className="text-xl md:text-3xl text-yellow-400 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] uppercase tracking-widest">
          疯狂动物城：防盗摄大作战
        </h1>
        <p className="text-xs md:text-sm text-purple-200 mt-2">阻止屏摄！点击没收手机！</p>
      </div>

      {/* Main Cinema Area */}
      <div className="flex-1 w-full max-w-4xl relative flex flex-col items-center justify-center p-4">
        
        {/* Movie Screen */}
        <div className="w-full max-w-2xl bg-black border-8 border-gray-800 rounded-lg mb-8 relative overflow-hidden aspect-video shadow-[0_0_50px_rgba(255,255,255,0.2)]">
          <MovieScreen />
          
          {/* Leak Meter (On Screen Overlay) */}
          <div className="absolute top-4 right-4 w-48 h-6 bg-gray-900 border-2 border-white/50 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-200 ${gameState.leakLevel > 80 ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`}
              style={{ width: `${gameState.leakLevel}%` }}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase font-bold text-white drop-shadow-md">
              泄露风险: {Math.floor(gameState.leakLevel)}%
            </span>
          </div>
        </div>

        {/* HUD */}
        <div className="w-full max-w-2xl flex justify-between items-center mb-4 px-4 text-yellow-400 font-bold text-sm md:text-base">
           <div className="flex flex-col">
             <span>分数: {gameState.score.toString().padStart(6, '0')}</span>
             <span className="text-[10px] text-gray-400">目标: {nextTarget}</span>
           </div>
           <div>{currentConfig.name}</div>
        </div>

        {/* Seats Grid Container - Centers content */}
        <div className="w-full max-w-2xl flex justify-center items-center min-h-[300px]">
          <div className="grid grid-cols-5 gap-2 md:gap-6 perspective-800 transition-all duration-500">
            {seats.map((seat) => (
              <div key={seat.id} className="relative group">
                  <SeatComponent seat={seat} onInteract={handleSeatClick} level={gameState.level} />
                  {feedback && feedback.id === seat.id && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-white font-bold text-sm animate-[bounce_0.5s_ease-out_forwards] pointer-events-none z-30 drop-shadow-md">
                      {feedback.text}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Start / Game Over Overlays */}
      {gameState.status === GameStatus.IDLE && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-6 text-center">
          <div className="bg-neutral-800 border-4 border-yellow-500 p-8 max-w-md shadow-2xl">
             <h2 className="text-2xl text-yellow-400 mb-6">安保简报</h2>
             <p className="text-sm text-gray-300 leading-6 mb-6">
               警官！首映礼马上开始了。
               <br/><br/>
               共分为 <span className="text-white">3个关卡</span>。
               <br/><br/>
               点击正在 <span className="text-cyan-400 font-bold">闪光</span> 的手机来没收。
               <br/>
               <span className="text-red-400">注意：随着电影高潮，观众会试图隐藏手机！</span>
             </p>
             <button 
               onClick={startGame}
               className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 text-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 transition-all"
             >
               开始执勤
             </button>
          </div>
        </div>
      )}

      {/* Level Transition Overlay */}
      {gameState.status === GameStatus.LEVEL_TRANSITION && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-6 text-center animate-fadeIn">
          <div className="text-4xl text-yellow-400 mb-4 animate-bounce">
            关卡完成!
          </div>
          <p className="text-white text-lg">正在前往下一放映厅...</p>
        </div>
      )}

      {/* Victory Overlay */}
      {gameState.status === GameStatus.VICTORY && (
        <div className="absolute inset-0 bg-blue-900/90 flex flex-col items-center justify-center z-50 p-6 text-center">
          <div className="bg-black border-4 border-blue-500 p-8 max-w-lg shadow-[0_0_50px_rgba(59,130,246,0.5)]">
             <h2 className="text-4xl text-blue-400 mb-6 animate-pulse">任务完成!</h2>
             <p className="text-white mb-6 text-lg">你成功守护了首映礼！</p>
             <p className="text-yellow-400 text-2xl mb-8">最终得分: {gameState.score}</p>
             <p className="text-sm text-gray-400 mb-8">牛局长非常满意，给你升职加薪了。</p>
             <button 
               onClick={startGame}
               className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 text-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
             >
               再次挑战
             </button>
          </div>
        </div>
      )}

      {gameState.status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-50 p-6 text-center">
           <div className="bg-black border-4 border-red-500 p-8 max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.5)]">
             <h2 className="text-4xl text-red-500 mb-2 animate-pulse">游戏结束</h2>
             <p className="text-white mb-6">最终分数: {gameState.score}</p>
             
             <div className="bg-gray-800 p-4 border-l-4 border-blue-500 mb-8 text-left">
                <p className="text-xs text-blue-300 mb-2">牛局长的报告:</p>
                <p className="text-sm text-white leading-5 min-h-[60px]">
                  {gameOverMsg || "正在生成报告..."}
                </p>
             </div>

             <button 
               onClick={startGame}
               className="bg-white hover:bg-gray-200 text-black font-bold py-4 px-8 text-lg border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 transition-all"
             >
               再试一次
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
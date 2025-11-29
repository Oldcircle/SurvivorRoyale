import React, { useState, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ClassType, Upgrade, Language } from './types';
import { UPGRADES, CLASS_STATS, TEXTS, SKILL_DATA } from './constants';
import { Sword, Zap, Crown, Play, Skull, Globe, Target as TargetIcon } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<'MENU' | 'GAME' | 'GAME_OVER'>('MENU');
  const [selectedClass, setSelectedClass] = useState<ClassType>(ClassType.WARRIOR);
  const [isPaused, setIsPaused] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);
  const [gameResult, setGameResult] = useState<{ win: boolean, stats?: any } | null>(null);
  const [lang, setLang] = useState<Language>('zh');

  const t = TEXTS[lang];

  const startGame = () => {
    setScreen('GAME');
    setIsPaused(false);
    setShowLevelUp(false);
    setGameResult(null);
  };

  const handleLevelUp = (level: number) => {
    setIsPaused(true);
    const player = (window as any).SurvivorGamePlayer;
    const skills = (player?.skills) || {};
    const available = UPGRADES.filter(upg => (skills[upg.id] || 0) < 3);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const options = shuffled.slice(0, 3);
    if (options.length === 0) {
      setShowLevelUp(false);
      setIsPaused(false);
      return;
    }
    setUpgradeOptions(options);
    setShowLevelUp(true);
  };

  const handleSelectUpgrade = (upgrade: Upgrade) => {
    if ((window as any).SurvivorGamePlayer) {
        upgrade.apply((window as any).SurvivorGamePlayer);
    }
    setShowLevelUp(false);
    setIsPaused(false);
  };

  const handleGameOver = (win: boolean, stats: any) => {
    setIsPaused(true);
    setGameResult({ win, stats });
    setScreen('GAME_OVER');
  };

  const handleBackToMenu = () => {
    setGameResult(null);
    setIsPaused(false);
    setShowLevelUp(false);
    setScreen('MENU');
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="relative w-full h-screen bg-[#0f172a] text-white font-['Exo_2'] overflow-hidden select-none">
      
      {/* LANGUAGE TOGGLE */}
      <div className="absolute top-6 right-6 z-[60]">
        <button 
          onClick={toggleLanguage}
          className="bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md text-cyan-400 border border-slate-600 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg transition-all hover:scale-105 cursor-pointer"
        >
          <Globe size={16} />
          {lang === 'en' ? '中文' : 'English'}
        </button>
      </div>

      {/* MENU SCREEN */}
      {screen === 'MENU' && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black">
          
          <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.05)_1px,transparent_1px)] bg-[size:50px_50px] opacity-50 pointer-events-none"></div>

          <div className="relative z-10 bg-slate-900/60 p-12 rounded-3xl border border-slate-700 backdrop-blur-xl max-w-5xl w-full text-center shadow-2xl animate-in fade-in zoom-in duration-500">
            <h1 className="text-8xl font-black mb-2 italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-600 drop-shadow-lg">
              {t.title}
            </h1>
            <p className="text-slate-400 mb-12 text-xl tracking-[0.2em] uppercase font-bold">{t.subtitle}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {[ClassType.WARRIOR, ClassType.MAGE, ClassType.RANGER].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-6 overflow-hidden cursor-pointer ${
                    selectedClass === c 
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_30px_rgba(34,211,238,0.2)] scale-105 ring-1 ring-cyan-400/50' 
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className={`p-5 rounded-full bg-slate-950 border border-slate-800 ${selectedClass === c ? 'shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]' : ''}`}>
                    {c === ClassType.WARRIOR && <Sword size={40} className="text-red-500" />}
                    {c === ClassType.MAGE && <Zap size={40} className="text-blue-500" />}
                    {c === ClassType.RANGER && <TargetIcon size={40} className="text-green-500" />}
                  </div>
                  <div>
                      <div className="font-black text-2xl tracking-wide text-slate-200 group-hover:text-white transition-colors uppercase">{c}</div>
                      <div className="text-sm text-slate-400 mt-2 font-medium">{CLASS_STATS[c].desc[lang]}</div>
                  </div>
                  {selectedClass === c && (
                      <div className="absolute top-4 right-4 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan]"></div>
                  )}
                </button>
              ))}
            </div>

            <button 
              onClick={startGame}
              className="w-full py-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-3xl rounded-2xl shadow-[0_10px_40px_rgba(8,145,178,0.4)] transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-4 tracking-widest uppercase border-t border-cyan-400/30 cursor-pointer"
            >
              <Play fill="currentColor" size={32} /> {t.enterBattle}
            </button>
          </div>
        </div>
      )}

      {/* GAME SCREEN (Running or Paused in Background) */}
      {(screen === 'GAME' || screen === 'GAME_OVER') && (
        <div className="absolute inset-0 w-full h-full z-0">
           <GameCanvas 
             selectedClass={selectedClass} 
             onLevelUp={handleLevelUp}
             onGameOver={handleGameOver}
             isPaused={isPaused}
             language={lang}
             upgradeQueue={0}
           />
           
           {/* Level Up Modal */}
           {showLevelUp && (
             <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-slate-900 border-2 border-yellow-500/50 p-10 rounded-3xl max-w-6xl w-full mx-8 shadow-[0_0_100px_rgba(234,179,8,0.15)] relative overflow-hidden">
                 
                 <div className="absolute -top-20 -right-20 w-60 h-60 bg-yellow-500/20 blur-[100px] rounded-full pointer-events-none"></div>

                 <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 text-center mb-10 tracking-widest uppercase drop-shadow-sm">{t.levelUp}</h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {upgradeOptions.map((upg) => (
                    <button
                      key={upg.id}
                      onClick={() => handleSelectUpgrade(upg)}
                      className="group relative p-8 bg-slate-800 border border-slate-700 rounded-2xl hover:border-yellow-400 hover:bg-slate-800/80 hover:-translate-y-2 transition-all duration-300 text-left flex flex-col h-full shadow-lg cursor-pointer"
                      style={{ boxShadow: `0 0 40px ${(SKILL_DATA as any)[upg.id]?.color || '#f59e0b'}22` }}
                    >
                      <div className="flex justify-between items-start mb-6">
                          <div className={`text-xs font-black px-3 py-1 rounded-md uppercase tracking-wider ${
                            upg.rarity === 'LEGENDARY' ? 'bg-orange-500 text-black shadow-orange-500/50 shadow-lg' :
                            upg.rarity === 'EPIC' ? 'bg-purple-600 text-white shadow-purple-500/50 shadow-lg' :
                            upg.rarity === 'RARE' ? 'bg-blue-600 text-white shadow-blue-500/50 shadow-lg' : 'bg-slate-600 text-slate-200'
                          }`}>
                            {upg.rarity}
                          </div>
                          <div className="ml-3 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-inner" style={{ color: (SKILL_DATA as any)[upg.id]?.color || '#f59e0b' }}>
                            {upg.type === 'WEAPON' && <Zap size={20} />}
                            {upg.type === 'ACTIVE' && <Play size={20} />}
                            {upg.type === 'PASSIVE' && <Crown size={20} />}
                          </div>
                      </div>
                       
                       <h3 className="text-2xl font-bold mb-2 text-slate-100 group-hover:text-yellow-300 transition-colors">{upg.name[lang]}</h3>
                       <div className="mb-3 text-sm font-bold text-yellow-400">
                         Lv {(window as any).SurvivorGamePlayer?.skills?.[upg.id] || 0}/3
                       </div>
                       <div className="h-2 w-full bg-slate-700 rounded-sm mb-4 overflow-hidden">
                         <div className="h-full" style={{ background: `linear-gradient(90deg, ${(SKILL_DATA as any)[upg.id]?.color || '#f59e0b'} 0%, #fde047 100%)`, width: `${Math.min(100, (((window as any).SurvivorGamePlayer?.skills?.[upg.id] || 0)/3)*100)}%` }}></div>
                       </div>
                       <p className="text-slate-400 text-base leading-relaxed">{upg.description[lang]}</p>
                       
                       <div className="absolute inset-0 rounded-2xl border-2 border-yellow-400/0 group-hover:border-yellow-400/50 transition-all pointer-events-none"></div>
                       <div className="absolute -inset-0 rounded-2xl opacity-0 group-hover:opacity-30 blur-2xl" style={{ background: `radial-gradient(circle at center, ${(SKILL_DATA as any)[upg.id]?.color || '#f59e0b'}33, transparent 60%)` }}></div>
                    </button>
                  ))}
                 </div>
               </div>
             </div>
           )}
        </div>
      )}

      {/* GAME OVER SCREEN (Overlay) */}
      {screen === 'GAME_OVER' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center p-20 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl animate-in zoom-in duration-300 max-w-3xl w-full relative overflow-hidden">
            
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_70%)] pointer-events-none"></div>

            <div className="relative z-10">
                {gameResult?.win ? (
                <div className="relative inline-block mb-10">
                    <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-30 animate-pulse"></div>
                    <Crown size={120} className="text-yellow-400 relative z-10 drop-shadow-2xl" />
                </div>
                ) : (
                <div className="relative inline-block mb-10">
                    <div className="absolute inset-0 bg-red-600 blur-3xl opacity-30"></div>
                    <Skull size={120} className="text-red-500 relative z-10 drop-shadow-2xl" />
                </div>
                )}
                
                <h1 className={`text-7xl font-black mb-6 uppercase tracking-tighter ${gameResult?.win ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600' : 'text-red-500'}`}>
                {gameResult?.win ? t.victory : t.eliminated}
                </h1>
                
                <p className="text-2xl text-slate-400 mb-12 font-medium">
                {gameResult?.win ? t.victoryMsg : t.eliminatedMsg}
                </p>

                <div className="grid grid-cols-2 gap-8 text-left bg-slate-950 p-8 rounded-2xl border border-slate-800 mb-12">
                <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-xl">
                    <div className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-2">{t.levelReached}</div>
                    <div className="text-5xl font-black text-white">{gameResult?.stats?.level || 1}</div>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-xl">
                    <div className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-2">{t.zoneStatus}</div>
                    <div className="text-3xl font-bold text-red-500 uppercase">{t.closed}</div>
                </div>
                </div>

                <button 
                onClick={handleBackToMenu}
                className="relative z-10 px-12 py-5 bg-slate-100 hover:bg-white text-slate-900 font-black text-xl rounded-full shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all uppercase tracking-widest cursor-pointer"
                >
                {t.backMenu}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

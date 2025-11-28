
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Entity, EntityType, Vector, Bullet, GameState, ClassType, Language } from '../types';
import { MAP_SIZE, INITIAL_ZONE_RADIUS, ZONE_SHRINK_SPEED, ZONE_DAMAGE_PER_SEC, CLASS_STATS, COLOR_PALETTE, BOT_NAMES, TEXTS, REGEN_DELAY, REGEN_RATE_PERCENT, SKILL_DATA } from '../constants';
import { Trophy, Skull, Target, Zap, Shield as ShieldIcon, User } from 'lucide-react';

const getDistance = (v1: Vector, v2: Vector) => Math.hypot(v2.x - v1.x, v2.y - v1.y);
const normalize = (v: Vector): Vector => {
  const mag = Math.hypot(v.x, v.y);
  return mag === 0 ? { x: 0, y: 0 } : { x: v.x / mag, y: v.y / mag };
};
const addVectors = (v1: Vector, v2: Vector): Vector => ({ x: v1.x + v2.x, y: v1.y + v2.y });
const scaleVector = (v: Vector, s: number): Vector => ({ x: v.x * s, y: v.y * s });

interface GameCanvasProps {
  selectedClass: ClassType;
  onLevelUp: (currentLevel: number) => void;
  onGameOver: (didWin: boolean, stats: any) => void;
  isPaused: boolean;
  language: Language;
  upgradeQueue: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  selectedClass, 
  onLevelUp, 
  onGameOver, 
  isPaused,
  language
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef<Vector>({ x: 0, y: 0 });
  
  const gameState = useRef<GameState>({
    isPlaying: true,
    isPaused: false,
    isGameOver: false,
    winnerId: null,
    gameTime: 0,
    zoneRadius: INITIAL_ZONE_RADIUS,
    mapWidth: MAP_SIZE,
    mapHeight: MAP_SIZE,
  });

  const entities = useRef<Entity[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<any[]>([]);
  const playerRef = useRef<Entity | null>(null);
  const keys = useRef<{ [key: string]: boolean }>({});

  const [hudState, setHudState] = useState({
    hp: 100,
    maxHp: 100,
    shield: 0,
    maxShield: 0,
    level: 1,
    exp: 0,
    expNext: 100,
    aliveCount: 0,
    time: 0,
    dashCD: 0,
    dashMaxCD: 6,
    skillCD: 0,
    skillMaxCD: 15,
    hasDash: false,
    hasSkill: false
  });

  const t = TEXTS[language];

  const initGame = useCallback(() => {
    entities.current = [];
    bullets.current = [];
    particles.current = [];
    gameState.current.gameTime = 0;
    gameState.current.zoneRadius = INITIAL_ZONE_RADIUS;
    gameState.current.isGameOver = false;

    const startPos = { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
    const stats = CLASS_STATS[selectedClass];
    
    const player: Entity = {
      id: 'player',
      type: EntityType.PLAYER,
      pos: { ...startPos },
      vel: { x: 0, y: 0 },
      radius: 18, 
      color: stats.color,
      hp: stats.hp,
      maxHp: stats.hp,
      dead: false,
      damage: stats.damage,
      cooldown: 0,
      maxCooldown: stats.cooldown,
      range: stats.range,
      speed: stats.speed,
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      projectileCount: stats.projectileCount,
      piercing: 0,
      name: language === 'zh' ? '你' : 'YOU',
      lastCombatTime: -10,
      skills: {},
      skillCDs: {},
      armor: 0,
      flatDamageReduction: 0,
      lifesteal: 0,
      magnet: 100,
      xpMult: 1.0,
      areaScale: 1.0,
      regen: 0,
      critRate: 0.05,
      critDamage: 1.5,
      invulnerableUntil: 0,
      shield: 0,
      maxShield: 0
    };
    
    playerRef.current = player;
    entities.current.push(player);

    (window as any).SurvivorGamePlayer = player;

    for (let i = 0; i < 14; i++) {
      const botClass = Object.values(ClassType)[Math.floor(Math.random() * 3)];
      const botStats = CLASS_STATS[botClass];
      const angle = Math.random() * Math.PI * 2;
      const dist = 800 + Math.random() * 1200; 
      
      entities.current.push({
        ...player,
        id: `bot_${i}`,
        type: EntityType.BOT,
        pos: { x: MAP_SIZE/2 + Math.cos(angle)*dist, y: MAP_SIZE/2 + Math.sin(angle)*dist },
        color: botStats.color,
        hp: botStats.hp,
        maxHp: botStats.hp,
        damage: botStats.damage,
        range: botStats.range,
        maxCooldown: botStats.cooldown,
        speed: botStats.speed * 0.95,
        name: BOT_NAMES[i % BOT_NAMES.length],
        lastCombatTime: -10,
        skills: {},
        skillCDs: {}
      });
    }
  }, [selectedClass, language]);

  const spawnExpGem = (pos: Vector, expValue: number) => {
    entities.current.push({
      id: `gem_${Math.random()}`,
      type: EntityType.EXP_GEM,
      pos: { ...pos },
      vel: { x: 0, y: 0 },
      radius: 8,
      color: COLOR_PALETTE.xpBar,
      hp: 1,
      maxHp: 1,
      dead: false,
      damage: 0,
      cooldown: 0,
      maxCooldown: 0,
      range: 0,
      speed: 0,
      level: 0,
      exp: expValue,
      expToNextLevel: 0,
      projectileCount: 0,
      piercing: 0,
      lastCombatTime: 0,
      skills: {},
      skillCDs: {},
      armor: 0,
      flatDamageReduction: 0,
      lifesteal: 0,
      magnet: 0,
      xpMult: 0,
      areaScale: 1,
      regen: 0,
      critRate: 0,
      critDamage: 0,
      invulnerableUntil: 0,
      shield: 0,
      maxShield: 0
    });
  };

  const spawnEnemy = (dt: number) => {
    if (gameState.current.isPaused) return;
    
    const baseSpawnRate = 0.8;
    const timeFactor = 1 + (gameState.current.gameTime / 120); 
    const spawnChance = (dt / baseSpawnRate) * timeFactor;
    
    if (Math.random() < spawnChance) {
      const livingPlayers = entities.current.filter(e => !e.dead && (e.type === EntityType.PLAYER || e.type === EntityType.BOT));
      if (livingPlayers.length === 0) return;
      
      const target = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 600 + Math.random() * 200;
      const pos = {
        x: target.pos.x + Math.cos(angle) * dist,
        y: target.pos.y + Math.sin(angle) * dist
      };
      
      pos.x = Math.max(50, Math.min(MAP_SIZE-50, pos.x));
      pos.y = Math.max(50, Math.min(MAP_SIZE-50, pos.y));
      
      const isElite = Math.random() < (0.05 * timeFactor);
      
      entities.current.push({
        id: `enemy_${Math.random()}`,
        type: EntityType.ENEMY,
        pos,
        vel: { x: 0, y: 0 },
        radius: isElite ? 24 : 16,
        color: isElite ? COLOR_PALETTE.enemyElite : COLOR_PALETTE.enemyBody,
        hp: isElite ? 400 * timeFactor : 50 * timeFactor,
        maxHp: isElite ? 400 : 50,
        dead: false,
        damage: isElite ? 25 : 12,
        cooldown: 0,
        maxCooldown: 1,
        range: 30,
        speed: isElite ? 100 : 80,
        level: 1,
        exp: isElite ? 100 : 20,
        expToNextLevel: 0,
        projectileCount: 0,
        piercing: 0,
        lastCombatTime: 0,
        skills: {},
        skillCDs: {},
        armor: 0,
        flatDamageReduction: 0,
        lifesteal: 0,
        magnet: 0,
        xpMult: 0,
        areaScale: 1,
        regen: 0,
        critRate: 0,
        critDamage: 0,
        invulnerableUntil: 0,
        shield: 0,
        maxShield: 0
      });
    }
  };

  const findNearestTarget = (source: Entity, targets: Entity[], maxDist?: number): Entity | null => {
    let nearest: Entity | null = null;
    let minDist = maxDist || (source.range + 200);
    
    for (const t of targets) {
      if (t.dead || t.id === source.id) continue;
      const d = getDistance(source.pos, t.pos);
      if (d < minDist) {
        minDist = d;
        nearest = t;
      }
    }
    return nearest;
  };

  const calculateDamage = (attacker: Entity, baseDmg: number) => {
    let dmg = baseDmg;
    dmg *= (attacker.damage / 30); 
    const isCrit = Math.random() < attacker.critRate;
    if (isCrit) {
        dmg *= attacker.critDamage;
    }
    return { amount: Math.floor(dmg), isCrit };
  };

  const handleKill = (killer: Entity, victim: Entity) => {
      victim.dead = true;
      spawnExpGem(victim.pos, victim.exp);
      
      for(let k=0; k<5; k++) {
         const angle = Math.random() * Math.PI * 2;
         const speed = Math.random() * 100;
         particles.current.push({
             type: 'PARTICLE',
             x: victim.pos.x, y: victim.pos.y,
             vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
             life: 0.5 + Math.random() * 0.5,
             color: victim.color,
             size: Math.random() * 4 + 2
         });
      }

      if (killer.lifesteal > 0 && killer.hp < killer.maxHp) {
          killer.hp = Math.min(killer.maxHp, killer.hp + (killer.lifesteal * victim.maxHp * 0.1) + 1); 
          particles.current.push({ x: killer.pos.x, y: killer.pos.y - 30, text: `+${Math.ceil(killer.lifesteal * 10)}`, life: 0.8, vy: -50, color: COLOR_PALETTE.textHeal, isHeal: true });
      }
  };

  const applyDamage = (target: Entity, amount: number, attacker?: Entity, isCrit: boolean = false) => {
    if (target.invulnerableUntil > gameState.current.gameTime) return;

    let finalAmount = amount;
    finalAmount *= (1 - target.armor);
    finalAmount = Math.max(1, finalAmount - target.flatDamageReduction);

    if (target.shield > 0) {
        if (target.shield >= finalAmount) {
            target.shield -= finalAmount;
            finalAmount = 0;
            particles.current.push({ type: 'RING', x: target.pos.x, y: target.pos.y, radius: 20, life: 0.2, color: '#60a5fa' });
        } else {
            finalAmount -= target.shield;
            target.shield = 0;
        }
    }

    if (finalAmount > 0) {
        target.hp -= finalAmount;
        target.lastCombatTime = gameState.current.gameTime;
    }
    
    // Improved Floating Text Physics
    // Random offset to prevent clumping
    const offsetX = (Math.random() - 0.5) * 20;
    const color = isCrit ? COLOR_PALETTE.textCrit : (finalAmount === 0 ? '#60a5fa' : COLOR_PALETTE.textDamage);
    const fontSize = isCrit ? 24 : 14;
    
    particles.current.push({ 
        x: target.pos.x + offsetX, 
        y: target.pos.y - 20, 
        text: Math.floor(finalAmount).toString(), 
        life: 0.8, 
        vy: -80, // Shoot up fast
        vx: offsetX * 2, // Drift sideways
        color,
        fontSize,
        isCrit
    });

    if (target.hp <= 0 && !target.dead) {
        handleKill(attacker || target, target);
    }
  };

  const createBullet = (owner: Entity, data: any, overrides: Partial<Bullet> = {}): Bullet => {
    const vel = overrides.vel || { x: 0, y: 0 };
    const { amount } = calculateDamage(owner, data.damageBase + (data.damageLevel * (owner.skills[data.id] || 0)));
    
    return {
      id: `bullet_${Math.random()}_${Date.now()}`,
      type: EntityType.BULLET,
      pos: { ...owner.pos },
      vel: vel,
      radius: (data.radius || 5) * owner.areaScale,
      color: data.color,
      hp: 1, maxHp: 1, dead: false, damage: amount, cooldown: 0, maxCooldown: 0, range: 0, speed: data.speed || 0, level: 0, exp: 0, expToNextLevel: 0, projectileCount: 0, piercing: owner.piercing, ownerId: owner.id, lifeTime: data.duration || 2.0, pierceCount: overrides.pierceCount ?? (owner.piercing), lastCombatTime: 0, skills: {}, skillCDs: {}, armor: 0, flatDamageReduction: 0, lifesteal: 0, magnet: 0, xpMult: 0, areaScale: 1, regen: 0, critRate: 0, critDamage: 0, invulnerableUntil: 0, shield: 0, maxShield: 0,
      visualType: data.visualType || 'DEFAULT',
      ...overrides
    };
  };

  const activateSkill = (e: Entity, skillId: string) => {
      const data = SKILL_DATA[skillId as keyof typeof SKILL_DATA] as any;
      if (!data) return;
      const level = e.skills[skillId] || 1;

      switch (skillId) {
          case 'active_void_dash': {
              let dir = { x: 0, y: 0 };
              if (e.id === 'player') {
                  if (keys.current['w'] || keys.current['a'] || keys.current['s'] || keys.current['d']) {
                     dir = normalize(e.vel);
                  } else {
                     dir = normalize({ x: mousePos.current.x + (gameState.current.mapWidth/2 - e.pos.x) - window.innerWidth/2, y: mousePos.current.y + (gameState.current.mapHeight/2 - e.pos.y) - window.innerHeight/2 });
                  }
              } else {
                  dir = normalize(e.vel);
              }
              if (dir.x === 0 && dir.y === 0) dir = { x: 1, y: 0 }; 

              e.pos.x += dir.x * data.dist;
              e.pos.y += dir.y * data.dist;
              e.invulnerableUntil = gameState.current.gameTime + data.invulnDuration;
              particles.current.push({ type: 'RING', x: e.pos.x, y: e.pos.y, radius: 30, life: 0.4, color: data.color });
              break;
          }
          case 'active_meteor_shower': {
             const count = data.count[Math.min(level-1, data.count.length-1)];
             const center = e.targetId ? entities.current.find(t => t.id === e.targetId)?.pos || e.pos : e.pos;
             for(let i=0; i<count; i++) {
                 const angle = Math.random() * Math.PI * 2;
                 const dist = Math.random() * data.radius;
                 const dropPos = { x: center.x + Math.cos(angle)*dist, y: center.y + Math.sin(angle)*dist };
                 bullets.current.push(createBullet(e, data, {
                    pos: dropPos, vel: {x:0, y:0}, delayedExplosion: true, lifeTime: data.delay + Math.random() * 0.5, explodeRadius: data.aoe, radius: data.aoe, color: '#f97316'
                 }));
             }
             break;
          }
          case 'active_holy_barrier': {
             e.maxShield = Math.floor(e.maxHp * (data.shieldPct + (level * data.shieldLevel)));
             e.shield = e.maxShield;
             bullets.current.push(createBullet(e, data, {
                 isOrbit: true, orbitDist: 0, orbitSpeed: 0, lifeTime: data.duration, radius: data.radius, isWave: true 
             }));
             break;
          }
      }
      let cd = data.cooldown + (level * (data.cooldownLevel || 0));
      e.skillCDs[skillId] = Math.max(0.5, cd);
  };

  const processSkills = (e: Entity, dt: number) => {
    Object.entries(e.skills).forEach(([skillId, level]) => {
      if (e.skillCDs[skillId] === undefined) e.skillCDs[skillId] = 0;
      if (e.skillCDs[skillId] > 0) e.skillCDs[skillId] -= dt;

      const data = SKILL_DATA[skillId as keyof typeof SKILL_DATA] as any;
      if (!data) return;
      
      if (skillId === 'summon_dragon_scion') {
          const pet = entities.current.find(ent => ent.type === EntityType.PET && ent.ownerId === e.id);
          if (!pet) {
              entities.current.push({
                  id: `dragon_${e.id}_${Math.random()}`, type: EntityType.PET, ownerId: e.id, pos: { x: e.pos.x - 30, y: e.pos.y - 30 }, vel: { x: 0, y: 0 }, radius: 12, color: data.color, hp: 1000, maxHp: 1000, dead: false, damage: data.damageBase + (data.damageLevel * level), cooldown: 0, maxCooldown: data.attackCooldown + (data.attackCooldownLevel * level), range: data.range, speed: 160, level: level, exp: 0, expToNextLevel: 0, projectileCount: 1, piercing: 0, lastCombatTime: 0, skills: {}, skillCDs: {}, armor: 0, flatDamageReduction: 0, lifesteal: 0, magnet: 0, xpMult: 0, areaScale: 1, regen: 0, critRate: e.critRate, critDamage: e.critDamage, invulnerableUntil: 0, shield: 0, maxShield: 0, name: 'Draco'
              });
          }
          return;
      }

      if (skillId.startsWith('weapon_') && e.skillCDs[skillId] <= 0) {
          const targets = entities.current.filter(t => t.id !== e.id && !t.dead && ((e.type === EntityType.PLAYER && (t.type === EntityType.ENEMY || t.type === EntityType.BOT)) || (e.type === EntityType.BOT && (t.type !== EntityType.EXP_GEM && t.id !== e.id))));
          let triggered = false;
          switch (skillId) {
             case 'weapon_whirling_blades': {
                 const existing = bullets.current.filter(b => b.ownerId === e.id && b.isOrbit && b.color === data.color);
                 const count = data.projectileCount[Math.min(level-1, 4)];
                 if (existing.length < count) {
                     for(let i=existing.length; i<count; i++) {
                         bullets.current.push(createBullet(e, data, {
                             isOrbit: true, orbitDist: data.orbitRadius[Math.min(level-1, 4)], orbitSpeed: 360 / data.rotationTime * (Math.PI/180), orbitAngle: (Math.PI * 2 / count) * i, lifeTime: 9999, pierceCount: 999
                         }));
                     }
                 }
                 break;
             }
             case 'weapon_arcane_orbs': {
                 const count = data.count[Math.min(level-1, 4)];
                 for(let i=0; i<count; i++) {
                     const target = findNearestTarget(e, targets, 800);
                     if (target) {
                         bullets.current.push(createBullet(e, data, { isHoming: true, homingTargetId: target.id, turnSpeed: 4 }));
                         triggered = true;
                     }
                 }
                 break;
             }
             case 'weapon_chain_lightning': {
                 const target = findNearestTarget(e, targets, 600);
                 if (target) {
                     applyDamage(target, calculateDamage(e, data.damageBase + data.damageLevel * level).amount, e);
                     particles.current.push({ type: 'LIGHTNING', x1: e.pos.x, y1: e.pos.y, x2: target.pos.x, y2: target.pos.y, life: 0.2, color: data.color });
                     let cur = target;
                     let jumps = data.jumps[Math.min(level-1, 4)];
                     let dmgMult = 1.0;
                     const hitList = [target.id];
                     for(let j=0; j<jumps; j++) {
                         const nextTarget = entities.current.find(n => !n.dead && n.type === EntityType.ENEMY && !hitList.includes(n.id) && getDistance(cur.pos, n.pos) < data.jumpRadius);
                         if (nextTarget) {
                             dmgMult *= data.decay;
                             applyDamage(nextTarget, Math.floor(calculateDamage(e, data.damageBase).amount * dmgMult), e);
                             particles.current.push({ type: 'LIGHTNING', x1: cur.pos.x, y1: cur.pos.y, x2: nextTarget.pos.x, y2: nextTarget.pos.y, life: 0.2, color: data.color });
                             hitList.push(nextTarget.id);
                             cur = nextTarget;
                         } else break;
                     }
                     triggered = true;
                 }
                 break;
             }
             case 'weapon_bone_spear': {
                 const target = findNearestTarget(e, targets, 800);
                 const angle = target ? Math.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x) : Math.atan2(e.vel.y, e.vel.x) || 0;
                 bullets.current.push(createBullet(e, data, { vel: { x: Math.cos(angle)*data.speed, y: Math.sin(angle)*data.speed }, pierceCount: data.pierce[Math.min(level-1, 4)], lifeTime: 3.0 }));
                 triggered = true;
                 break;
             }
          }
          if (triggered) e.skillCDs[skillId] = data.cooldown + (data.cooldownLevel || 0) * level;
      }
    });
  };

  const calculateBotAI = (bot: Entity, dt: number) => {
    const center = { x: MAP_SIZE/2, y: MAP_SIZE/2 };
    const distToCenter = getDistance(bot.pos, center);
    let moveVec = { x: 0, y: 0 };

    // 1. Zone Safety (Highest Priority)
    if (distToCenter > gameState.current.zoneRadius * 0.98) {
       const toCenter = normalize({ x: center.x - bot.pos.x, y: center.y - bot.pos.y });
       bot.vel = { x: toCenter.x * bot.speed, y: toCenter.y * bot.speed };
       return; 
    } else if (distToCenter > gameState.current.zoneRadius * 0.85) {
       const toCenter = normalize({ x: center.x - bot.pos.x, y: center.y - bot.pos.y });
       moveVec = addVectors(moveVec, scaleVector(toCenter, 3.0));
    }

    const viewDist = 600;
    const nearby = entities.current.filter(e => !e.dead && e.id !== bot.id && getDistance(bot.pos, e.pos) < viewDist);
    const bulletsNear = nearby.filter(e => e.type === EntityType.BULLET && (e as Bullet).ownerId !== bot.id);
    const enemiesNear = nearby.filter(e => e.type === EntityType.ENEMY);
    const gemsNear = nearby.filter(e => e.type === EntityType.EXP_GEM);
    const rivalsNear = nearby.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.BOT);
    
    const isSwarmed = enemiesNear.length > 3;
    const hpRatio = bot.hp / bot.maxHp;
    // Survival mode: Low HP or swarmed
    const survivalMode = hpRatio < 0.4 || (isSwarmed && hpRatio < 0.6); 

    // 2. Bullet Evasion (High Priority)
    bulletsNear.forEach(b => {
        const d = getDistance(bot.pos, b.pos);
        if (d < 150) {
            const away = normalize({ x: bot.pos.x - b.pos.x, y: bot.pos.y - b.pos.y });
            const urgency = (150 - d) / 150;
            moveVec = addVectors(moveVec, scaleVector(away, 8.0 * urgency));
            if (urgency > 0.7 && bot.skills['active_void_dash'] && (bot.skillCDs['active_void_dash'] || 0) <= 0) activateSkill(bot, 'active_void_dash');
        }
    });

    // 3. Enemy Spacing (Don't get stuck)
    enemiesNear.forEach(e => {
        const d = getDistance(bot.pos, e.pos);
        const safeDist = survivalMode ? 450 : 200;
        if (d < safeDist) {
            const away = normalize({ x: bot.pos.x - e.pos.x, y: bot.pos.y - e.pos.y });
            const urgency = (safeDist - d) / safeDist;
            moveVec = addVectors(moveVec, scaleVector(away, (survivalMode ? 12.0 : 8.0) * urgency));
        }
    });
    
    // 4. Farming Logic vs PvP Logic
    const isFarmingPhase = bot.level < 8; // AI prioritizes farming until level 8

    // If farming or surviving, avoid PVP with healthy rivals
    if (isFarmingPhase || survivalMode) {
        rivalsNear.forEach(r => {
             const d = getDistance(bot.pos, r.pos);
             // Avoid if rival is stronger/healthy
             if (d < 600 && r.hp > r.maxHp * 0.2) {
                 const away = normalize({ x: bot.pos.x - r.pos.x, y: bot.pos.y - r.pos.y });
                 moveVec = addVectors(moveVec, scaleVector(away, 8.0));
             }
        });
    }

    // Gem Collection
    // Higher greed if farming phase or high HP
    const greedBase = isFarmingPhase ? 10.0 : 2.0; 
    const greed = (greedBase + (hpRatio * 2.0)) * (isSwarmed ? 0.2 : 1.0); 

    if (gemsNear.length > 0) {
        let closestGem: Entity | null = null;
        let minGemDist = Infinity;
        for (const g of gemsNear) {
            const d = getDistance(bot.pos, g.pos);
            if (d < minGemDist) { minGemDist = d; closestGem = g; }
        }
        if (closestGem) {
            const toGem = normalize({ x: closestGem.pos.x - bot.pos.x, y: closestGem.pos.y - bot.pos.y });
            moveVec = addVectors(moveVec, scaleVector(toGem, greed));
        }
    }

    // 5. Targeting & Attacking
    if (!survivalMode) {
        let target: Entity | null = null;

        // PvP Opportunity: Only if rival is very low HP
        const killableRival = rivalsNear.find(r => r.hp < r.maxHp * 0.25);
        
        if (killableRival && (!isFarmingPhase || getDistance(bot.pos, killableRival.pos) < 300)) {
            target = killableRival;
        } else if (!isFarmingPhase) {
            // Late game: Aggressively hunt nearest rival
            let minRivalDist = Infinity;
            rivalsNear.forEach(r => {
                 const d = getDistance(bot.pos, r.pos);
                 if (d < minRivalDist) { minRivalDist = d; target = r; }
            });
        }

        // Farm Mobs: If no rival target (or we are farming), target nearest mob for XP
        if (!target) {
            let minEnemyDist = Infinity;
            enemiesNear.forEach(e => {
                 const d = getDistance(bot.pos, e.pos);
                 if (d < minEnemyDist) { minEnemyDist = d; target = e; }
            });
        }

        if (target) {
            bot.targetId = target.id; 
            const d = getDistance(bot.pos, target.pos);
            const toTarget = normalize({ x: target.pos.x - bot.pos.x, y: target.pos.y - bot.pos.y });
            
            // Kiting / Chasing
            const idealRange = bot.range * 0.85;
            
            if (d > idealRange) {
                moveVec = addVectors(moveVec, scaleVector(toTarget, 2.0));
            } else if (d < idealRange - 100) {
                moveVec = addVectors(moveVec, scaleVector(toTarget, -1.5));
            } else {
                const strafe = { x: -toTarget.y, y: toTarget.x };
                const strafeDir = (Date.now() % 2000 > 1000) ? 1 : -1;
                moveVec = addVectors(moveVec, scaleVector(strafe, 2.0 * strafeDir));
            }

            if (bot.skills['active_meteor_shower'] && (bot.skillCDs['active_meteor_shower']||0) <= 0) activateSkill(bot, 'active_meteor_shower');
        }
    }

    // Defensive Skills
    if (hpRatio < 0.6 && bot.skills['active_holy_barrier'] && (bot.skillCDs['active_holy_barrier']||0) <= 0) activateSkill(bot, 'active_holy_barrier');

    const finalDir = normalize(moveVec);
    if (moveVec.x === 0 && moveVec.y === 0) {
        bot.vel = { x: bot.vel.x * 0.9, y: bot.vel.y * 0.9 };
    } else {
        bot.vel = { x: finalDir.x * bot.speed, y: finalDir.y * bot.speed };
    }
  };

  const fireBullet = (source: Entity, target: Entity) => {
    source.lastCombatTime = gameState.current.gameTime;
    const dir = normalize({ x: target.pos.x - source.pos.x, y: target.pos.y - source.pos.y });
    const count = source.projectileCount || 1;
    const spread = 0.2;
    const startAngle = -((count - 1) * spread) / 2;
    const baseAngle = Math.atan2(dir.y, dir.x);
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + startAngle + (i * spread);
      const vel = { x: Math.cos(angle) * 600, y: Math.sin(angle) * 600 };
      const { amount } = calculateDamage(source, source.damage);
      bullets.current.push({
        id: `bullet_${Math.random()}_${Date.now()}`, type: EntityType.BULLET, pos: { ...source.pos }, vel: vel, radius: 4 * source.areaScale, color: source.color, hp: 1, maxHp: 1, dead: false, damage: amount, cooldown: 0, maxCooldown: 0, range: 0, speed: 0, level: 0, exp: 0, expToNextLevel: 0, projectileCount: 0, piercing: source.piercing, ownerId: source.id, lifeTime: 1.5, pierceCount: source.piercing, lastCombatTime: 0, skills: {}, skillCDs: {}, armor: 0, flatDamageReduction: 0, lifesteal: 0, magnet: 0, xpMult: 0, areaScale: 1, regen: 0, critRate: 0, critDamage: 0, invulnerableUntil: 0, shield: 0, maxShield: 0,
        visualType: 'DEFAULT'
      });
    }
  };

  const updateEntityPhysics = (dt: number, e: Entity) => {
    e.pos.x += e.vel.x * dt;
    e.pos.y += e.vel.y * dt;
    if (e.pos.x < 0) { e.pos.x = 0; e.vel.x = 0; }
    if (e.pos.x > MAP_SIZE) { e.pos.x = MAP_SIZE; e.vel.x = 0; }
    if (e.pos.y < 0) { e.pos.y = 0; e.vel.y = 0; }
    if (e.pos.y > MAP_SIZE) { e.pos.y = MAP_SIZE; e.vel.y = 0; }
    const center = { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
    const dist = getDistance(e.pos, center);
    if (dist > gameState.current.zoneRadius) {
       if ((e.type === EntityType.PLAYER || e.type === EntityType.BOT)) {
          e.hp -= ZONE_DAMAGE_PER_SEC * dt;
          e.lastCombatTime = gameState.current.gameTime;
          if (e.hp <= 0) e.dead = true;
       }
    }
  };

  const update = (dt: number) => {
    if (gameState.current.isPaused || gameState.current.isGameOver) return;
    gameState.current.gameTime += dt;
    gameState.current.zoneRadius = Math.max(0, gameState.current.zoneRadius - ZONE_SHRINK_SPEED * dt);

    if (playerRef.current && !playerRef.current.dead) {
      const p = playerRef.current;
      const moveDir = { x: 0, y: 0 };
      if (keys.current['w'] || keys.current['ArrowUp']) moveDir.y -= 1;
      if (keys.current['s'] || keys.current['ArrowDown']) moveDir.y += 1;
      if (keys.current['a'] || keys.current['ArrowLeft']) moveDir.x -= 1;
      if (keys.current['d'] || keys.current['ArrowRight']) moveDir.x += 1;
      const norm = normalize(moveDir);
      p.vel = { x: norm.x * p.speed, y: norm.y * p.speed };
      if (keys.current['q'] && p.skills['active_void_dash'] && (p.skillCDs['active_void_dash'] || 0) <= 0) activateSkill(p, 'active_void_dash');
      if (keys.current['e']) {
          if (p.skills['active_meteor_shower'] && (p.skillCDs['active_meteor_shower'] || 0) <= 0) activateSkill(p, 'active_meteor_shower');
          else if (p.skills['active_holy_barrier'] && (p.skillCDs['active_holy_barrier'] || 0) <= 0) activateSkill(p, 'active_holy_barrier');
      }
    }

    entities.current.forEach(e => {
      if (e.dead) return;
      if (e.regen > 0) e.hp = Math.min(e.maxHp, e.hp + e.regen * dt);
      if (e.type !== EntityType.EXP_GEM && e.type !== EntityType.PET && e.hp < e.maxHp && gameState.current.gameTime - e.lastCombatTime > REGEN_DELAY) {
          e.hp = Math.min(e.maxHp, e.hp + (e.maxHp * REGEN_RATE_PERCENT * dt));
      }
      if (e.type === EntityType.ENEMY) {
        const targets = entities.current.filter(t => (t.type === EntityType.PLAYER || t.type === EntityType.BOT) && !t.dead);
        const target = findNearestTarget({ ...e, range: 2000 }, targets);
        if (target) {
          const dir = normalize({ x: target.pos.x - e.pos.x, y: target.pos.y - e.pos.y });
          e.vel = { x: dir.x * e.speed, y: dir.y * e.speed };
        }
      } else if (e.type === EntityType.BOT) {
        calculateBotAI(e, dt);
      } else if (e.type === EntityType.PET) {
          const owner = entities.current.find(o => o.id === e.ownerId);
          if (owner && !owner.dead) {
              const idealPos = { x: owner.pos.x + 40, y: owner.pos.y - 40 }; 
              const dist = getDistance(e.pos, idealPos);
              if (dist > 10) {
                  const dir = normalize({ x: idealPos.x - e.pos.x, y: idealPos.y - e.pos.y });
                  e.vel = { x: dir.x * e.speed, y: dir.y * e.speed };
              } else e.vel = { x: 0, y: 0 };
              
              e.cooldown -= dt;
              if (e.cooldown <= 0) {
                  const targets = entities.current.filter(t => !t.dead && t.id !== e.ownerId && t.type === EntityType.ENEMY);
                  const target = findNearestTarget(e, targets, e.range);
                  if (target) {
                      bullets.current.push(createBullet(e, { damageBase: e.damage, damageLevel: 0, id: 'dragon_breath', color: '#fca5a5', speed: 500, duration: 2, radius: 8, visualType: 'FIRE' }, { ownerId: e.ownerId }));
                      const fireDir = normalize({ x: target.pos.x - e.pos.x, y: target.pos.y - e.pos.y });
                      bullets.current[bullets.current.length-1].vel = { x: fireDir.x * 500, y: fireDir.y * 500 };
                      e.cooldown = e.maxCooldown;
                  }
              }
          } else e.dead = true; 
      } else if (e.type === EntityType.EXP_GEM) {
         const collectors = entities.current.filter(c => (c.type === EntityType.PLAYER || c.type === EntityType.BOT) && !c.dead);
         for (const c of collectors) {
            const d = getDistance(e.pos, c.pos);
            if (d < c.magnet) {
               const dir = normalize({ x: c.pos.x - e.pos.x, y: c.pos.y - e.pos.y });
               e.pos.x += dir.x * 600 * dt; 
               e.pos.y += dir.y * 600 * dt;
               if (d < c.radius + e.radius) {
                  e.dead = true;
                  c.exp += e.exp * c.xpMult;
                  if (c.type === EntityType.PLAYER && c.exp >= c.expToNextLevel) {
                      onLevelUp(c.level);
                      c.level++;
                      c.maxHp = Math.floor(c.maxHp * 1.1) + 10;
                      c.damage = c.damage * 1.05;
                      c.hp = c.maxHp; 
                      if(c.maxShield > 0) c.maxShield = Math.floor(c.maxShield * 1.1);
                      c.exp = 0;
                      c.expToNextLevel = Math.floor(c.expToNextLevel * 1.5);
                  } else if (c.type === EntityType.BOT && c.exp >= c.expToNextLevel) {
                      c.level++;
                      c.exp = 0;
                      c.expToNextLevel = Math.floor(c.expToNextLevel * 1.5);
                      c.damage = Math.floor(c.damage * 1.1);
                      c.maxHp = Math.floor(c.maxHp * 1.1) + 20;
                      c.hp = c.maxHp;
                      if(c.maxShield > 0) c.maxShield = Math.floor(c.maxShield * 1.1);
                      const skillIds = Object.keys(SKILL_DATA);
                      const randomId = skillIds[Math.floor(Math.random() * skillIds.length)];
                      c.skills[randomId] = (c.skills[randomId] || 0) + 1;
                  }
                  particles.current.push({ x: e.pos.x, y: e.pos.y, text: `+${Math.floor(e.exp * c.xpMult)}`, life: 0.5, vy: -30, color: '#3b82f6', isExp: true });
               }
            }
         }
      }

      if (e.type === EntityType.PLAYER || e.type === EntityType.BOT) {
        e.cooldown -= dt;
        if (e.cooldown <= 0) {
          const potentialTargets = entities.current.filter(t => t.id !== e.id && !t.dead && ((e.type === EntityType.PLAYER && (t.type === EntityType.ENEMY || t.type === EntityType.BOT)) || (e.type === EntityType.BOT && (t.type === EntityType.ENEMY || t.type === EntityType.PLAYER || t.type === EntityType.BOT))));
          const target = findNearestTarget(e, potentialTargets);
          if (target) {
            fireBullet(e, target);
            e.cooldown = e.maxCooldown;
          }
        }
        processSkills(e, dt);
      }
    });

    spawnEnemy(dt);
    entities.current.forEach(e => updateEntityPhysics(dt, e));
    
    for (let i = bullets.current.length - 1; i >= 0; i--) {
      const b = bullets.current[i];
      b.lifeTime -= dt;
      if (b.lifeTime <= 0) {
        bullets.current.splice(i, 1);
        if (b.delayedExplosion) {
            bullets.current.push({ ...b, id: `explosion_${Math.random()}`, delayedExplosion: false, lifeTime: 0.2, radius: b.explodeRadius || 50, color: '#f97316', isExplosive: true, damage: b.damage, vel: {x:0, y:0}, visualType: 'DEFAULT' });
            particles.current.push({ type: 'EXPLOSION', x: b.pos.x, y: b.pos.y, radius: b.explodeRadius || 50, life: 0.4, color: '#f97316' });
             entities.current.forEach(e => {
                if (e.dead || e.id === b.ownerId || e.type === EntityType.EXP_GEM || e.type === EntityType.PET) return;
                const isTarget = (e.type === EntityType.ENEMY) || (e.type !== b.type && b.ownerId !== e.id && e.type !== EntityType.EXP_GEM);
                if (isTarget && getDistance(b.pos, e.pos) < (b.explodeRadius || 50) + e.radius) {
                   applyDamage(e, b.damage, entities.current.find(o => o.id === b.ownerId));
                }
            });
        }
        continue;
      }
      if (b.delayedExplosion) continue; 
      if (b.isHoming && b.homingTargetId) {
         const target = entities.current.find(e => e.id === b.homingTargetId && !e.dead);
         if (target) {
             const ideal = normalize({x: target.pos.x - b.pos.x, y: target.pos.y - b.pos.y});
             b.vel.x += (ideal.x * (b.speed || 400) - b.vel.x) * (b.turnSpeed || 5) * dt;
             b.vel.y += (ideal.y * (b.speed || 400) - b.vel.y) * (b.turnSpeed || 5) * dt;
         }
      } else if (b.isOrbit) {
         const owner = entities.current.find(e => e.id === b.ownerId);
         if (owner) {
             b.orbitAngle = (b.orbitAngle || 0) + (b.orbitSpeed || 2) * dt;
             b.pos.x = owner.pos.x + Math.cos(b.orbitAngle) * (b.orbitDist || 100);
             b.pos.y = owner.pos.y + Math.sin(b.orbitAngle) * (b.orbitDist || 100);
             if(b.isWave) b.pos = { ...owner.pos };
         } else b.dead = true;
      }
      if (!b.isOrbit && !b.isMine) {
          b.pos.x += b.vel.x * dt;
          b.pos.y += b.vel.y * dt;
      }
      let hit = false;
      for (const e of entities.current) {
        if (e.dead || e.id === b.ownerId || e.type === EntityType.EXP_GEM || e.type === EntityType.PET) continue;
        const isTarget = (e.type === EntityType.ENEMY) || (e.type === EntityType.BOT && b.ownerId === 'player') || (e.type === EntityType.PLAYER && b.ownerId !== 'player') || (e.type === EntityType.BOT && b.ownerId !== e.id);
        if (isTarget && getDistance(b.pos, e.pos) < e.radius + b.radius) {
          if (b.isWave) {
               b.cooldown -= dt;
               if (b.cooldown <= 0) {
                   applyDamage(e, b.damage, entities.current.find(o => o.id === b.ownerId));
                   b.cooldown = 0.5;
               }
               continue;
          }
          applyDamage(e, b.damage, entities.current.find(o => o.id === b.ownerId));
          if (!b.isOrbit && !b.isWave) { 
             b.pierceCount--;
             if (b.pierceCount < 0) {
               bullets.current.splice(i, 1);
               hit = true;
               break;
             }
          }
        }
      }
      if (hit) continue;
    }

    entities.current.forEach(e => {
       if ((e.type === EntityType.PLAYER || e.type === EntityType.BOT) && !e.dead) {
          if (e.invulnerableUntil > gameState.current.gameTime) return;
          entities.current.forEach(enemy => {
             if (enemy.type === EntityType.ENEMY && !enemy.dead) {
                if (getDistance(e.pos, enemy.pos) < e.radius + enemy.radius) {
                   const rawDmg = enemy.damage * dt * 2;
                   applyDamage(e, rawDmg, enemy); 
                }
             }
          });
       }
    });

    entities.current = entities.current.filter(e => !e.dead);
    
    if (playerRef.current?.dead && !gameState.current.isGameOver) {
       onGameOver(false, { level: playerRef.current.level });
       gameState.current.isGameOver = true;
    } else if (!gameState.current.isGameOver) {
       const survivors = entities.current.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.BOT);
       if (survivors.length === 1 && survivors[0].type === EntityType.PLAYER) {
         onGameOver(true, { level: playerRef.current?.level });
         gameState.current.isGameOver = true;
       }
    }

    particles.current.forEach(p => { 
        p.life -= dt; 
        p.y += (p.vy || 0) * dt; 
        if (p.vx) p.x += p.vx * dt;
        // Gravity for floating text
        if (p.text) p.vy += 100 * dt; 
        if(p.scale) p.scale += dt;
    });
    particles.current = particles.current.filter(p => p.life > 0);
  };

  // --- RENDERING HELPERS (IMPROVED VISUALS) ---

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
  };

  const drawCharacter = (ctx: CanvasRenderingContext2D, e: Entity, isPlayer: boolean) => {
     const bodyColor = isPlayer ? COLOR_PALETTE.playerBody : COLOR_PALETTE.enemyBody;
     const darkColor = isPlayer ? COLOR_PALETTE.playerBodyDark : COLOR_PALETTE.enemyBodyDark;
     
     // 1. Hands (Directional)
     const angle = Math.atan2(e.vel.y, e.vel.x) || Math.PI/2;
     const handDist = e.radius * 0.8;
     const lx = e.pos.x + Math.cos(angle - 0.6) * handDist;
     const ly = e.pos.y + Math.sin(angle - 0.6) * handDist;
     const rx = e.pos.x + Math.cos(angle + 0.6) * handDist;
     const ry = e.pos.y + Math.sin(angle + 0.6) * handDist;

     ctx.fillStyle = bodyColor;
     ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI*2); ctx.fill();
     ctx.beginPath(); ctx.arc(rx, ry, 5, 0, Math.PI*2); ctx.fill();

     // 2. Main Body (Squircle)
     ctx.fillStyle = bodyColor;
     const r = e.radius;
     drawRoundedRect(ctx, e.pos.x - r, e.pos.y - r, r*2, r*2, 8);
     ctx.fill();

     // 3. Highlight/Shading
     ctx.fillStyle = darkColor;
     ctx.beginPath();
     ctx.arc(e.pos.x, e.pos.y + 4, r * 0.4, 0, Math.PI*2); // "Face" or shadow area
     ctx.fill();

     // 4. Shield
     if (e.shield > 0) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, e.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
     }
  };

  const drawEnemyShape = (ctx: CanvasRenderingContext2D, e: Entity, isElite: boolean) => {
     ctx.save();
     ctx.translate(e.pos.x, e.pos.y);
     
     if (isElite) {
         // ELITE: Spiked Star
         const scale = 1 + Math.sin(gameState.current.gameTime * 5) * 0.1;
         ctx.scale(scale, scale);
         const color = COLOR_PALETTE.enemyElite;
         
         ctx.beginPath();
         for(let i=0; i<8; i++) {
             const a = (Math.PI * 2 / 8) * i;
             const rOuter = e.radius;
             const rInner = e.radius * 0.5;
             ctx.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
             ctx.lineTo(Math.cos(a + 0.4) * rInner, Math.sin(a + 0.4) * rInner);
         }
         ctx.closePath();
         ctx.fillStyle = color;
         ctx.fill();
         ctx.lineWidth = 2;
         ctx.strokeStyle = COLOR_PALETTE.enemyEliteDark;
         ctx.stroke();
     } else {
         // NORMAL: Horned Imp
         const color = COLOR_PALETTE.enemyBody;
         ctx.fillStyle = color;
         
         // Body
         ctx.beginPath();
         ctx.arc(0, 0, e.radius, 0, Math.PI*2);
         ctx.fill();
         
         // Horns
         ctx.beginPath();
         ctx.moveTo(-e.radius * 0.5, -e.radius * 0.8);
         ctx.lineTo(-e.radius * 0.8, -e.radius * 1.4);
         ctx.lineTo(-e.radius * 0.2, -e.radius * 0.9);
         ctx.fill();

         ctx.beginPath();
         ctx.moveTo(e.radius * 0.5, -e.radius * 0.8);
         ctx.lineTo(e.radius * 0.8, -e.radius * 1.4);
         ctx.lineTo(e.radius * 0.2, -e.radius * 0.9);
         ctx.fill();
     }

     // Evil Eyes (Common to both)
     ctx.fillStyle = '#1e293b'; 
     ctx.beginPath(); ctx.arc(-5, -2, 3, 0, Math.PI*2); ctx.fill();
     ctx.beginPath(); ctx.arc(5, -2, 3, 0, Math.PI*2); ctx.fill();
     
     ctx.fillStyle = '#facc15';
     ctx.beginPath(); ctx.arc(-5, -2, 1, 0, Math.PI*2); ctx.fill();
     ctx.beginPath(); ctx.arc(5, -2, 1, 0, Math.PI*2); ctx.fill();

     ctx.restore();
  };

  const drawBulletShape = (ctx: CanvasRenderingContext2D, b: Bullet) => {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      ctx.fillStyle = b.color;
      
      switch(b.visualType) {
          case 'SPEAR': {
              const angle = Math.atan2(b.vel.y, b.vel.x);
              ctx.rotate(angle);
              ctx.beginPath();
              ctx.moveTo(15, 0);
              ctx.lineTo(-10, 5);
              ctx.lineTo(-10, -5);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              ctx.stroke();
              break;
          }
          case 'BLADE': {
             // Whirling Blade - Rotates on itself
             const spin = (Date.now() / 100) % (Math.PI * 2);
             ctx.rotate(spin);
             ctx.beginPath();
             ctx.arc(0, 0, b.radius, 0.5, Math.PI * 1.5, false);
             ctx.lineTo(5, -10);
             ctx.closePath();
             ctx.fill();
             break;
          }
          case 'ORB': {
              // Pulse effect
              const pulse = 1 + Math.sin(Date.now() / 100) * 0.2;
              ctx.scale(pulse, pulse);
              ctx.beginPath();
              ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
              ctx.fill();
              // Star core
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(0, 0, b.radius * 0.4, 0, Math.PI * 2);
              ctx.fill();
              break;
          }
          case 'FIRE': {
              const angle = Math.atan2(b.vel.y, b.vel.x) - Math.PI / 2;
              ctx.rotate(angle);
              ctx.beginPath();
              ctx.arc(0, 0, b.radius, 0, Math.PI);
              ctx.lineTo(0, -b.radius * 2);
              ctx.closePath();
              ctx.fill();
              break;
          }
          case 'METEOR': {
              ctx.shadowBlur = 10;
              ctx.shadowColor = '#f97316';
              ctx.beginPath();
              ctx.arc(0, 0, b.radius, 0, Math.PI*2);
              ctx.fill();
              break;
          }
          case 'WAVE': {
              ctx.globalAlpha = 0.5;
              ctx.beginPath();
              ctx.arc(0, 0, b.radius, 0, Math.PI*2);
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.strokeStyle = b.color;
              ctx.lineWidth = 2;
              ctx.stroke();
              break;
          }
          default: {
              ctx.beginPath(); 
              ctx.arc(0, 0, b.radius, 0, Math.PI*2); 
              ctx.fill();
          }
      }
      ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    if (!playerRef.current) return;
    const p = playerRef.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const camX = p.pos.x - width / 2;
    const camY = p.pos.y - height / 2;

    // --- BG ---
    ctx.fillStyle = COLOR_PALETTE.background;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-camX, -camY);

    // --- GRID ---
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLOR_PALETTE.grid;
    const startX = Math.floor(camX / 100) * 100;
    const startY = Math.floor(camY / 100) * 100;
    for (let x = startX; x <= startX + width + 100; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, startY + height + 100); ctx.stroke();
    }
    for (let y = startY; y <= startY + height + 100; y += 100) {
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + width + 100, y); ctx.stroke();
    }
    
    // Zone
    ctx.lineWidth = 5;
    ctx.strokeStyle = COLOR_PALETTE.zoneBorder;
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLOR_PALETTE.zoneBorder;
    ctx.beginPath();
    ctx.arc(MAP_SIZE/2, MAP_SIZE/2, gameState.current.zoneRadius, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // --- ENTITIES ---
    entities.current.forEach(e => {
       if(e.dead) return;
       // Shadow
       if(e.type !== EntityType.EXP_GEM) {
           ctx.fillStyle = 'rgba(0,0,0,0.4)';
           ctx.beginPath(); ctx.ellipse(e.pos.x, e.pos.y + e.radius*0.8, e.radius, e.radius*0.4, 0, 0, Math.PI*2); ctx.fill();
       }

       if (e.type === EntityType.PLAYER || e.type === EntityType.BOT) {
           drawCharacter(ctx, e, e.type === EntityType.PLAYER);
           // HP Bar for bots only (Player has HUD)
           if (e.type === EntityType.BOT) {
                const hpPct = e.hp / e.maxHp;
                const barW = 30;
                ctx.fillStyle = '#000';
                ctx.fillRect(e.pos.x - barW/2, e.pos.y - e.radius - 12, barW, 4);
                ctx.fillStyle = hpPct > 0.5 ? COLOR_PALETTE.hpHigh : COLOR_PALETTE.hpLow;
                ctx.fillRect(e.pos.x - barW/2, e.pos.y - e.radius - 12, barW * hpPct, 4);
           }
       } else if (e.type === EntityType.ENEMY) {
           drawEnemyShape(ctx, e, e.maxHp > 60);
           // HP Bar (Simplified for readability)
           const hpPct = e.hp / e.maxHp;
           if (hpPct < 1) {
               const barW = 24;
               ctx.fillStyle = 'rgba(0,0,0,0.5)';
               ctx.fillRect(e.pos.x - barW/2, e.pos.y - e.radius - 10, barW, 3);
               ctx.fillStyle = COLOR_PALETTE.enemyBody;
               ctx.fillRect(e.pos.x - barW/2, e.pos.y - e.radius - 10, barW * hpPct, 3);
           }
       } else if (e.type === EntityType.EXP_GEM) {
           ctx.fillStyle = COLOR_PALETTE.xpBar;
           ctx.beginPath(); ctx.moveTo(e.pos.x, e.pos.y-5); ctx.lineTo(e.pos.x+5, e.pos.y); ctx.lineTo(e.pos.x, e.pos.y+5); ctx.lineTo(e.pos.x-5, e.pos.y); ctx.fill();
       } else if (e.type === EntityType.PET) {
           ctx.fillStyle = e.color;
           ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI*2); ctx.fill();
       }
    });

    // Bullets (New Drawing Logic)
    bullets.current.forEach(b => {
       drawBulletShape(ctx, b);
    });

    // Particles / Floating Text
    particles.current.forEach(p => {
        if (p.text) {
            ctx.save();
            ctx.translate(p.x, p.y);
            const scale = Math.min(1, p.life * 3); // Pop in
            ctx.scale(scale, scale);
            
            ctx.font = `bold ${p.fontSize || 14}px "Exo 2"`;
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.strokeText(p.text, -10, 0); // Center align rough
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, -10, 0);
            ctx.restore();
        } else {
            ctx.globalAlpha = p.life;
            if (p.type === 'LIGHTNING') {
               ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
            } else if (p.type === 'EXPLOSION') {
               ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius*(1.5-p.life), 0, Math.PI*2); ctx.stroke();
            } else {
               ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    });

    // Zone Danger Overlay
    ctx.beginPath();
    ctx.rect(camX, camY, width, height);
    ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, gameState.current.zoneRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = COLOR_PALETTE.zoneDanger;
    ctx.fill();

    ctx.restore();
  };

  useEffect(() => {
    initGame();
    
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };
    const handleMouseMove = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY }; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    let animationId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const safeDt = Math.min(dt, 0.1);
      
      update(safeDt);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }

      frameCount++;
      // if (frameCount % 60 === 0) {
      //   console.log('Entities:', entities.current.length, 'Bullets:', bullets.current.length);
      // }
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [initGame]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="block"
      />
      
      {/* HUD OVERLAY */}
      {playerRef.current && !playerRef.current.dead && (
        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
            {/* Top Info */}
            <div className="flex justify-between items-start">
               {/* Player Status */}
               <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-xl">
                   <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-600">
                       <User className="text-cyan-400" />
                   </div>
                   <div className="flex flex-col gap-1 w-48">
                       <div className="flex justify-between text-xs font-bold text-slate-400">
                           <span>{t.hp} {Math.ceil(playerRef.current.hp)}/{playerRef.current.maxHp}</span>
                           <span className="text-yellow-400">{t.level} {playerRef.current.level}</span>
                       </div>
                       <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                           <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300" style={{ width: `${Math.max(0, playerRef.current.hp / playerRef.current.maxHp * 100)}%` }}></div>
                       </div>
                       {playerRef.current.shield > 0 && (
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${Math.min(100, playerRef.current.shield / playerRef.current.maxShield * 100)}%` }}></div>
                          </div>
                       )}
                       <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                           <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${Math.min(100, playerRef.current.exp / playerRef.current.expToNextLevel * 100)}%` }}></div>
                       </div>
                   </div>
               </div>

               {/* Game Stats */}
               <div className="flex gap-4">
                  <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2 text-slate-200 font-mono font-bold">
                     <Target className="text-red-500" size={18} />
                     <span>{t.alive}: {entities.current.filter(e => (e.type === EntityType.PLAYER || e.type === EntityType.BOT)).length}</span>
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2 text-slate-200 font-mono font-bold">
                     <span className="text-slate-500">{t.time}:</span>
                     <span>{Math.floor(gameState.current.gameTime / 60)}:{Math.floor(gameState.current.gameTime % 60).toString().padStart(2, '0')}</span>
                  </div>
               </div>
            </div>

            {/* Bottom Skills */}
            <div className="flex justify-center gap-4 items-end mb-4">
                {/* Dash Skill */}
                <div className="relative">
                    <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all ${playerRef.current.skills['active_void_dash'] ? ((playerRef.current.skillCDs['active_void_dash']||0) <= 0 ? 'border-cyan-400 bg-cyan-900/50 shadow-[0_0_15px_cyan]' : 'border-slate-600 bg-slate-800/80 grayscale') : 'border-slate-700 bg-slate-900/50 opacity-50'}`}>
                        <div className="font-bold text-lg text-white">Q</div>
                        {(playerRef.current.skillCDs['active_void_dash']||0) > 0 && (
                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center font-bold text-white">
                                {Math.ceil(playerRef.current.skillCDs['active_void_dash'])}
                            </div>
                        )}
                    </div>
                </div>

                 {/* Active Skill (E) */}
                 <div className="relative">
                    <div className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center transition-all ${(playerRef.current.skills['active_meteor_shower'] || playerRef.current.skills['active_holy_barrier']) ? ((playerRef.current.skillCDs['active_meteor_shower']||0) <= 0 && (playerRef.current.skillCDs['active_holy_barrier']||0) <= 0 ? 'border-yellow-400 bg-yellow-900/50 shadow-[0_0_20px_orange]' : 'border-slate-600 bg-slate-800/80 grayscale') : 'border-slate-700 bg-slate-900/50 opacity-50'}`}>
                        <div className="font-bold text-2xl text-white">E</div>
                         {((playerRef.current.skillCDs['active_meteor_shower']||0) > 0 || (playerRef.current.skillCDs['active_holy_barrier']||0) > 0) && (
                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center font-bold text-white text-xl">
                                {Math.ceil(Math.max(playerRef.current.skillCDs['active_meteor_shower']||0, playerRef.current.skillCDs['active_holy_barrier']||0))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

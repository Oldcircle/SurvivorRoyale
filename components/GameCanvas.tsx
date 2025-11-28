
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
      frozenUntil: 0,
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
      frozenUntil: 0,
      shield: 0,
      maxShield: 0
    });
  };

  const spawnEnemy = (dt: number) => {
    if (gameState.current.isPaused) return;
    
    const baseSpawnRate = 0.8;
    const quantityFactor = 1 + Math.min(2.0, gameState.current.gameTime / 180);
    const difficultyFactor = 1 + (gameState.current.gameTime / 120);

    const spawnChance = (dt / baseSpawnRate) * quantityFactor;
    
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
      
      const isElite = Math.random() < (0.05 * quantityFactor);
      
      entities.current.push({
        id: `enemy_${Math.random()}`,
        type: EntityType.ENEMY,
        pos,
        vel: { x: 0, y: 0 },
        radius: isElite ? 24 : 16,
        color: isElite ? COLOR_PALETTE.enemyElite : COLOR_PALETTE.enemyBody,
        hp: (isElite ? 400 : 50) * difficultyFactor,
        maxHp: (isElite ? 400 : 50) * difficultyFactor,
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
        frozenUntil: 0,
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
    
    // SYNERGY: Frozen enemies take massive damage from certain sources
    if (target.frozenUntil && target.frozenUntil > gameState.current.gameTime) {
         // If attacker uses Phantom Daggers (dagger logic handled in createBullet mostly, but here we can add generic freeze bonus)
         // Actually, let's keep it simple: Frozen enemies take 30% more damage from ALL sources
         finalAmount *= 1.3;
    }

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
    
    const offsetX = (Math.random() - 0.5) * 20;
    const color = isCrit ? COLOR_PALETTE.textCrit : (finalAmount === 0 ? '#60a5fa' : COLOR_PALETTE.textDamage);
    const fontSize = isCrit ? 24 : 14;
    
    particles.current.push({ 
        x: target.pos.x + offsetX, 
        y: target.pos.y - 20, 
        text: Math.floor(finalAmount).toString(), 
        life: 0.8, 
        vy: -80, 
        vx: offsetX * 2,
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
    let { amount, isCrit } = calculateDamage(owner, data.damageBase + (data.damageLevel * (owner.skills[data.id] || 0)));
    
    // SYNERGY: Phantom Daggers vs Frozen targets (3x Damage + Auto Crit)
    if (data.id === 'weapon_phantom_daggers' && overrides.homingTargetId) {
        const target = entities.current.find(e => e.id === overrides.homingTargetId);
        if (target && target.frozenUntil && target.frozenUntil > gameState.current.gameTime) {
            amount *= 3;
            isCrit = true; // Auto crit
        }
    }

    // Pass the crit status to the bullet so it can render effects on hit? 
    // Simplified: Just store damage amount. Real calculation happened above.

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
          case 'active_frost_nova': {
              const radius = data.radius * e.areaScale;
              particles.current.push({ type: 'RING', x: e.pos.x, y: e.pos.y, radius: radius, life: 0.5, color: '#22d3ee', width: 5 });
              
              // Freeze Enemies
              entities.current.forEach(target => {
                  if (target.dead || target.id === e.id || target.type === EntityType.EXP_GEM) return;
                  if (getDistance(e.pos, target.pos) < radius) {
                      if (target.type === EntityType.ENEMY || (target.type === EntityType.BOT && e.id === 'player') || (target.type === EntityType.PLAYER && e.id !== 'player')) {
                          target.frozenUntil = gameState.current.gameTime + data.duration;
                          applyDamage(target, calculateDamage(e, data.damageBase).amount, e);
                          particles.current.push({ x: target.pos.x, y: target.pos.y, text: "FROZEN", life: 1.0, color: "#22d3ee", vy: -20 });
                      }
                  }
              });
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
      
      // SUMMONS
      if (skillId === 'summon_dragon_scion') {
          const pet = entities.current.find(ent => ent.type === EntityType.PET && ent.ownerId === e.id && ent.name === 'Draco');
          if (!pet) {
              entities.current.push({
                  id: `dragon_${e.id}_${Math.random()}`, type: EntityType.PET, ownerId: e.id, pos: { x: e.pos.x - 30, y: e.pos.y - 30 }, vel: { x: 0, y: 0 }, radius: 12, color: data.color, hp: 1000, maxHp: 1000, dead: false, damage: data.damageBase + (data.damageLevel * level), cooldown: 0, maxCooldown: data.attackCooldown + (data.attackCooldownLevel * level), range: data.range, speed: 160, level: level, exp: 0, expToNextLevel: 0, projectileCount: 1, piercing: 0, lastCombatTime: 0, skills: {}, skillCDs: {}, armor: 0, flatDamageReduction: 0, lifesteal: 0, magnet: 0, xpMult: 0, areaScale: 1, regen: 0, critRate: e.critRate, critDamage: e.critDamage, invulnerableUntil: 0, shield: 0, maxShield: 0, name: 'Draco'
              });
          }
          return;
      }

      // WEAPONS
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
                 // SYNERGY: Can hit Thunder Totems to overload them
                 const totems = entities.current.filter(t => t.type === EntityType.PET && t.ownerId === e.id && t.isStatic);
                 const enemies = targets;
                 const allTargets = [...enemies, ...totems];
                 
                 const target = findNearestTarget(e, allTargets, 600);
                 if (target) {
                     if (target.isStatic && target.ownerId === e.id) {
                         // TRIGGER TOTEM OVERLOAD
                         particles.current.push({ type: 'LIGHTNING', x1: e.pos.x, y1: e.pos.y, x2: target.pos.x, y2: target.pos.y, life: 0.3, color: '#60a5fa', width: 4 });
                         particles.current.push({ type: 'RING', x: target.pos.x, y: target.pos.y, radius: 250, life: 0.4, color: '#60a5fa', width: 10 });
                         // Explosion logic
                         entities.current.forEach(enemy => {
                             if (!enemy.dead && enemy.type === EntityType.ENEMY && getDistance(target.pos, enemy.pos) < 250) {
                                 applyDamage(enemy, calculateDamage(e, 300).amount, e, true); // Massive damage
                             }
                         });
                     } else {
                         // Normal chain
                         applyDamage(target, calculateDamage(e, data.damageBase + data.damageLevel * level).amount, e);
                         particles.current.push({ type: 'LIGHTNING', x1: e.pos.x, y1: e.pos.y, x2: target.pos.x, y2: target.pos.y, life: 0.2, color: data.color });
                         let cur = target;
                         let jumps = data.jumps[Math.min(level-1, 4)];
                         let dmgMult = 1.0;
                         const hitList = [target.id];
                         for(let j=0; j<jumps; j++) {
                             const nextTarget = allTargets.find(n => !n.dead && !hitList.includes(n.id) && getDistance(cur.pos, n.pos) < data.jumpRadius && (n.type === EntityType.ENEMY || (n.type === EntityType.PET && n.isStatic)));
                             if (nextTarget) {
                                 if (nextTarget.isStatic && nextTarget.ownerId === e.id) {
                                      // Secondary jumps can also trigger totems
                                      particles.current.push({ type: 'LIGHTNING', x1: cur.pos.x, y1: cur.pos.y, x2: nextTarget.pos.x, y2: nextTarget.pos.y, life: 0.3, color: '#60a5fa', width: 4 });
                                      particles.current.push({ type: 'RING', x: nextTarget.pos.x, y: nextTarget.pos.y, radius: 250, life: 0.4, color: '#60a5fa', width: 10 });
                                      entities.current.forEach(enemy => {
                                          if (!enemy.dead && enemy.type === EntityType.ENEMY && getDistance(nextTarget.pos, enemy.pos) < 250) {
                                              applyDamage(enemy, calculateDamage(e, 300).amount, e, true);
                                          }
                                      });
                                 } else {
                                     dmgMult *= data.decay;
                                     applyDamage(nextTarget, Math.floor(calculateDamage(e, data.damageBase).amount * dmgMult), e);
                                     particles.current.push({ type: 'LIGHTNING', x1: cur.pos.x, y1: cur.pos.y, x2: nextTarget.pos.x, y2: nextTarget.pos.y, life: 0.2, color: data.color });
                                 }
                                 hitList.push(nextTarget.id);
                                 cur = nextTarget;
                             } else break;
                         }
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
             case 'weapon_phantom_daggers': {
                 // Fires BACKWARDS from movement
                 const moveAngle = Math.atan2(e.vel.y, e.vel.x);
                 const backAngle = (e.vel.x === 0 && e.vel.y === 0) ? Math.random() * Math.PI * 2 : moveAngle + Math.PI; 
                 const count = data.count[Math.min(level-1, 4)];
                 const spread = 0.5;
                 for(let i=0; i<count; i++) {
                     const a = backAngle - (spread/2) + (Math.random() * spread);
                     // Find a frozen target to home in on? Optional. For now just straight projectile.
                     bullets.current.push(createBullet(e, data, { 
                         vel: { x: Math.cos(a)*data.speed, y: Math.sin(a)*data.speed }, 
                         lifeTime: 1.5,
                         visualType: 'DAGGER'
                     }));
                 }
                 triggered = true;
                 break;
             }
             case 'weapon_thunder_totem': {
                 // Spawn a totem
                 const totemCount = entities.current.filter(t => t.type === EntityType.PET && t.ownerId === e.id && t.isStatic).length;
                 if (totemCount < 2) { // Max 2 totems
                     entities.current.push({
                        id: `totem_${e.id}_${Math.random()}`, type: EntityType.PET, ownerId: e.id, pos: { x: e.pos.x, y: e.pos.y }, vel: { x: 0, y: 0 }, radius: 15, color: data.color, hp: 500, maxHp: 500, dead: false, damage: data.damageBase + (data.damageLevel * level), cooldown: 0, maxCooldown: data.attackSpeed, range: data.range, speed: 0, level: level, exp: 0, expToNextLevel: 0, projectileCount: 1, piercing: 0, lastCombatTime: 0, skills: {}, skillCDs: {}, armor: 0, flatDamageReduction: 0, lifesteal: 0, magnet: 0, xpMult: 0, areaScale: 1, regen: 0, critRate: 0, critDamage: 0, invulnerableUntil: 0, shield: 0, maxShield: 0, name: 'Totem', isStatic: true
                    });
                    triggered = true;
                 }
                 break;
             }
             case 'weapon_toxic_gas': {
                 const target = findNearestTarget(e, targets, 400);
                 const angle = target ? Math.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x) : Math.random() * Math.PI * 2;
                 const dist = 100 + Math.random() * 150;
                 const landPos = { x: e.pos.x + Math.cos(angle)*dist, y: e.pos.y + Math.sin(angle)*dist };
                 
                 bullets.current.push(createBullet(e, data, {
                     pos: landPos, vel: {x:0, y:0}, lifeTime: data.duration, isPool: true, radius: data.radius * e.areaScale, visualType: 'POISON'
                 }));
                 triggered = true;
                 break;
             }
          }
          if (triggered) e.skillCDs[skillId] = data.cooldown + (data.cooldownLevel || 0) * level;
      }
    });
  };

  const calculateBotAI = (bot: Entity, dt: number) => {
    // If frozen, can't move
    if (bot.frozenUntil && bot.frozenUntil > gameState.current.gameTime) {
        bot.vel = { x: 0, y: 0 };
        return;
    }

    const center = { x: MAP_SIZE/2, y: MAP_SIZE/2 };
    const distToCenter = getDistance(bot.pos, center);
    let moveVec = { x: 0, y: 0 };

    // 1. Zone Survival: Strong pull to center if outside safe zone
    if (distToCenter > gameState.current.zoneRadius * 0.98) {
       const toCenter = normalize({ x: center.x - bot.pos.x, y: center.y - bot.pos.y });
       bot.vel = { x: toCenter.x * bot.speed, y: toCenter.y * bot.speed };
       return;
    } else if (distToCenter > gameState.current.zoneRadius * 0.85) {
       const toCenter = normalize({ x: center.x - bot.pos.x, y: center.y - bot.pos.y });
       moveVec = addVectors(moveVec, scaleVector(toCenter, 2.5));
    }

    const viewDist = 600;
    const nearby = entities.current.filter(e => !e.dead && e.id !== bot.id && getDistance(bot.pos, e.pos) < viewDist);
    
    const bulletsNear = nearby.filter(e => e.type === EntityType.BULLET && (e as Bullet).ownerId !== bot.id && !(e as Bullet).isPool); // Don't dodge pools like bullets
    const poolsNear = nearby.filter(e => e.type === EntityType.BULLET && (e as Bullet).isPool && (e as Bullet).ownerId !== bot.id);
    const enemiesNear = nearby.filter(e => e.type === EntityType.ENEMY);
    const gemsNear = nearby.filter(e => e.type === EntityType.EXP_GEM);
    const rivalsNear = nearby.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.BOT);
    
    const isSwarmed = enemiesNear.length > 3;
    const hpRatio = bot.hp / bot.maxHp;
    const survivalMode = hpRatio < 0.4 || isSwarmed;
    const farmingPhase = bot.level < 8; // Prioritize farming until lvl 8

    // 2. Dodge Bullets (Highest Priority for Movement)
    bulletsNear.forEach(b => {
        const d = getDistance(bot.pos, b.pos);
        if (d < 180) { // Increased dodge radius
            const away = normalize({ x: bot.pos.x - b.pos.x, y: bot.pos.y - b.pos.y });
            const urgency = (180 - d) / 180;
            const dodgeVec = d > 100 ? { x: -away.y, y: away.x } : away;
            moveVec = addVectors(moveVec, scaleVector(dodgeVec, 12.0 * urgency)); 
            if (urgency > 0.7 && bot.skills['active_void_dash'] && bot.skillCDs['active_void_dash'] <= 0) {
                activateSkill(bot, 'active_void_dash');
            }
        }
    });

    // Dodge Poison Pools
    poolsNear.forEach(p => {
        const d = getDistance(bot.pos, p.pos);
        if (d < p.radius + 20) {
            const away = normalize({ x: bot.pos.x - p.pos.x, y: bot.pos.y - p.pos.y });
            moveVec = addVectors(moveVec, scaleVector(away, 8.0));
        }
    });

    // 3. Enemy/Mob Avoidance (Kiting)
    const personalSpace = survivalMode ? 450 : 200; 
    enemiesNear.forEach(e => {
        const d = getDistance(bot.pos, e.pos);
        if (d < personalSpace) {
            const away = normalize({ x: bot.pos.x - e.pos.x, y: bot.pos.y - e.pos.y });
            const urgency = (personalSpace - d) / personalSpace;
            const weight = survivalMode ? 12.0 : 6.0;
            moveVec = addVectors(moveVec, scaleVector(away, weight * urgency));
        }
    });
    
    // 4. Rival Avoidance (PvP Safety)
    if (farmingPhase || survivalMode) {
        rivalsNear.forEach(r => {
             const d = getDistance(bot.pos, r.pos);
             const rivalHp = r.hp / r.maxHp;
             const isThreat = rivalHp > 0.2 || hpRatio < 0.5;
             const fleeDist = 600;
             if (isThreat && d < fleeDist) {
                 const away = normalize({ x: bot.pos.x - r.pos.x, y: bot.pos.y - r.pos.y });
                 moveVec = addVectors(moveVec, scaleVector(away, 8.0));
             }
        });
    }

    // 5. Gem Collection (Greed)
    const greedBase = farmingPhase ? 10.0 : 2.0;
    const greed = (greedBase + (hpRatio * 2.0)) * (bot.level < 5 ? 2.0 : 1.0);
    
    if (gemsNear.length > 0 && !isSwarmed) {
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

    // 6. Combat Targeting & Positioning
    if (!survivalMode) {
        let target: Entity | null = null;
        
        const killableRival = rivalsNear.find(r => r.hp < r.maxHp * 0.25 && getDistance(bot.pos, r.pos) < 300);

        if (farmingPhase && !killableRival) {
            let minMobDist = Infinity;
            enemiesNear.forEach(e => {
                const d = getDistance(bot.pos, e.pos);
                if (d < minMobDist) { minMobDist = d; target = e; }
            });
        } 
        
        if (!target) {
            if (killableRival) target = killableRival;
            else if (!farmingPhase) {
                let minRivalDist = Infinity;
                rivalsNear.forEach(r => {
                     const d = getDistance(bot.pos, r.pos);
                     if (d < minRivalDist) { minRivalDist = d; target = r; }
                });
            }
        }
        
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
            const idealRange = bot.range * 0.8;
            
            if (d > idealRange + 50) moveVec = addVectors(moveVec, scaleVector(toTarget, 1.5));
            else if (d < idealRange - 50) moveVec = addVectors(moveVec, scaleVector(toTarget, -1.2));
            else {
                const strafe = { x: -toTarget.y, y: toTarget.x };
                moveVec = addVectors(moveVec, scaleVector(strafe, 2.0));
            }
            
            if (bot.skills['active_meteor_shower'] && bot.skillCDs['active_meteor_shower'] <= 0) activateSkill(bot, 'active_meteor_shower');
            if (bot.skills['active_frost_nova'] && bot.skillCDs['active_frost_nova'] <= 0 && d < 300) activateSkill(bot, 'active_frost_nova');
        }
    }

    if (hpRatio < 0.5 && bot.skills['active_holy_barrier'] && bot.skillCDs['active_holy_barrier'] <= 0) activateSkill(bot, 'active_holy_barrier');

    const finalDir = normalize(moveVec);
    // Smooth deceleration
    if (moveVec.x === 0 && moveVec.y === 0) bot.vel = { x: bot.vel.x * 0.9, y: bot.vel.y * 0.9 };
    else bot.vel = { x: finalDir.x * bot.speed, y: finalDir.y * bot.speed };
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
    if (e.isStatic) return; // Totems don't move
    if (e.frozenUntil && e.frozenUntil > gameState.current.gameTime) {
        return; // Frozen enemies don't move
    }
    
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
      if (!p.frozenUntil || p.frozenUntil <= gameState.current.gameTime) {
        if (keys.current['w'] || keys.current['ArrowUp']) moveDir.y -= 1;
        if (keys.current['s'] || keys.current['ArrowDown']) moveDir.y += 1;
        if (keys.current['a'] || keys.current['ArrowLeft']) moveDir.x -= 1;
        if (keys.current['d'] || keys.current['ArrowRight']) moveDir.x += 1;
        const norm = normalize(moveDir);
        p.vel = { x: norm.x * p.speed, y: norm.y * p.speed };
      }
      
      if (keys.current['q'] && p.skills['active_void_dash'] && (p.skillCDs['active_void_dash'] || 0) <= 0) activateSkill(p, 'active_void_dash');
      if (keys.current['e']) {
          if (p.skills['active_meteor_shower'] && (p.skillCDs['active_meteor_shower'] || 0) <= 0) activateSkill(p, 'active_meteor_shower');
          else if (p.skills['active_holy_barrier'] && (p.skillCDs['active_holy_barrier'] || 0) <= 0) activateSkill(p, 'active_holy_barrier');
          else if (p.skills['active_frost_nova'] && (p.skillCDs['active_frost_nova'] || 0) <= 0) activateSkill(p, 'active_frost_nova');
      }
    }

    entities.current.forEach(e => {
      if (e.dead) return;
      if (e.regen > 0) e.hp = Math.min(e.maxHp, e.hp + e.regen * dt);
      if (e.type !== EntityType.EXP_GEM && e.type !== EntityType.PET && e.hp < e.maxHp && gameState.current.gameTime - e.lastCombatTime > REGEN_DELAY) {
          e.hp = Math.min(e.maxHp, e.hp + (e.maxHp * REGEN_RATE_PERCENT * dt));
      }
      if (e.type === EntityType.ENEMY) {
        const targets = entities.current.filter(t => (t.type === EntityType.PLAYER || t.type === EntityType.BOT || (t.type === EntityType.PET && !t.isStatic)) && !t.dead);
        const target = findNearestTarget({ ...e, range: 2000 }, targets);
        if (target && (!e.frozenUntil || e.frozenUntil <= gameState.current.gameTime)) {
          const dir = normalize({ x: target.pos.x - e.pos.x, y: target.pos.y - e.pos.y });
          e.vel = { x: dir.x * e.speed, y: dir.y * e.speed };
        }
      } else if (e.type === EntityType.BOT) {
        calculateBotAI(e, dt);
      } else if (e.type === EntityType.PET) {
          if (e.isStatic) {
              // TOTEM AI
              if (e.lifeTime === undefined) e.lifeTime = 10;
              e.lifeTime -= dt;
              if (e.lifeTime <= 0) e.dead = true;

              e.cooldown -= dt;
              if (e.cooldown <= 0) {
                  const targets = entities.current.filter(t => !t.dead && t.id !== e.ownerId && t.type === EntityType.ENEMY);
                  const target = findNearestTarget(e, targets, e.range);
                  if (target) {
                      // Zap
                      particles.current.push({ type: 'LIGHTNING', x1: e.pos.x, y1: e.pos.y, x2: target.pos.x, y2: target.pos.y, life: 0.2, color: e.color });
                      applyDamage(target, e.damage, entities.current.find(o => o.id === e.ownerId));
                      e.cooldown = e.maxCooldown;
                  }
              }
          } else {
              // DRAGON AI
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
          }
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
        if (e.cooldown <= 0 && (!e.frozenUntil || e.frozenUntil <= gameState.current.gameTime)) {
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
                const isTarget = (e.type === EntityType.ENEMY) || (e.type !== b.type && b.ownerId !== e.id);
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
      if (!b.isOrbit && !b.isMine && !b.isPool) {
          b.pos.x += b.vel.x * dt;
          b.pos.y += b.vel.y * dt;
      }
      
      // Hit Detection
      let hit = false;
      // Optimize: Only check collision periodically for pools
      if (b.isPool && Math.random() > 0.1) continue; 

      for (const e of entities.current) {
        if (e.dead || e.id === b.ownerId || e.type === EntityType.EXP_GEM || e.type === EntityType.PET) continue;
        const isTarget = (e.type === EntityType.ENEMY) || (e.type === EntityType.BOT && b.ownerId === 'player') || (e.type === EntityType.PLAYER && b.ownerId !== 'player') || (e.type === EntityType.BOT && b.ownerId !== e.id);
        if (isTarget && getDistance(b.pos, e.pos) < e.radius + b.radius) {
          if (b.isWave || b.isPool) {
               b.cooldown -= dt;
               if (b.cooldown <= 0) {
                   applyDamage(e, b.damage, entities.current.find(o => o.id === b.ownerId));
                   b.cooldown = b.isPool ? 0.5 : 0.5;
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
                if (!enemy.frozenUntil || enemy.frozenUntil <= gameState.current.gameTime) {
                   if (getDistance(e.pos, enemy.pos) < e.radius + enemy.radius) {
                      const rawDmg = enemy.damage * dt * 2;
                      applyDamage(e, rawDmg, enemy); 
                   }
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
     
     // 3.5 Frozen status
     if (e.frozenUntil && e.frozenUntil > gameState.current.gameTime) {
         ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
         drawRoundedRect(ctx, e.pos.x - r, e.pos.y - r, r*2, r*2, 8);
         ctx.fill();
     }

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

     // Frozen overlay
     if (e.frozenUntil && e.frozenUntil > gameState.current.gameTime) {
         ctx.fillStyle = 'rgba(34, 211, 238, 0.7)';
         ctx.beginPath();
         ctx.arc(0, 0, e.radius + 2, 0, Math.PI*2);
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
      
      switch(b.visualType) {
          case 'SPEAR': {
              const angle = Math.atan2(b.vel.y, b.vel.x);
              ctx.rotate(angle);
              ctx.shadowColor = 'rgba(0,0,0,0.5)';
              ctx.shadowBlur = 4;
              ctx.fillStyle = '#e2e8f0'; 
              ctx.beginPath();
              ctx.moveTo(25, 0); 
              ctx.lineTo(-10, 4);
              ctx.lineTo(-20, 0); 
              ctx.lineTo(-10, -4);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#cbd5e1'; 
              ctx.beginPath(); ctx.arc(-10, 0, 3, 0, Math.PI*2); ctx.fill();
              ctx.shadowBlur = 0;
              break;
          }
          case 'DAGGER': {
              const angle = Math.atan2(b.vel.y, b.vel.x);
              ctx.rotate(angle);
              ctx.fillStyle = '#22d3ee'; 
              ctx.beginPath();
              ctx.moveTo(15, 0);
              ctx.lineTo(-5, 4);
              ctx.lineTo(-5, -4);
              ctx.fill();
              break;
          }
          case 'BLADE': {
             const spin = (Date.now() / 60) % (Math.PI * 2); 
             ctx.rotate(spin);
             ctx.fillStyle = '#94a3b8'; 
             ctx.beginPath();
             ctx.arc(0, 0, b.radius, Math.PI * 0.5, Math.PI * 1.5); 
             ctx.bezierCurveTo(b.radius * 0.5, -b.radius * 0.5, b.radius * 0.5, b.radius * 0.5, 0, b.radius);
             ctx.fill();
             ctx.strokeStyle = '#f1f5f9';
             ctx.lineWidth = 2;
             ctx.stroke();
             break;
          }
          case 'ORB': {
              const t = gameState.current.gameTime * 8;
              const r = b.radius + Math.sin(t) * 2;
              const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r*1.5);
              grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
              grad.addColorStop(0.4, b.color);
              grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = grad;
              ctx.beginPath(); ctx.arc(0, 0, r*1.5, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = '#fff';
              ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.5, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-b.vel.x * 0.05, -b.vel.y * 0.05); ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.stroke();
              break;
          }
          case 'FIRE': {
              const angle = Math.atan2(b.vel.y, b.vel.x) - Math.PI / 2;
              ctx.rotate(angle);
              const grad = ctx.createLinearGradient(0, 0, 0, -b.radius * 2);
              grad.addColorStop(0, '#fef08a'); 
              grad.addColorStop(0.5, '#f97316'); 
              grad.addColorStop(1, '#ef4444'); 
              ctx.fillStyle = grad;
              ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI); ctx.lineTo(0, -b.radius * 2.5); ctx.closePath(); ctx.fill();
              break;
          }
          case 'POISON': {
              // Pulse alpha
              ctx.globalAlpha = 0.5 + Math.sin(gameState.current.gameTime * 3) * 0.2;
              ctx.fillStyle = '#10b981';
              ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI*2); ctx.fill();
              
              // Bubbles
              ctx.globalAlpha = 0.8;
              ctx.fillStyle = '#34d399';
              const bubbleX = Math.sin(gameState.current.gameTime * 5) * (b.radius * 0.5);
              const bubbleY = Math.cos(gameState.current.gameTime * 3) * (b.radius * 0.5);
              ctx.beginPath(); ctx.arc(bubbleX, bubbleY, b.radius * 0.3, 0, Math.PI*2); ctx.fill();
              
              ctx.globalAlpha = 1.0;
              break;
          }
          case 'METEOR': {
              ctx.shadowBlur = 15;
              ctx.shadowColor = '#c2410c'; 
              ctx.fillStyle = '#431407'; 
              ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath(); ctx.arc(-2, -2, b.radius*0.4, 0, Math.PI*2); ctx.fill();
              ctx.shadowBlur = 0;
              break;
          }
          case 'WAVE': {
              ctx.globalAlpha = 0.4;
              ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI*2); ctx.fillStyle = b.color; ctx.fill();
              ctx.globalAlpha = 1;
              ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
              break;
          }
          default: {
              ctx.fillStyle = b.color;
              ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI*2); ctx.fill();
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
       if(e.type !== EntityType.EXP_GEM && !e.isStatic && !(e.type === EntityType.BULLET && (e as Bullet).isPool)) {
           ctx.fillStyle = 'rgba(0,0,0,0.4)';
           ctx.beginPath(); ctx.ellipse(e.pos.x, e.pos.y + e.radius*0.8, e.radius, e.radius*0.4, 0, 0, Math.PI*2); ctx.fill();
       }

       if (e.type === EntityType.PLAYER || e.type === EntityType.BOT) {
           drawCharacter(ctx, e, e.type === EntityType.PLAYER);
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
           if (e.isStatic) {
               // TOTEM RENDER
               ctx.fillStyle = '#1e3a8a'; // Base
               ctx.fillRect(e.pos.x - 10, e.pos.y, 20, 10);
               ctx.fillStyle = e.color; // Crystal
               const floatY = Math.sin(gameState.current.gameTime * 4) * 5;
               ctx.beginPath();
               ctx.moveTo(e.pos.x, e.pos.y - 10 + floatY);
               ctx.lineTo(e.pos.x + 8, e.pos.y + floatY);
               ctx.lineTo(e.pos.x, e.pos.y + 10 + floatY);
               ctx.lineTo(e.pos.x - 8, e.pos.y + floatY);
               ctx.fill();
               // Electricity
               if (Math.random() > 0.8) {
                   ctx.strokeStyle = '#60a5fa';
                   ctx.lineWidth = 1;
                   ctx.beginPath();
                   ctx.moveTo(e.pos.x, e.pos.y + floatY);
                   ctx.lineTo(e.pos.x + (Math.random()-0.5)*30, e.pos.y + floatY + (Math.random()-0.5)*30);
                   ctx.stroke();
               }
           } else {
               ctx.fillStyle = e.color;
               ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI*2); ctx.fill();
           }
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
            const scale = Math.min(1, p.life * 3); 
            ctx.scale(scale, scale);
            
            ctx.font = `bold ${p.fontSize || 14}px "Exo 2"`;
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.strokeText(p.text, -10, 0); 
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, -10, 0);
            ctx.restore();
        } else {
            ctx.globalAlpha = p.life;
            if (p.type === 'LIGHTNING') {
               ctx.strokeStyle = p.color; ctx.lineWidth = p.width || 2; ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
            } else if (p.type === 'EXPLOSION') {
               ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius*(1.5-p.life), 0, Math.PI*2); ctx.stroke();
            } else if (p.type === 'RING') {
               ctx.strokeStyle = p.color; ctx.lineWidth = p.width || 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.stroke();
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
      if (frameCount % 10 === 0 && playerRef.current) {
        const p = playerRef.current;
        const survivors = entities.current.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.BOT).length;
        
        // Find cooldowns for Q and E
        const dashCD = p.skillCDs['active_void_dash'] || 0;
        const dashMax = SKILL_DATA.active_void_dash.cooldown;
        
        // Find which skill is E
        let skillCD = 0;
        let skillMax = 15;
        let hasSkill = false;
        
        // Check active skills in order
        const activeSkills = ['active_meteor_shower', 'active_holy_barrier', 'active_frost_nova'];
        for (const s of activeSkills) {
            if (p.skills[s]) {
                skillCD = p.skillCDs[s] || 0;
                skillMax = (SKILL_DATA as any)[s].cooldown;
                hasSkill = true;
                break;
            }
        }

        setHudState({
          hp: Math.max(0, p.hp), maxHp: p.maxHp, shield: p.shield, maxShield: p.maxShield, 
          level: p.level, exp: p.exp, expNext: p.expToNextLevel, 
          aliveCount: survivors, time: gameState.current.gameTime, 
          dashCD, dashMaxCD: dashMax, skillCD, skillMaxCD: skillMax,
          hasDash: !!p.skills['active_void_dash'], hasSkill
        });
      }
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
      delete (window as any).SurvivorGamePlayer;
    };
  }, [initGame]);

  useEffect(() => {
    gameState.current.isPaused = isPaused;
  }, [isPaused]);

  // --- REACT HUD UI ---
  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900 cursor-crosshair">
      <canvas 
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="block"
      />
      
      {/* 1. TOP LEFT: PLAYER STATUS */}
      <div className="absolute top-4 left-4 flex items-start gap-4 pointer-events-none select-none">
          {/* Avatar / Level */}
          <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-slate-600 flex items-center justify-center overflow-hidden shadow-lg">
                   <User className="w-10 h-10 text-slate-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-yellow-500 border-2 border-slate-900 flex items-center justify-center text-slate-900 font-black text-sm z-10 shadow">
                   {hudState.level}
              </div>
          </div>
          
          {/* Bars */}
          <div className="flex flex-col gap-1 w-64 pt-1">
               {/* HP */}
               <div className="relative h-6 bg-slate-900/80 rounded-lg border border-slate-600 overflow-hidden shadow-inner">
                   <div 
                      className="h-full transition-all duration-200"
                      style={{ 
                          width: `${(hudState.hp / hudState.maxHp) * 100}%`,
                          backgroundColor: hudState.hp/hudState.maxHp < 0.3 ? COLOR_PALETTE.hpLow : (hudState.hp/hudState.maxHp < 0.6 ? COLOR_PALETTE.hpMid : COLOR_PALETTE.hpHigh)
                      }}
                   />
                   <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                       {Math.ceil(hudState.hp)} / {Math.ceil(hudState.maxHp)}
                   </div>
               </div>
               {/* Shield (Overlay) */}
               {hudState.shield > 0 && (
                   <div className="h-2 w-full bg-slate-900/50 rounded-sm mt-0.5 overflow-hidden">
                       <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, (hudState.shield / hudState.maxHp) * 100)}%` }}></div>
                   </div>
               )}
               {/* EXP */}
               <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden mt-1 border border-slate-700">
                   <div className="h-full bg-amber-400 shadow-[0_0_10px_#fbbf24]" style={{ width: `${(hudState.exp / hudState.expNext) * 100}%` }} />
               </div>
          </div>
      </div>

      {/* 2. TOP CENTER: GAME INFO */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-6 pointer-events-none select-none">
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-6 py-2 rounded-full flex items-center gap-3 shadow-lg">
               <Skull className="w-5 h-5 text-red-500" />
               <span className="font-bold text-slate-200 tracking-wider text-xl font-mono">{hudState.aliveCount}</span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-6 py-2 rounded-full flex items-center gap-3 shadow-lg">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="font-bold text-slate-200 tracking-wider text-xl font-mono">
                  {Math.floor(hudState.time / 60)}:{Math.floor(hudState.time % 60).toString().padStart(2, '0')}
               </span>
          </div>
      </div>

      {/* 3. BOTTOM CENTER: SKILL BAR (MOBA STYLE) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-4 pointer-events-auto select-none">
          
          {/* Skill Q */}
          <div className={`relative w-16 h-16 bg-slate-900 border-2 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-200 shadow-xl ${hudState.hasDash ? 'border-cyan-500 shadow-cyan-500/20' : 'border-slate-700 opacity-50'}`}>
              <div className="absolute top-1 left-1.5 text-xs font-bold text-slate-400 z-20">Q</div>
              <Zap className={`w-8 h-8 ${hudState.dashCD > 0 ? 'text-slate-600' : 'text-cyan-400'}`} />
              
              {/* Radial Cooldown Overlay */}
              {hudState.dashCD > 0 && (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-10 backdrop-blur-[1px]">
                      <span className="text-xl font-black text-white">{hudState.dashCD.toFixed(1)}</span>
                  </div>
              )}
          </div>

          {/* Skill E */}
          <div className={`relative w-20 h-20 bg-slate-900 border-2 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-200 shadow-xl -mb-2 ${hudState.hasSkill ? 'border-orange-500 shadow-orange-500/20' : 'border-slate-700 opacity-50'}`}>
              <div className="absolute top-1 left-1.5 text-xs font-bold text-slate-400 z-20">E</div>
              <Target className={`w-10 h-10 ${hudState.skillCD > 0 ? 'text-slate-600' : 'text-orange-400'}`} />
              
              {/* Vertical Wipe Cooldown */}
              {hudState.skillCD > 0 && (
                  <>
                    <div 
                        className="absolute bottom-0 left-0 w-full bg-slate-950/80 z-10" 
                        style={{ height: `${(hudState.skillCD / hudState.skillMaxCD) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <span className="text-2xl font-black text-white drop-shadow-md">{Math.ceil(hudState.skillCD)}</span>
                    </div>
                  </>
              )}
          </div>

      </div>
      
    </div>
  );
};

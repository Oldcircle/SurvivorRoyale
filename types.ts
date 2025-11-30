
export type Language = 'en' | 'zh';
export type AttackMode = 'AUTO' | 'MANUAL';

export interface LocalizedString {
  en: string;
  zh: string;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  BOT = 'BOT',
  ENEMY = 'ENEMY',
  BULLET = 'BULLET',
  EXP_GEM = 'EXP_GEM',
  CHEST = 'CHEST',
  PET = 'PET'
}

export enum ClassType {
  WARRIOR = 'WARRIOR',
  MAGE = 'MAGE',
  RANGER = 'RANGER'
}

export enum SkillType {
  WEAPON = 'WEAPON', // Auto-fire
  ACTIVE = 'ACTIVE', // Manual (Q/E)
  PASSIVE = 'PASSIVE' // Stat boost
}

export type VisualType = 'DEFAULT' | 'BLADE' | 'ORB' | 'SPEAR' | 'FIRE' | 'METEOR' | 'WAVE' | 'LIGHTNING_SPARK' | 'ICE' | 'DAGGER' | 'POISON' | 'TOTEM';

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector;
  vel: Vector;
  radius: number;
  color: string;
  hp: number;
  maxHp: number;
  dead: boolean;
  
  // Combat stats
  damage: number;
  cooldown: number;
  maxCooldown: number;
  range: number;
  speed: number;
  level: number;
  exp: number;
  expToNextLevel: number;
  
  // Base Upgrades
  projectileCount: number;
  piercing: number;
  
  // New Passive Stats
  armor: number;            // % Damage reduction (0-1)
  flatDamageReduction: number; // Flat damage reduction
  lifesteal: number;        // % of damage dealt returned as HP (0-1)
  magnet: number;           // Pickup range
  xpMult: number;           // XP gain multiplier
  areaScale: number;        // Size of AOE/Projectiles
  regen: number;            // Passive HP/sec (always active)
  critRate: number;         // 0-1
  critDamage: number;       // Multiplier (e.g., 1.5 for 150%)
  
  // Active Status
  invulnerableUntil: number;
  frozenUntil?: number; // New status effect
  shield: number;
  maxShield: number;
  isStatic?: boolean; // For turrets/totems

  name?: string;
  targetId?: string | null; 
  ownerId?: string; // For Pets/Bullets
  lastCombatTime: number; 
  lifeTime?: number; // For temporary entities like Totems

  // Skill System
  skills: { [key: string]: number }; // Skill ID -> Level
  skillCDs: { [key: string]: number }; // Skill ID -> Cooldown remaining
}

export interface Bullet extends Entity {
  ownerId: string; // Override to be non-optional for bullets usually, but Typescript allows intersection
  lifeTime: number;
  pierceCount: number;
  visualType?: VisualType;
  
  // Advanced Behaviors
  isHoming?: boolean;
  homingTargetId?: string;
  turnSpeed?: number;
  
  isOrbit?: boolean;
  orbitAngle?: number;
  orbitDist?: number;
  orbitSpeed?: number;
  
  isBoomerang?: boolean;
  boomerangState?: 'OUT' | 'RETURN';
  
  isExplosive?: boolean;
  explodeRadius?: number;

  isMine?: boolean; // Stationary, explodes on contact
  isWave?: boolean; // Passes through walls/enemies?
  isPool?: boolean; // For poison pools
  
  // New Skill Behaviors
  chainRemaining?: number; // For Lightning
  chainRange?: number;
  chainDecay?: number; // Damage multiplier per jump
  
  delayedExplosion?: boolean; // For Meteor (first phase is warning)
  meteorTarget?: Vector;
}

export interface Upgrade {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  type: SkillType;
  apply: (entity: Entity) => void;
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  winnerId: string | null;
  gameTime: number;
  zoneRadius: number;
  mapWidth: number;
  mapHeight: number;
}


import { ClassType, Upgrade, SkillType } from './types';

export const MAP_SIZE = 3000;
export const INITIAL_ZONE_RADIUS = 2500;
export const ZONE_SHRINK_SPEED = 5;
export const ZONE_DAMAGE_PER_SEC = 20;

export const REGEN_DELAY = 4;
export const REGEN_RATE_PERCENT = 0.10;

// --- ART DIRECTION: NEON CHIBI FANTASY ---
export const COLOR_PALETTE = {
  // World
  background: '#0f172a', // Slate 900 (Deep Navy)
  grid: '#1e293b',       // Slate 800
  zoneSafe: 'rgba(16, 185, 129, 0.02)',
  zoneDanger: 'rgba(239, 68, 68, 0.15)', // Red tint
  zoneBorder: '#ef4444', 

  // Player (Heroic/Cyan)
  playerBody: '#0ea5e9', // Sky 500
  playerBodyDark: '#0369a1', // Sky 700
  playerGlow: 'rgba(14, 165, 233, 0.4)',
  
  // Enemies (Hostile/Red/Purple)
  enemyBody: '#f43f5e', // Rose 500
  enemyBodyDark: '#9f1239', // Rose 800
  enemyElite: '#a855f7', // Purple 500
  enemyEliteDark: '#6b21a8', // Purple 800

  // UI / HUD
  uiBg: 'rgba(15, 23, 42, 0.90)', // Glass dark
  uiBorder: '#334155', // Slate 700
  hpHigh: '#22c55e', // Green
  hpMid: '#eab308',  // Yellow
  hpLow: '#ef4444',  // Red
  xpBar: '#fbbf24',  // Amber
  
  // Text
  textDamage: '#ffffff',
  textCrit: '#facc15', // Yellow
  textHeal: '#4ade80', // Green
};

// --- SKILL DATA TABLE ---
export const SKILL_DATA = {
  // 1. Whirling Blades (Auto)
  weapon_whirling_blades: {
    cooldown: 0, 
    damageBase: 15,
    damageLevel: 5,
    projectileCount: [2, 3, 4, 5, 6],
    orbitRadius: [100, 100, 100, 120, 120],
    rotationTime: 2.0,
    color: '#cbd5e1',
    visualType: 'BLADE'
  },
  // 2. Arcane Orbs (Auto)
  weapon_arcane_orbs: {
    cooldown: 1.5,
    cooldownLevel: -0.05,
    damageBase: 20,
    damageLevel: 8,
    count: [1, 2, 2, 3, 3],
    speed: 350,
    explodeRadius: 60,
    color: '#8b5cf6',
    visualType: 'ORB'
  },
  // 3. Chain Lightning (Auto)
  weapon_chain_lightning: {
    cooldown: 2.0,
    damageBase: 35,
    damageLevel: 10,
    jumps: [3, 4, 4, 5, 5],
    jumpRadius: 250,
    decay: 0.85,
    color: '#facc15',
    visualType: 'LIGHTNING_SPARK'
  },
  // 4. Bone Spear (Auto)
  weapon_bone_spear: {
    cooldown: 1.2,
    damageBase: 25,
    damageLevel: 6,
    pierce: [3, 4, 4, 5, 5],
    speed: 600,
    range: 600,
    color: '#f1f5f9',
    visualType: 'SPEAR'
  },
  // 5. Dragon Scion (Summon)
  summon_dragon_scion: {
    cooldown: 0,
    attackCooldown: 1.5,
    attackCooldownLevel: -0.1,
    damageBase: 25,
    damageLevel: 5,
    range: 400,
    projectileSpeed: 500,
    color: '#ef4444',
    visualType: 'FIRE'
  },
  
  // 6. Void Dash (Active - Q)
  active_void_dash: {
    cooldown: 6.0,
    cooldownLevel: -0.5,
    dist: 250,
    invulnDuration: 0.4,
    color: '#1e293b',
    visualType: 'DEFAULT'
  },
  // 7. Meteor Shower (Active - E)
  active_meteor_shower: {
    cooldown: 15.0,
    cooldownLevel: -0.5,
    damageBase: 50,
    damageLevel: 15,
    count: [6, 8, 8, 10, 12],
    radius: 250,
    aoe: 80, 
    delay: 0.8,
    color: '#f97316',
    visualType: 'METEOR'
  },
  // 8. Holy Barrier (Active - E/R)
  active_holy_barrier: {
    cooldown: 18.0,
    cooldownLevel: -0.5,
    duration: 5.0,
    shieldPct: 0.15,
    shieldLevel: 0.03,
    dotDamage: 10,
    slow: 0.3,
    radius: 150,
    color: '#fef08a',
    visualType: 'WAVE'
  }
};

export const CLASS_STATS = {
  [ClassType.WARRIOR]: {
    hp: 250,
    speed: 190,
    damage: 30,
    range: 160,
    cooldown: 0.6,
    color: '#ef4444', 
    colorDark: '#991b1b',
    projectileCount: 1,
    desc: { en: 'High HP, Melee Cleave', zh: '高血量，近战横扫' }
  },
  [ClassType.MAGE]: {
    hp: 120,
    speed: 180,
    damage: 45,
    range: 550,
    cooldown: 1.1,
    color: '#3b82f6', 
    colorDark: '#1e40af',
    projectileCount: 1,
    desc: { en: 'High Dmg, Long Range', zh: '高伤害，远程' }
  },
  [ClassType.RANGER]: {
    hp: 150,
    speed: 220,
    damage: 18,
    range: 450,
    cooldown: 0.25,
    color: '#22c55e', 
    colorDark: '#15803d',
    projectileCount: 1,
    desc: { en: 'Fast, Rapid Fire', zh: '高攻速，中射程' }
  }
};

export const UPGRADES: Upgrade[] = [
  // --- AUTO WEAPONS ---
  {
    id: 'weapon_whirling_blades',
    type: SkillType.WEAPON,
    name: { en: 'Whirling Blades', zh: '旋刃环' },
    description: { en: 'Summons orbiting blades.', zh: '召唤环绕自身的利刃。' },
    rarity: 'COMMON',
    apply: (e) => { e.skills['weapon_whirling_blades'] = (e.skills['weapon_whirling_blades'] || 0) + 1; }
  },
  {
    id: 'weapon_arcane_orbs',
    type: SkillType.WEAPON,
    name: { en: 'Arcane Orbs', zh: '奥术弹幕' },
    description: { en: 'Fires homing magic missiles.', zh: '发射追踪敌人的魔法飞弹。' },
    rarity: 'RARE',
    apply: (e) => { e.skills['weapon_arcane_orbs'] = (e.skills['weapon_arcane_orbs'] || 0) + 1; }
  },
  {
    id: 'weapon_chain_lightning',
    type: SkillType.WEAPON,
    name: { en: 'Chain Lightning', zh: '链式闪电' },
    description: { en: 'Lightning bounces between enemies.', zh: '在敌人之间弹跳的闪电。' },
    rarity: 'EPIC',
    apply: (e) => { e.skills['weapon_chain_lightning'] = (e.skills['weapon_chain_lightning'] || 0) + 1; }
  },
  {
    id: 'weapon_bone_spear',
    type: SkillType.WEAPON,
    name: { en: 'Bone Spear', zh: '骨矛' },
    description: { en: 'Piercing projectile in movement direction.', zh: '向移动方向发射穿透骨矛。' },
    rarity: 'COMMON',
    apply: (e) => { e.skills['weapon_bone_spear'] = (e.skills['weapon_bone_spear'] || 0) + 1; }
  },
  {
    id: 'summon_dragon_scion',
    type: SkillType.WEAPON,
    name: { en: 'Dragon Scion', zh: '龙之子' },
    description: { en: 'Summons a dragon that fights for you.', zh: '召唤一条为你而战的幼龙。' },
    rarity: 'LEGENDARY',
    apply: (e) => { e.skills['summon_dragon_scion'] = (e.skills['summon_dragon_scion'] || 0) + 1; }
  },

  // --- ACTIVE SKILLS ---
  {
    id: 'active_void_dash',
    type: SkillType.ACTIVE,
    name: { en: 'Void Dash (Q)', zh: '虚空闪步 (Q)' },
    description: { en: 'Dash and become invulnerable temporarily.', zh: '冲刺并获得短暂无敌。' },
    rarity: 'RARE',
    apply: (e) => { e.skills['active_void_dash'] = (e.skills['active_void_dash'] || 0) + 1; }
  },
  {
    id: 'active_meteor_shower',
    type: SkillType.ACTIVE,
    name: { en: 'Meteor Shower (E)', zh: '星陨坠落 (E)' },
    description: { en: 'Call down meteors in an area.', zh: '在区域内召唤陨石雨。' },
    rarity: 'EPIC',
    apply: (e) => { e.skills['active_meteor_shower'] = (e.skills['active_meteor_shower'] || 0) + 1; }
  },
  {
    id: 'active_holy_barrier',
    type: SkillType.ACTIVE,
    name: { en: 'Holy Barrier (E)', zh: '圣光结界 (E)' },
    description: { en: 'Gain shield and damage aura.', zh: '获得护盾与伤害光环。' },
    rarity: 'RARE',
    apply: (e) => { e.skills['active_holy_barrier'] = (e.skills['active_holy_barrier'] || 0) + 1; }
  },

  // --- PASSIVES ---
  {
    id: 'passive_bloodthirst',
    type: SkillType.PASSIVE,
    name: { en: 'Bloodthirst', zh: '嗜血本能' },
    description: { en: 'Lifesteal on damage.', zh: '造成伤害时吸取生命。' },
    rarity: 'EPIC',
    apply: (e) => { e.lifesteal += 0.05; }
  },
  {
    id: 'passive_hardened_body',
    type: SkillType.PASSIVE,
    name: { en: 'Hardened Body', zh: '强化体魄' },
    description: { en: 'Max HP +10%, Damage Taken -5.', zh: '最大生命 +10%，固定减伤 5。' },
    rarity: 'COMMON',
    apply: (e) => { e.maxHp = Math.floor(e.maxHp * 1.1); e.hp = Math.floor(e.hp * 1.1); e.flatDamageReduction += 5; }
  },
  {
    id: 'passive_quick_cooldown',
    type: SkillType.PASSIVE,
    name: { en: 'Quick Cooldown', zh: '快速冷却' },
    description: { en: 'Cooldowns reduced by 8%.', zh: '技能冷却减少 8%。' },
    rarity: 'RARE',
    apply: (e) => { e.maxCooldown *= 0.92; } 
  },
  {
    id: 'passive_projectile_mastery',
    type: SkillType.PASSIVE,
    name: { en: 'Projectile Mastery', zh: '弹幕增幅' },
    description: { en: '+1 Projectile, +15% Speed.', zh: '投射物 +1，飞行速度 +15%。' },
    rarity: 'LEGENDARY',
    apply: (e) => { e.projectileCount += 1; } 
  },
  {
    id: 'passive_hunter_instinct',
    type: SkillType.PASSIVE,
    name: { en: 'Hunter Instinct', zh: '狩猎直觉' },
    description: { en: '+15% EXP, +25% Pickup Range.', zh: '经验获取 +15%，拾取范围 +25%。' },
    rarity: 'COMMON',
    apply: (e) => { e.xpMult += 0.15; e.magnet += 50; }
  },
  {
    id: 'passive_weakening_curse',
    type: SkillType.PASSIVE,
    name: { en: 'Weakening Curse', zh: '削弱诅咒' },
    description: { en: 'Nearby enemies deal 10% less damage.', zh: '附近敌人伤害降低 10%。' },
    rarity: 'RARE',
    apply: (e) => { /* Logic in damage calc */ }
  },
  {
    id: 'passive_lethal_precision',
    type: SkillType.PASSIVE,
    name: { en: 'Lethal Precision', zh: '致命一击' },
    description: { en: '+8% Crit Rate, +30% Crit Dmg.', zh: '暴击率 +8%，暴击伤害 +30%。' },
    rarity: 'EPIC',
    apply: (e) => { e.critRate += 0.08; e.critDamage += 0.3; }
  }
];

export const BOT_NAMES = [
  "ShadowSlayer", "NoobMaster69", "TheLegend27", "GladiatorX", 
  "CyberPunk", "Viper", "Ghost", "Kratos", "Jinx", "YasuoMain",
  "DragonBorn", "Slayer", "Hunter", "Predator", "Terminator"
];

export const TEXTS = {
  en: {
    title: "SURVIVOR ROYALE",
    subtitle: "Outlast. Outgun. Evolve.",
    selectHunter: "Select Hunter",
    enterBattle: "ENTER BATTLEFIELD",
    alive: "ALIVE",
    time: "TIME",
    levelUp: "LEVEL UP",
    victory: "VICTORY",
    eliminated: "ELIMINATED",
    victoryMsg: "You are the last survivor.",
    eliminatedMsg: "Better luck next time, Hunter.",
    levelReached: "Level Reached",
    zoneStatus: "Zone Status",
    closed: "Closed",
    backMenu: "Back to Menu",
    hp: "HP",
    shield: "SHIELD",
    level: "LVL",
    ready: "READY",
    cd: "CD"
  },
  zh: {
    title: "幸存者大逃杀",
    subtitle: "生存 · 猎杀 · 进化",
    selectHunter: "选择猎手",
    enterBattle: "进入战场",
    alive: "存活",
    time: "时间",
    levelUp: "升级强化",
    victory: "大吉大利",
    eliminated: "你被淘汰了",
    victoryMsg: "你是最后的幸存者。",
    eliminatedMsg: "胜败乃兵家常事，少侠请重新来过。",
    levelReached: "最终等级",
    zoneStatus: "毒圈状态",
    closed: "已闭合",
    backMenu: "返回菜单",
    hp: "生命",
    shield: "护盾",
    level: "等级",
    ready: "就绪",
    cd: "冷却"
  }
};

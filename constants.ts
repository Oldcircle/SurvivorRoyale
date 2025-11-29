
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
    damageBase: 12,
    damageLevel: 6,
    projectileCount: [2, 3, 4],
    orbitRadius: [90, 110, 130],
    rotationTime: 2.2,
    color: '#cbd5e1',
    visualType: 'BLADE'
  },
  // 2. Arcane Orbs (Auto)
  weapon_arcane_orbs: {
    cooldown: 1.3,
    cooldownLevel: -0.1,
    damageBase: 22,
    damageLevel: 8,
    count: [1, 2, 3],
    speed: 400,
    explodeRadius: 70,
    color: '#8b5cf6',
    visualType: 'ORB'
  },
  // 3. Chain Lightning (Auto)
  weapon_chain_lightning: {
    cooldown: 1.8,
    damageBase: 28,
    damageLevel: 8,
    jumps: [3, 4, 5],
    jumpRadius: 260,
    decay: 0.85,
    color: '#facc15',
    visualType: 'LIGHTNING_SPARK'
  },
  // 4. Bone Spear (Auto)
  weapon_bone_spear: {
    cooldown: 1.0,
    damageBase: 22,
    damageLevel: 6,
    pierce: [3, 4, 5],
    speed: 650,
    range: 650,
    color: '#f1f5f9',
    visualType: 'SPEAR'
  },
  // 5. Dragon Scion (Summon)
  summon_dragon_scion: {
    cooldown: 0,
    attackCooldown: 1.8,
    attackCooldownLevel: -0.1,
    damageBase: 25,
    damageLevel: 5,
    range: 400,
    projectileSpeed: 500,
    color: '#ef4444',
    visualType: 'FIRE'
  },
  // 6. Phantom Daggers (Synergy: Frost)
  weapon_phantom_daggers: {
    cooldown: 0.9,
    cooldownLevel: -0.1,
    damageBase: 28,
    damageLevel: 8,
    count: [2, 3, 4],
    speed: 750,
    color: '#22d3ee',
    visualType: 'DAGGER'
  },
  // 7. Thunder Totem (Synergy: Lightning)
  weapon_thunder_totem: {
    cooldown: 12,
    duration: 10,
    damageBase: 18,
    damageLevel: 6,
    attackSpeed: 0.6,
    range: 320,
    color: '#3b82f6', // Blue
    visualType: 'TOTEM'
  },
  // 8. Toxic Canister (Area)
  weapon_toxic_gas: {
    cooldown: 3.8,
    damageBase: 9,
    damageLevel: 3,
    duration: 6.0,
    radius: 140,
    color: '#10b981', // Emerald
    visualType: 'POISON'
  },
  
  // --- ACTIVE SKILLS ---
  
  // 9. Void Dash (Active - Q)
  active_void_dash: {
    cooldown: 7.0,
    cooldownLevel: -0.5,
    dist: 250,
    invulnDuration: 0.45,
    color: '#1e293b',
    visualType: 'DEFAULT'
  },
  // 10. Meteor Shower (Active - E)
  active_meteor_shower: {
    cooldown: 16.0,
    cooldownLevel: -0.5,
    damageBase: 45,
    damageLevel: 12,
    count: [5, 8, 12],
    radius: 260,
    aoe: 90,
    delay: 0.7,
    color: '#f97316',
    visualType: 'METEOR'
  },
  // 11. Holy Barrier (Active - E/R)
  active_holy_barrier: {
    cooldown: 20.0,
    cooldownLevel: -0.5,
    duration: 6.0,
    shieldPct: 0.12,
    shieldLevel: 0.03,
    dotDamage: 8,
    slow: 0.25,
    radius: 160,
    color: '#fef08a',
    visualType: 'WAVE'
  },
  // 12. Frost Nova (Active - E)
  active_frost_nova: {
    cooldown: 12.0,
    cooldownLevel: -0.5,
    radius: 360,
    duration: 2.5, // Freeze time
    damageBase: 15,
    color: '#06b6d4',
    visualType: 'ICE'
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
    description: { en: 'Orbiting blades cleave nearby foes. Pairs with Barrier.', zh: '环绕利刃切割附近敌人。与结界配合更强。' },
    rarity: 'COMMON',
    apply: (e) => { const cur=(e.skills['weapon_whirling_blades']||0); if(cur>=3) return; e.skills['weapon_whirling_blades']=cur+1; }
  },
  {
    id: 'weapon_arcane_orbs',
    type: SkillType.WEAPON,
    name: { en: 'Arcane Orbs', zh: '奥术弹幕' },
    description: { en: 'Homing orbs explode on impact.', zh: '追踪法球命中后爆炸。' },
    rarity: 'RARE',
    apply: (e) => { const cur=(e.skills['weapon_arcane_orbs']||0); if(cur>=3) return; e.skills['weapon_arcane_orbs']=cur+1; }
  },
  {
    id: 'weapon_chain_lightning',
    type: SkillType.WEAPON,
    name: { en: 'Chain Lightning', zh: '链式闪电' },
    description: { en: 'Bounces between enemies. Hitting Totems triggers overload.', zh: '在敌人间弹跳。击中图腾会过载引爆。' },
    rarity: 'EPIC',
    apply: (e) => { const cur=(e.skills['weapon_chain_lightning']||0); if(cur>=3) return; e.skills['weapon_chain_lightning']=cur+1; }
  },
  {
    id: 'weapon_bone_spear',
    type: SkillType.WEAPON,
    name: { en: 'Bone Spear', zh: '骨矛' },
    description: { en: 'Piercing spear along movement direction.', zh: '沿移动方向发射穿透骨矛。' },
    rarity: 'COMMON',
    apply: (e) => { const cur=(e.skills['weapon_bone_spear']||0); if(cur>=3) return; e.skills['weapon_bone_spear']=cur+1; }
  },
  {
    id: 'summon_dragon_scion',
    type: SkillType.WEAPON,
    name: { en: 'Dragon Scion', zh: '龙之子' },
    description: { en: 'Summons a dragon ally with ranged attacks.', zh: '召唤远程攻击的幼龙盟友。' },
    rarity: 'LEGENDARY',
    apply: (e) => { const cur=(e.skills['summon_dragon_scion']||0); if(cur>=3) return; e.skills['summon_dragon_scion']=cur+1; }
  },
  {
    id: 'weapon_phantom_daggers',
    type: SkillType.WEAPON,
    name: { en: 'Phantom Daggers', zh: '幻影匕首' },
    description: { en: 'Throw daggers backward. 2.5x vs Frozen, auto crit.', zh: '向背后投掷匕首。对冰冻敌人2.5倍并必定暴击。' },
    rarity: 'RARE',
    apply: (e) => { const cur=(e.skills['weapon_phantom_daggers']||0); if(cur>=3) return; e.skills['weapon_phantom_daggers']=cur+1; }
  },
  {
    id: 'weapon_thunder_totem',
    type: SkillType.WEAPON,
    name: { en: 'Thunder Totem', zh: '雷霆图腾' },
    description: { en: 'Summon a totem. Lightning on it triggers overload blast.', zh: '召唤图腾。闪电击中时触发过载爆炸。' },
    rarity: 'EPIC',
    apply: (e) => { const cur=(e.skills['weapon_thunder_totem']||0); if(cur>=3) return; e.skills['weapon_thunder_totem']=cur+1; }
  },
  {
    id: 'weapon_toxic_gas',
    type: SkillType.WEAPON,
    name: { en: 'Toxic Canister', zh: '剧毒瓦斯' },
    description: { en: 'Create poison pools that deal damage over time.', zh: '生成持续伤害的毒池。' },
    rarity: 'COMMON',
    apply: (e) => { const cur=(e.skills['weapon_toxic_gas']||0); if(cur>=3) return; e.skills['weapon_toxic_gas']=cur+1; }
  },

  // --- ACTIVE SKILLS ---
  {
    id: 'active_void_dash',
    type: SkillType.ACTIVE,
    name: { en: 'Void Dash (Q)', zh: '虚空闪步 (Q)' },
    description: { en: 'Dash with brief invulnerability.', zh: '冲刺并获得短暂无敌。' },
    rarity: 'RARE',
    apply: (e) => { const cur=(e.skills['active_void_dash']||0); if(cur>=3) return; e.skills['active_void_dash']=cur+1; }
  },
  {
    id: 'active_meteor_shower',
    type: SkillType.ACTIVE,
    name: { en: 'Meteor Shower (E)', zh: '星陨坠落 (E)' },
    description: { en: 'Call down meteors that explode in area.', zh: '召唤会爆炸的陨石雨。' },
    rarity: 'EPIC',
    apply: (e) => { const cur=(e.skills['active_meteor_shower']||0); if(cur>=3) return; e.skills['active_meteor_shower']=cur+1; }
  },
  {
    id: 'active_holy_barrier',
    type: SkillType.ACTIVE,
    name: { en: 'Holy Barrier (E)', zh: '圣光结界 (E)' },
    description: { en: 'Gain shield and slowing damage aura.', zh: '获得护盾并附带减速伤害光环。' },
    rarity: 'RARE',
    apply: (e) => { const cur=(e.skills['active_holy_barrier']||0); if(cur>=3) return; e.skills['active_holy_barrier']=cur+1; }
  },
  {
    id: 'active_frost_nova',
    type: SkillType.ACTIVE,
    name: { en: 'Frost Nova (E)', zh: '极寒新星 (E)' },
    description: { en: 'Freeze nearby enemies; combos with daggers and lightning.', zh: '冻结周围敌人；与匕首和闪电有联动。' },
    rarity: 'EPIC',
    apply: (e) => { const cur=(e.skills['active_frost_nova']||0); if(cur>=3) return; e.skills['active_frost_nova']=cur+1; }
  },

  // --- PASSIVES ---
  {
    id: 'passive_bloodthirst',
    type: SkillType.PASSIVE,
    name: { en: 'Bloodthirst', zh: '嗜血本能' },
    description: { en: 'Gain lifesteal on dealing damage.', zh: '造成伤害时获得吸血效果。' },
    rarity: 'EPIC',
    apply: (e) => { const cur=(e.skills['passive_bloodthirst']||0); if(cur>=3) return; e.skills['passive_bloodthirst']=cur+1; e.lifesteal += 0.04; }
  },
  {
    id: 'passive_hardened_body',
    type: SkillType.PASSIVE,
    name: { en: 'Hardened Body', zh: '强化体魄' },
    description: { en: 'Max HP +10%, Damage Taken -5.', zh: '最大生命 +10%，固定减伤 5。' },
    rarity: 'COMMON',
    apply: (e) => { const cur=(e.skills['passive_hardened_body']||0); if(cur>=3) return; e.skills['passive_hardened_body']=cur+1; e.maxHp = Math.floor(e.maxHp * 1.1); e.hp = Math.floor(e.hp * 1.1); e.flatDamageReduction += 5; }
  },
  {
    id: 'passive_quick_cooldown',
    type: SkillType.PASSIVE,
    name: { en: 'Quick Cooldown', zh: '快速冷却' },
    description: { en: 'Cooldowns reduced by 10%.', zh: '技能冷却减少 10%。' },
    rarity: 'RARE',
    apply: (e) => { const cur=(e.skills['passive_quick_cooldown']||0); if(cur>=3) return; e.skills['passive_quick_cooldown']=cur+1; e.maxCooldown *= 0.90; } 
  },
  {
    id: 'passive_projectile_mastery',
    type: SkillType.PASSIVE,
    name: { en: 'Projectile Mastery', zh: '弹幕增幅' },
    description: { en: '+1 Projectile, +15% Speed.', zh: '投射物 +1，飞行速度 +15%。' },
    rarity: 'LEGENDARY',
    apply: (e) => { const cur=(e.skills['passive_projectile_mastery']||0); if(cur>=3) return; e.skills['passive_projectile_mastery']=cur+1; e.projectileCount += 1; } 
  },
  {
    id: 'passive_hunter_instinct',
    type: SkillType.PASSIVE,
    name: { en: 'Hunter Instinct', zh: '狩猎直觉' },
    description: { en: '+15% EXP, +25% Pickup Range.', zh: '经验获取 +15%，拾取范围 +25%。' },
    rarity: 'COMMON',
    apply: (e) => { const cur=(e.skills['passive_hunter_instinct']||0); if(cur>=3) return; e.skills['passive_hunter_instinct']=cur+1; e.xpMult += 0.15; e.magnet += 50; }
  },
  {
    id: 'passive_weakening_curse',
    type: SkillType.PASSIVE,
    name: { en: 'Weakening Curse', zh: '削弱诅咒' },
    description: { en: 'Nearby enemies deal 10% less damage.', zh: '附近敌人伤害降低 10%。' },
    rarity: 'RARE',
    apply: (e) => { const cur=(e.skills['passive_weakening_curse']||0); if(cur>=3) return; e.skills['passive_weakening_curse']=cur+1; }
  },
  {
    id: 'passive_lethal_precision',
    type: SkillType.PASSIVE,
    name: { en: 'Lethal Precision', zh: '致命一击' },
    description: { en: '+8% Crit Rate, +30% Crit Dmg.', zh: '暴击率 +8%，暴击伤害 +30%。' },
    rarity: 'EPIC',
    apply: (e) => { const cur=(e.skills['passive_lethal_precision']||0); if(cur>=3) return; e.skills['passive_lethal_precision']=cur+1; e.critRate += 0.08; e.critDamage += 0.3; }
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

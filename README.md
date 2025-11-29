# Survivor Royale / 幸存者大逃杀

![Game Banner](https://via.placeholder.com/800x200/0f172a/38bdf8?text=SURVIVOR+ROYALE)

**Survivor Royale** is a fast-paced, top-down multiplayer battle royale roguelike game built with React and HTML5 Canvas. Survive against monster tides, outrun the shrinking safety zone, and defeat rival hunters (AI bots) to be the last one standing.

**Survivor Royale** 是一款基于 React 和 HTML5 Canvas 开发的快节奏上帝视角大逃杀类 Roguelike 游戏。你需要在怪物的潮水中生存下来，逃离不断缩小的毒圈，并击败竞争对手（AI 猎人），成为最后的幸存者。

---

## 🎮 Game Features / 游戏特性

### 1. Unique Classes / 三大职业
*   **Warrior (战士)**: High HP, close-range AOE attacks. Tanky and reliable.
    *   *高血量，近战范围伤害，生存能力强。*
*   **Mage (法师)**: High damage, long-range magic missiles. Glass cannon.
    *   *高爆发，远程魔法飞弹，输出恐怖但身板脆弱。*
*   **Ranger (游侠)**: High speed, rapid-fire attacks. Great at kiting.
    *   *高机动，极速射击，擅长风筝敌人。*

### 2. Deep Skill System / 深度技能系统
*   **Roguelike Progression**: Collect EXP gems to level up. Pick from 3 random upgrades. Each skill caps at **Lv 3**; maxed skills **won’t appear** again.
    *   *肉鸽成长：收集经验宝石升级，每次从 3 个随机选项中选择。每个技能最高 **3 级**；已满级技能 **不再出现**。*
*   **Combo Synergies (元素联动)**: Skills enhance each other.
    *   **Frost Shatter**: Use *Frost Nova* to freeze, then *Phantom Daggers* deal **2.5x + guaranteed crit**. *(冰冻→匕首：极寒新星冻结后，幻影匕首造成 **2.5倍 并必定暴击**)*
    *   **Thunder Overload**: Hitting your *Thunder Totem* with *Chain Lightning* triggers a controlled area blast. *(过载：链式闪电击中己方雷霆图腾，触发可控范围爆炸)*

### 3. Advanced AI / 智能 AI 对手
*   **Bot Behavior**: 14 AI opponents farm, kite, and upgrade. Enhanced avoidance keeps distance from mobs, uses dash/Frost Nova defensively, and activates Holy Barrier when swarmed.
    *   *AI 优化：AI 主动与怪物保持距离，近身时使用闪步/极寒新星自保，被围时启用圣光结界。*

---

## 🕹️ Controls / 操作指南

| Action / 动作 | Key / 按键 | Description / 说明 |
| :--- | :--- | :--- |
| **Move / 移动** | `W` `A` `S` `D` or `Arrows` | Move your character. (控制角色移动) |
| **Dash / 闪避** | `Q` | Quick dash + temporary invulnerability. (快速冲刺并获得短暂无敌，可躲避伤害) |
| **Skill / 技能** | `E` | Cast your active skill (e.g., Meteor Shower, Frost Nova). (释放主动技能，如陨石雨、冰环) |
| **Aim / 瞄准** | `Mouse / 鼠标` | Aim your active skills and dash direction. (控制技能瞄准和冲刺方向) |

---

## 🛠️ Tech Stack / 技术栈

*   **Core**: React 19, TypeScript
*   **Rendering Engine**: Custom HTML5 Canvas (Optimized for 1000+ entities)
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **State Management**: React Hooks (useRef for game loop, useState for UI)

## 🚀 Development / 开发说明

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start local server**:
    ```bash
    npm run dev
    ```
    Local: `http://localhost:3000/SurvivorRoyale/`

3.  **Build for production**:
    ```bash
    npm run build
    ```

## 📚 Systems Overview / 系统总览

- **Classes / 职业**：战士（近战稳健）、法师（远程爆发）、游侠（高机动高射速）
- **Skills / 技能**：分为自动武器、主动技能、被动强化；技能最高 Lv 3，满级后不再出现。
- **Synergies / 联动**：冻结→匕首爆发；图腾→闪电过载；结界→旋刃近战稳场。
- **AI / 人工智能**：避弹、避怪、风筝、捡经验、条件释放技能，整体更贴近真人操作逻辑。

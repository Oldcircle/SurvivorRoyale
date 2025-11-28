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
*   **Roguelike Progression**: Level up by collecting EXP gems dropped by enemies. Choose from random upgrades to build your unique character.
    *   *肉鸽成长：收集怪物掉落的经验宝石升级，从随机选项中选择武器和被动，构筑你的专属流派。*
*   **Combo Synergies (元素连携)**: Skills interact with each other!
    *   **Frost Shatter**: Freeze enemies with *Frost Nova*, then hit them with *Phantom Daggers* for **3x Critical Damage**. (冰冻连招：先用极寒新星冻住敌人，再用幻影匕首造成3倍暴击)
    *   **Thunder Overload**: Hit your own *Thunder Totem* with *Chain Lightning* to trigger a massive area explosion. (过载反应：用链式闪电击中自己的雷霆图腾，引发大范围爆炸)

### 3. Advanced AI / 智能 AI 对手
*   **Bot Behavior**: 14 AI opponents fight alongside you. They will farm monsters, upgrade themselves, kite enemies, and even dodge your bullets and skills using predictive movement.
    *   *像真人一样的电脑对手：14名 AI 猎人会和你一起发育。它们会打怪升级、风筝敌人，甚至通过预判弹道来躲避你的攻击和技能。*

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
    npm start
    ```

3.  **Build for production**:
    ```bash
    npm run build
    ```

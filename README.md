# Phaser Roguelike 地牢冒险游戏

<div align="center">

![GitHub](https://img.shields.io/github/license/datehoer/Roguelike)
![Version](https://img.shields.io/badge/version-1.0-blue)
![Phaser](https://img.shields.io/badge/Phaser-3.x-orange)
![Language](https://img.shields.io/badge/language-JavaScript-yellow)

一个基于 Phaser.js 开发的现代 Roguelike 地牢探险游戏，具有程序生成地牢、升级系统和动态难度调节。

[在线试玩](#) | [功能特性](#功能特性) | [快速开始](#快速开始) | [项目结构](#项目结构)

</div>

## 📋 目录

- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [游戏玩法](#游戏玩法)
- [开发指南](#开发指南)
- [配置说明](#配置说明)
- [性能优化](#性能优化)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## ✨ 功能特性

### 🎮 核心游戏特性
- **程序生成地牢**: 每次游戏都有独特的地牢布局
- **实时战斗系统**: 流畅的鼠标点击射击机制
- **智能敌人AI**: 敌人会追踪玩家并避免碰撞
- **动态难度调节**: 基于分数的智能敌人生成
- **升级系统**: 多种升级路径，包括多重射击、散射模式等
- **本地排行榜**: 记录和展示最高分数

### 🔧 技术特性
- **模块化场景系统**: 清晰分离的游戏场景管理
- **智能敌人生成**: 基于玩家位置的动态敌人生成算法
- **响应式UI**: 自适应的用户界面设计
- **性能优化**: 对象池和高效的碰撞检测
- **跨浏览器兼容**: 支持现代浏览器

## 🏗️ 技术架构

### 核心技术栈
- **游戏引擎**: Phaser 3.x
- **开发语言**: JavaScript (ES6+ Modules)
- **物理引擎**: Arcade Physics
- **构建工具**: 原生ES6模块 (无需打包工具)
- **部署**: 静态文件部署

### 架构设计
```
roguelike/
├── 游戏引擎层 (Phaser.js)
├── 场景管理层 (Scene System)
├── 游戏逻辑层 (Game Logic)
├── 资源管理层 (Asset Management)
└── 工具类层 (Utilities)
```

## 🚀 快速开始

### 环境要求
- 现代浏览器 (Chrome 80+, Firefox 74+, Safari 13+, Edge 80+)
- 本地HTTP服务器 (用于ES6模块加载)

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/datehoer/Roguelike.git
cd roguelike
```

2. **启动开发服务器**

使用 Python (推荐):
```bash
# Python 3.x
python -m http.server 8000

# Python 2.x
python -m SimpleHTTPServer 8000
```

使用 Node.js:
```bash
npx http-server -p 8000
```

使用 Live Server (VS Code):
```bash
# 安装 Live Server 扩展
# 右键 index.html -> "Open with Live Server"
```

3. **访问游戏**
```
打开浏览器访问: http://localhost:8000
```

## 📁 项目结构

```
roguelike/
├── index.html                 # 主入口文件
├── phaser.min.js              # Phaser 游戏引擎
├── README.md                  # 项目文档
└── src/                       # 源代码目录
    ├── main.js                # 游戏主配置文件
    ├── scenes/                # 游戏场景
    │   ├── MenuScene.js       # 主菜单场景
    │   ├── PreloaderScene.js  # 资源预加载场景
    │   ├── GameScene.js       # 核心游戏场景
    │   ├── UIScene.js         # 用户界面场景
    │   ├── PauseScene.js      # 暂停菜单场景
    │   ├── UpgradeScene.js    # 升级选择场景
    │   ├── GameOverScene.js   # 游戏结束场景
    │   └── LeaderboardScene.js # 排行榜场景
    └── utils/                 # 工具类
        ├── UpgradeManager.js  # 升级系统管理
        └── ScoreManager.js    # 分数管理系统
```

### 核心文件说明

#### 🎯 `src/main.js`
游戏主配置文件，定义了:
- 游戏画布尺寸 (800x600)
- 物理引擎配置 (Arcade Physics)
- 场景加载顺序

#### 🎮 `src/scenes/GameScene.js` (881行)
核心游戏逻辑，包含:
- 程序化地牢生成算法
- 玩家移动和射击控制
- 敌人AI和生成系统
- 碰撞检测和伤害处理
- 升级触发机制

#### 🔄 `src/utils/UpgradeManager.js` (226行)
升级系统核心，管理:
- 4种升级类型 (多重射击、散射、血量、速度)
- 动态升级触发机制
- 升级选项随机生成

## 🎮 游戏玩法

### 基础操作
- **移动**: 方向键 或 WASD 键
- **射击**: 鼠标左键点击
- **暂停**: ESC 键

### 游戏目标
- 在程序生成的地牢中生存
- 击败敌人获得分数
- 通过升级强化角色
- 挑战更高的分数记录

### 升级系统
| 升级类型 | 效果描述 | 最大等级 |
|---------|---------|---------|
| 🔫 多重射击 | 增加每次射击的子弹数量 | 5级 |
| 🌟 散射模式 | 增加射击方向数量 | 4级 |
| ❤️ 生命强化 | 增加最大生命值 | 5级 |
| 💨 速度提升 | 增加移动速度 | 5级 |

### 难度系统
游戏具有动态难度调节机制:
- 基于分数增加敌人数量
- 缩短敌人重生间隔
- 智能敌人分布算法

## 🛠️ 开发指南

### 添加新场景
1. 在 `src/scenes/` 目录创建新场景文件
2. 继承 `Phaser.Scene` 类
3. 在 `src/main.js` 中注册场景

```javascript
// 示例：创建新场景
export default class NewScene extends Phaser.Scene {
    constructor() {
        super('NewScene');
    }
    
    create() {
        // 场景初始化逻辑
    }
}
```

### 添加新升级类型
1. 在 `UpgradeManager.UPGRADE_TYPES` 中定义新类型
2. 在 `UpgradeManager.UPGRADE_DATA` 中配置参数
3. 在 `GameScene.applyUpgrade` 中实现升级效果

### 修改地牢生成
编辑 `GameScene.generateDungeon()` 方法:
- 调整房间数量: `maxRooms`
- 修改房间大小: `minRoomSize`, `maxRoomSize`
- 改变连接算法: `connectRooms()` 方法

### 自定义敌人AI
修改 `GameScene.handleEnemyMovement()` 方法:
- 调整追踪速度
- 添加新的移动模式
- 实现群体行为

## ⚙️ 配置说明

### 游戏配置 (`src/main.js`)
```javascript
const config = {
    width: 800,        // 游戏宽度
    height: 600,       // 游戏高度
    pixelArt: true,    // 像素艺术模式
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },  // 重力设置
            debug: false        // 调试模式
        }
    }
};
```

### 升级系统配置
```javascript
// 升级间隔配置
baseUpgradeInterval: 100,    // 基础升级间隔
intervalIncrease: 50,        // 间隔递增量

// 升级触发公式
// threshold = base + (count * increase) + (count^1.3 * 30)
```

## 🚀 性能优化

### 已实现的优化
- **对象池**: 子弹对象重用 (maxSize: 100)
- **智能生成**: 基于玩家位置的敌人生成
- **视觉剔除**: 超出视野范围的对象不渲染
- **碰撞优化**: 高效的物理检测

### 建议的优化
- 添加纹理图集以减少绘制调用
- 实现敌人对象池
- 添加音频文件压缩
- 使用Web Workers处理复杂计算

## 🔧 构建和部署

### 开发构建
```bash
# 无需构建步骤，直接使用ES6模块
# 确保使用HTTP服务器运行
```

### 生产部署
```bash
# 将所有文件上传到Web服务器
# 确保支持MIME类型: application/javascript
```

### Docker 部署
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🧪 测试

### 手动测试清单
- [ ] 主菜单导航
- [ ] 游戏开始流程
- [ ] 玩家移动和射击
- [ ] 敌人生成和AI
- [ ] 碰撞检测
- [ ] 升级系统
- [ ] 分数记录
- [ ] 暂停/恢复功能

### 性能测试
- [ ] 长时间游戏稳定性
- [ ] 大量敌人时的帧率
- [ ] 内存泄漏检查

## 🤝 贡献指南

### 贡献流程
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码规范
- 使用 ES6+ 语法
- 遵循 JavaScript Standard Style
- 添加必要的注释
- 保持函数单一职责

### 问题报告
使用 [GitHub Issues](https://github.com/datehoer/Roguelike/issues) 报告bug或建议功能。

## 🐛 已知问题



## 🔮 未来计划

- [ ] 多人联机模式
- [ ] 更多敌人类型
- [ ] 装备系统
- [ ] 成就系统
- [ ] 移动端适配
- [ ] 音效和背景音乐
- [ ] 保存/加载功能
- [ ] 多语言支持

## 📜 更新日志

### v1.0.0 (2025-06-25)
- ✨ 初始版本发布
- 🎮 完整的Roguelike游戏体验
- 🏗️ 模块化架构设计
- 🔧 升级系统实现

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👨‍💻 作者

- **datehoer** - *初始开发* - [datehoer](https://github.com/datehoer)

- **Cursor** - *初始开发* - [Cursor](https://cursor.com)

## 🙏 致谢

- [Phaser.js](https://phaser.io/) - 优秀的HTML5游戏框架
- [MDN Web Docs](https://developer.mozilla.org/) - Web技术文档
- Roguelike游戏社区的启发

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给它一个星标！**

[回到顶部](#phaser-roguelike-地牢冒险游戏)

</div> 
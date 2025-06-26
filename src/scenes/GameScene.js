// src/scenes/GameScene.js
import UpgradeManager from '../utils/UpgradeManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    init() {
        this.playerSpeed = 200;
        this.enemySpeed = 100;
        this.bulletSpeed = 400;

        this.playerHp = 3;
        this.maxPlayerHp = 3;
        this.score = 0;
        this.isPlayerInvincible = false;
        
        // 新增：升级系统
        this.upgradeManager = new UpgradeManager();
        
        // 新增：难度系统相关变量
        this.baseEnemyCount = 8; // 增加基础敌人数量：从3到8
        this.maxEnemyCount = 80; // 大幅增加最大敌人数量：从50到80以支持更多强化敌人
        this.scoreThresholds = [0, 50, 100, 200, 400, 800, 1600]; // 分数阈值
        this.respawnDelayBase = 2000; // 减少基础重生延迟：从3000到2000毫秒
        this.minRespawnDelay = 300; // 减少最小重生延迟：从500到300毫秒
        
        // 新增：动态生成相关变量
        this.proximitySpawnRadius = 600; // 增加玩家周围生成范围：从400到600
        this.minSpawnDistance = 200; // 减少最小生成距离：从250到200，让敌人更容易生成
        this.maxSpawnDistance = 800; // 增加最大生成距离：从600到800
        this.spawnAttempts = 30; // 增加寻找有效生成位置的最大尝试次数：从20到30
        
        // 新增：智能生成相关变量
        this.lastPlayerPosition = { x: 0, y: 0 }; // 记录上次玩家位置
        this.playerMovementThreshold = 100; // 玩家移动阈值
        this.adaptiveSpawnDistance = { min: 180, max: 800 }; // 调整自适应生成距离
        this.enemyDistributionCheck = true; // 是否检查敌人分布
        
        // 添加定期检查计时器
        this.lastEnemyCheck = 0;
        this.enemyCheckInterval = 3000; // 减少检查间隔：从5秒到3秒，增加敌人生成频率
        this.lastDifficultyLevel = 0; // 记录上次的难度等级
        
        // 新增：敌人强化系统相关变量
        this.enemyEnhancementLevels = [
            { // 等级0：普通敌人
                name: '普通小龙人',
                hp: 1,
                speed: 1.0,
                scale: 1.0,
                tint: 0xffffff,
                scoreValue: 10,
                spawnWeight: 100 // 生成权重，数值越高越容易生成
            },
            { // 等级1：精英敌人
                name: '精英小龙人',
                hp: 2,
                speed: 1.2,
                scale: 1.1,
                tint: 0x00ff00, // 绿色
                scoreValue: 20,
                spawnWeight: 30
            },
            { // 等级2：头目敌人
                name: '头目小龙人',
                hp: 3,
                speed: 1.4,
                scale: 1.25,
                tint: 0x0080ff, // 蓝色
                scoreValue: 35,
                spawnWeight: 15
            },
            { // 等级3：王者敌人
                name: '王者小龙人',
                hp: 5,
                speed: 1.6,
                scale: 1.4,
                tint: 0x8000ff, // 紫色
                scoreValue: 60,
                spawnWeight: 8
            },
            { // 等级4：传说敌人
                name: '传说小龙人',
                hp: 8,
                speed: 1.8,
                scale: 1.6,
                tint: 0xff8000, // 橙色
                scoreValue: 100,
                spawnWeight: 3
            },
            { // 等级5：神话敌人
                name: '神话小龙人',
                hp: 12,
                speed: 2.0,
                scale: 1.8,
                tint: 0xff0000, // 红色
                scoreValue: 180,
                spawnWeight: 1
            }
        ];
        
        // 新增：调试模式开关
        this.debugEnabled = false;
        
        // 新增：新技能相关变量
        this.lastShootTime = 0; // 上次射击时间
        this.shootInterval = 300; // 射击间隔(ms)
        
        // 火焰护体相关
        this.fireShieldActive = false;
        this.fireShieldEffects = null; // 火焰护体效果组
        this.fireShieldRadius = 80; // 火焰护体半径
        this.fireShieldDamageDelay = 800; // 火焰护体伤害间隔(ms)，避免瞬间秒杀
        this.enemyFireDamageTimers = new Map(); // 记录每个敌人的火焰伤害计时器
        
        // 瞬移突进相关
        this.dashCooldown = 2000; // 瞬移冷却时间(ms)
        this.lastDashTime = 0;
        
        // 分身术相关
        this.clones = null; // 分身组
        this.cloneShootTimer = 0; // 分身射击计时器
        
        // 爆炸效果相关
        this.explosions = null; // 爆炸效果组
    }

    create() {
        // 重置升级管理器
        this.upgradeManager.reset();
        
        // 重置玩家状态
        this.playerHp = 3;
        this.maxPlayerHp = 3;
        this.score = 0;
        this.playerSpeed = 200; // 重置速度
        
        // 1. 地图生成 - 修改为超大地图实现无限感觉
        this.map = this.make.tilemap({ 
            tileWidth: 32, 
            tileHeight: 32, 
            width: 200,  // 从50增加到200
            height: 200  // 从50增加到200
        });
        const tileset = this.map.addTilesetImage('floor', 'floor', 32, 32);
        const wallTileset = this.map.addTilesetImage('wall', 'wall', 32, 32);

        this.floorLayer = this.map.createBlankLayer('Floor', tileset);
        this.wallLayer = this.map.createBlankLayer('Wall', wallTileset);

        this.generateDungeon();
        
        // 2. 玩家创建
        // rooms[0]的中心现在是像素坐标，可以直接使用
        const playerStart = Phaser.Geom.Rectangle.GetCenter(this.rooms[0]);
        this.player = this.physics.add.sprite(playerStart.x, playerStart.y, 'player');
        this.player.setCollideWorldBounds(false); // 我们用墙来限制
        
        // 设置哪吒角色的缩放和碰撞体
        // 原图尺寸: 1024x1024px，缩放到约40px高度
        const scale = 0.039;
        this.player.setScale(scale); // 1024 * 0.039 ≈ 40px
        
        // **修正碰撞体设置**
        // body的尺寸和偏移是相对于未缩放的纹理(1024x1024)设置的。
        // 为了得到一个在屏幕上看起来是32x32的碰撞体，我们需要将期望尺寸除以缩放比例。
        const targetBodySize = 32;
        const bodySize = targetBodySize / scale;
        this.player.body.setSize(bodySize, bodySize);

        // 同样，偏移量也需要计算，使其在纹理中居中。
        const textureSize = 1024; // 原始纹理尺寸
        const offset = (textureSize - bodySize) / 2;
        this.player.body.setOffset(offset, offset); // Y方向可以微调以匹配视觉效果

        // 3. 敌人创建 - 修改为动态生成
        this.enemies = this.physics.add.group();
        const initialEnemyCount = this.calculateEnemyCountForScore(this.score);
        this.spawnEnemies(initialEnemyCount);

        // 4. 物理碰撞
        this.wallLayer.setCollisionByProperty({ collides: true });
        this.physics.add.collider(this.player, this.wallLayer);
        this.physics.add.collider(this.enemies, this.wallLayer);
        this.physics.add.collider(this.enemies, this.enemies);
        this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);

        // 5. 子弹组
        this.bullets = this.physics.add.group({
            defaultKey: 'huntianling', // 使用混天绫图片替代原来的bullet
            maxSize: 100 // 增加子弹池大小支持多重射击
        });
        
        // 调试：输出huntianling纹理尺寸信息
        const huntianlingTexture = this.textures.get('huntianling');
        if (huntianlingTexture) {
            const huntianlingWidth = huntianlingTexture.source[0].width;
            const huntianlingHeight = huntianlingTexture.source[0].height;
            console.log(`混天绫纹理尺寸: ${huntianlingWidth}x${huntianlingHeight}px`);
        }
        
        this.physics.add.collider(this.bullets, this.wallLayer, this.handleBulletWallCollision, null, this);
        this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemyCollision, null, this);

        // 新增：技能相关的游戏对象组
        // 火焰护体效果组
        this.fireShieldEffects = this.add.group();
        
        // 分身组
        this.clones = this.physics.add.group();
        this.physics.add.collider(this.clones, this.wallLayer);
        this.physics.add.collider(this.clones, this.enemies);
        
        // 分身子弹组
        this.cloneBullets = this.physics.add.group({
            defaultKey: 'huntianling',
            maxSize: 50
        });
        this.physics.add.collider(this.cloneBullets, this.wallLayer, (bullet) => bullet.destroy());
        this.physics.add.overlap(this.cloneBullets, this.enemies, this.handleBulletEnemyCollision, null, this);
        
        // 爆炸效果组
        this.explosions = this.add.group();

        // 6. 输入控制
        this.cursors = this.input.keyboard.createCursorKeys();
        // 添加WASD键支持
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        // 添加ESC键支持暂停功能
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => this.showPauseMenu());
        
        // 添加空格键支持瞬移突进
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        this.input.on('pointerdown', this.shoot, this);

        // 7. 摄像头
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // 8. 初始化UI事件
        this.events.emit('updateHP', this.playerHp, this.maxPlayerHp);
        this.events.emit('updateScore', this.score);

        // 切换物理世界调试绘制
        if (this.debugEnabled) {
            this.physics.world.drawDebug = true;
            // 若未创建 debugGraphic，则创建
            if (!this.physics.world.debugGraphic) {
                this.physics.world.createDebugGraphic();
            }
            if (this.physics.world.debugGraphic) {
                this.physics.world.debugGraphic.setVisible(true);
            }
        } else {
            this.physics.world.drawDebug = false;
            if (this.physics.world.debugGraphic) {
                this.physics.world.debugGraphic.setVisible(false);
            }
        }
    }

    update() {
        if (this.player.active) {
            this.handlePlayerMovement();
            this.handleEnemyMovement();
            
            // 更新玩家位置记录
            this.updatePlayerPositionTracking();
            
            // 定期检查并调整敌人数量
            const currentTime = this.time.now;
            if (currentTime - this.lastEnemyCheck > this.enemyCheckInterval) {
                this.adjustEnemyCountForScore();
                this.checkDifficultyLevelChange();
                this.lastEnemyCheck = currentTime;
            }

            // 检查升级触发
            this.checkUpgradeAvailable();
            
            // 新增：新技能更新逻辑
            this.updateNewSkills();
            
            // 实时位置输出 - 每500ms输出一次
            if (this.debugEnabled && (!this.lastPositionLog || currentTime - this.lastPositionLog > 500)) {
                this.logPositionInfo();
                this.lastPositionLog = currentTime;
            }
        }
    }

    // 检查是否可以升级
    checkUpgradeAvailable() {
        if (this.upgradeManager.checkForUpgrade(this.score)) {
            this.triggerUpgradeSelection();
        }
    }

    // 触发升级选择
    triggerUpgradeSelection() {
        const upgradeOptions = this.upgradeManager.generateUpgradeOptions();
        
        if (upgradeOptions.length > 0) {
            // 暂停游戏场景
            this.scene.pause();
            
            // 启动升级选择场景
            this.scene.launch('UpgradeScene', {
                upgradeOptions: upgradeOptions,
                upgradeManager: this.upgradeManager,
                gameScene: this
            });
        }
    }

    // 应用升级效果
    applyUpgrade(upgradeType, upgradeManager) {
        const upgradeInfo = upgradeManager.getUpgradeInfo(upgradeType);
        
        switch (upgradeType) {
            case UpgradeManager.UPGRADE_TYPES.BULLET_COUNT:
                // 多重射击升级已在shoot方法中处理
                console.log('子弹数量升级到:', upgradeManager.getUpgradeValue(upgradeType));
                break;
                
            case UpgradeManager.UPGRADE_TYPES.BULLET_SPREAD:
                // 散射升级已在shoot方法中处理
                console.log('射击方向升级到:', upgradeManager.getUpgradeValue(upgradeType));
                break;
                
            case UpgradeManager.UPGRADE_TYPES.HP_BOOST:
                const newMaxHp = upgradeManager.getUpgradeValue(upgradeType);
                const hpIncrease = newMaxHp - this.maxPlayerHp;
                this.maxPlayerHp = newMaxHp;
                this.playerHp = Math.min(this.playerHp + hpIncrease, this.maxPlayerHp);
                this.events.emit('updateHP', this.playerHp, this.maxPlayerHp);
                console.log('生命值升级到:', this.maxPlayerHp, '当前血量:', this.playerHp);
                break;
                
            case UpgradeManager.UPGRADE_TYPES.SPEED_BOOST:
                this.playerSpeed = upgradeManager.getUpgradeValue(upgradeType);
                console.log('移动速度升级到:', this.playerSpeed);
                break;
                
            // 新增技能应用
            case UpgradeManager.UPGRADE_TYPES.FIRE_SHIELD:
                const fireShieldLevel = upgradeManager.getUpgradeValue(upgradeType);
                console.log('火焰护体升级到等级:', fireShieldLevel);
                if (fireShieldLevel === 1) {
                    console.log('火焰护体已激活！');
                }
                break;
                
            case UpgradeManager.UPGRADE_TYPES.DASH_ATTACK:
                const dashLevel = upgradeManager.getUpgradeValue(upgradeType);
                console.log('瞬移突进升级到等级:', dashLevel);
                if (dashLevel === 1) {
                    console.log('瞬移突进技能已获得！按空格键瞬移到鼠标位置');
                }
                // 每级减少冷却时间
                this.dashCooldown = Math.max(500, 2000 - (dashLevel - 1) * 300);
                console.log('瞬移冷却时间:', this.dashCooldown / 1000, '秒');
                break;
                
            case UpgradeManager.UPGRADE_TYPES.BULLET_PIERCE:
                const pierceCount = upgradeManager.getUpgradeValue(upgradeType);
                console.log('混天绫穿透升级到:', pierceCount, '次');
                break;
                
            case UpgradeManager.UPGRADE_TYPES.SUMMON_CLONE:
                const cloneCount = upgradeManager.getUpgradeValue(upgradeType);
                console.log('分身术升级到:', cloneCount, '个分身');
                break;
                
            case UpgradeManager.UPGRADE_TYPES.BULLET_BOUNCE:
                const bounceCount = upgradeManager.getUpgradeValue(upgradeType);
                console.log('子弹反弹升级到:', bounceCount, '次');
                break;
                
            case UpgradeManager.UPGRADE_TYPES.LIFE_STEAL:
                const lifeStealChance = upgradeManager.getUpgradeValue(upgradeType);
                console.log('生命吸取升级到:', lifeStealChance, '% 几率');
                break;
                
            case UpgradeManager.UPGRADE_TYPES.ATTACK_SPEED:
                const newShootInterval = upgradeManager.getUpgradeValue(upgradeType);
                this.shootInterval = newShootInterval;
                console.log('攻击速度升级到:', (this.shootInterval / 1000).toFixed(2), '秒间隔');
                break;
                
            case UpgradeManager.UPGRADE_TYPES.EXPLOSIVE_SHOT:
                const explosiveLevel = upgradeManager.getUpgradeValue(upgradeType);
                console.log('爆炸冲击升级到等级:', explosiveLevel);
                if (explosiveLevel === 1) {
                    console.log('爆炸冲击已激活！混天绫命中敌人时会产生爆炸');
                }
                break;
        }

        // 发送升级事件通知UI
        this.events.emit('upgradeApplied', upgradeInfo);
    }

    // --- 主要修改区域开始 ---

    generateDungeon() {
        // 首先用墙填充整个地图 (使用瓦片索引1)
        this.wallLayer.fill(1, 0, 0, this.map.width, this.map.height);

        this.rooms = [];
        const maxRooms = 120; // 大幅增加房间数量：从15增加到120
        const minRoomSize = 4; // 减小最小房间尺寸，增加密度
        const maxRoomSize = 16; // 增加最大房间尺寸，提供多样性

        // 第一阶段：生成房间
        for (let i = 0; i < maxRooms; i++) {
            // 生成随机的房间尺寸 (以瓦片为单位)
            const w = Phaser.Math.Between(minRoomSize, maxRoomSize);
            const h = Phaser.Math.Between(minRoomSize, maxRoomSize);
            // 生成随机的房间位置 (以瓦片为单位，确保不贴边)
            const x = Phaser.Math.Between(1, this.map.width - w - 1);
            const y = Phaser.Math.Between(1, this.map.height - h - 1);

            // 创建一个以瓦片为坐标的矩形，用于碰撞检测
            const newRoomInTiles = new Phaser.Geom.Rectangle(x, y, w, h);

            let failed = false;
            for (const otherRoom of this.rooms) {
                // 使用 tile-based 矩形进行相交检测
                // 需要一个扩大的矩形来确保房间之间有间隙
                const otherRoomTiles = new Phaser.Geom.Rectangle(
                    otherRoom.x / 32, otherRoom.y / 32, 
                    otherRoom.width / 32, otherRoom.height / 32
                );
                // 减小间隙要求，允许更密集的房间布局
                if (Phaser.Geom.Intersects.RectangleToRectangle(newRoomInTiles, 
                    Phaser.Geom.Rectangle.Inflate(otherRoomTiles, 1, 1))) { // 从2,2减少到1,1
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                // 成功！现在我们用整数瓦片坐标来挖洞
                this.floorLayer.fill(0, newRoomInTiles.x, newRoomInTiles.y, newRoomInTiles.width, newRoomInTiles.height);
                this.wallLayer.fill(-1, newRoomInTiles.x, newRoomInTiles.y, newRoomInTiles.width, newRoomInTiles.height);

                // 将房间信息存储为像素坐标的矩形，方便后续使用（如获取中心点）
                const newRoomInPixels = new Phaser.Geom.Rectangle(x * 32, y * 32, w * 32, h * 32);
                
                // 存储以像素为单位的矩形
                this.rooms.push(newRoomInPixels);
            }
        }

        console.log(`成功生成 ${this.rooms.length} 个房间，目标 ${maxRooms} 个房间`);

        // 第二阶段：确保所有房间连通
        this.ensureAllRoomsConnected();
        
        // 第三阶段：添加额外的连接以增加路径多样性
        this.addExtraConnections();

        // 第四阶段：验证连通性并修复孤立区域
        this.verifyAndFixConnectivity();
        
        // 设置墙的碰撞属性
        this.wallLayer.forEachTile(tile => {
            if (tile.index === 1) { // 瓦片索引为1的都是墙
                tile.properties.collides = true;
            }
        });
    }

    // 确保所有房间连通 - 使用最小生成树算法
    ensureAllRoomsConnected() {
        if (this.rooms.length < 2) return;

        // 计算所有房间对之间的距离
        const distances = [];
        for (let i = 0; i < this.rooms.length; i++) {
            for (let j = i + 1; j < this.rooms.length; j++) {
                const centerA = Phaser.Geom.Rectangle.GetCenter(this.rooms[i]);
                const centerB = Phaser.Geom.Rectangle.GetCenter(this.rooms[j]);
                const distance = Phaser.Math.Distance.Between(centerA.x, centerA.y, centerB.x, centerB.y);
                distances.push({ i, j, distance, centerA, centerB });
            }
        }

        // 按距离排序
        distances.sort((a, b) => a.distance - b.distance);

        // 使用并查集来构建最小生成树
        const parent = Array.from({ length: this.rooms.length }, (_, i) => i);
        
        function find(x) {
            if (parent[x] !== x) {
                parent[x] = find(parent[x]);
            }
            return parent[x];
        }

        function union(x, y) {
            const px = find(x);
            const py = find(y);
            if (px !== py) {
                parent[px] = py;
                return true;
            }
            return false;
        }

        // 连接房间直到所有房间都在同一个连通分量中
        for (const edge of distances) {
            if (union(edge.i, edge.j)) {
                this.connectRooms(this.rooms[edge.i], this.rooms[edge.j]);
            }
        }
    }

    // 添加额外的连接以增加路径多样性
    addExtraConnections() {
        const extraConnections = Math.floor(this.rooms.length / 2); // 增加更多额外连接：从1/3改为1/2
        
        console.log(`添加 ${extraConnections} 个额外连接以增加路径多样性`);
        
        for (let i = 0; i < extraConnections; i++) {
            const roomA = Phaser.Utils.Array.GetRandom(this.rooms);
            const roomB = Phaser.Utils.Array.GetRandom(this.rooms);
            
            if (roomA !== roomB) {
                this.connectRooms(roomA, roomB);
            }
        }
    }

    // 验证连通性并修复孤立区域
    verifyAndFixConnectivity() {
        // 使用洪水填充算法验证连通性
        const visited = new Set();
        const stack = [];
        
        // 从第一个房间开始
        if (this.rooms.length === 0) return;
        
        const startRoom = this.rooms[0];
        const startCenter = Phaser.Geom.Rectangle.GetCenter(startRoom);
        const startTileX = this.map.worldToTileX(startCenter.x);
        const startTileY = this.map.worldToTileY(startCenter.y);
        
        stack.push({ x: startTileX, y: startTileY });
        
        // 洪水填充找到所有可达的地板瓦片
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key) || x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) {
                continue;
            }
            
            const tile = this.floorLayer.getTileAt(x, y);
            if (!tile || tile.index !== 0) continue; // 不是地板
            
            visited.add(key);
            
            // 添加相邻的四个方向
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }

        // 检查是否有房间的中心不可达，如果有则强制连接
        for (let i = 1; i < this.rooms.length; i++) {
            const roomCenter = Phaser.Geom.Rectangle.GetCenter(this.rooms[i]);
            const tileX = this.map.worldToTileX(roomCenter.x);
            const tileY = this.map.worldToTileY(roomCenter.y);
            const key = `${tileX},${tileY}`;
            
            if (!visited.has(key)) {
                // 这个房间不可达，强制连接到最近的可达房间
                let nearestReachableRoom = null;
                let minDistance = Infinity;
                
                for (let j = 0; j < i; j++) {
                    const otherCenter = Phaser.Geom.Rectangle.GetCenter(this.rooms[j]);
                    const otherTileX = this.map.worldToTileX(otherCenter.x);
                    const otherTileY = this.map.worldToTileY(otherCenter.y);
                    const otherKey = `${otherTileX},${otherTileY}`;
                    
                    if (visited.has(otherKey)) {
                        const distance = Phaser.Math.Distance.Between(roomCenter.x, roomCenter.y, otherCenter.x, otherCenter.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestReachableRoom = this.rooms[j];
                        }
                    }
                }
                
                if (nearestReachableRoom) {
                    this.connectRooms(this.rooms[i], nearestReachableRoom);
                }
            }
        }
    }

    connectRooms(roomA, roomB) {
        const centerA = Phaser.Geom.Rectangle.GetCenter(roomA);
        const centerB = Phaser.Geom.Rectangle.GetCenter(roomB);

        // 随机决定是先走横向还是先走纵向
        if (Phaser.Math.Between(0, 1)) {
            this.digHorizontalCorridor(centerA.x, centerB.x, centerA.y);
            this.digVerticalCorridor(centerA.y, centerB.y, centerB.x);
        } else {
            this.digVerticalCorridor(centerA.y, centerB.y, centerA.x);
            this.digHorizontalCorridor(centerA.x, centerB.x, centerB.y);
        }
    }

    digHorizontalCorridor(x1, x2, y) {
        const startX = this.map.worldToTileX(Math.min(x1, x2));
        const endX = this.map.worldToTileX(Math.max(x1, x2));
        const centerTileY = this.map.worldToTileY(y);

        // 挖掘3个瓦片宽度的水平通道（上中下三行）
        for (let x = startX; x <= endX; x++) {
            for (let yOffset = -1; yOffset <= 1; yOffset++) {
                const tileY = centerTileY + yOffset;
                
                // 确保不超出地图边界
                if (tileY >= 0 && tileY < this.map.height) {
                    this.floorLayer.putTileAt(0, x, tileY);
                    this.wallLayer.putTileAt(-1, x, tileY);
                }
            }
        }
    }

    digVerticalCorridor(y1, y2, x) {
        const startY = this.map.worldToTileY(Math.min(y1, y2));
        const endY = this.map.worldToTileY(Math.max(y1, y2));
        const centerTileX = this.map.worldToTileX(x);

        // 挖掘3个瓦片宽度的垂直通道（左中右三列）
        for (let y = startY; y <= endY; y++) {
            for (let xOffset = -1; xOffset <= 1; xOffset++) {
                const tileX = centerTileX + xOffset;
                
                // 确保不超出地图边界
                if (tileX >= 0 && tileX < this.map.width) {
                    this.floorLayer.putTileAt(0, tileX, y);
                    this.wallLayer.putTileAt(-1, tileX, y);
                }
            }
        }
    }

    // --- 主要修改区域结束 ---


    // 新增：根据分数计算敌人强化等级概率分布
    getEnemyEnhancementDistribution(score) {
        let distribution = [];
        
        // 根据分数解锁不同等级的敌人
        if (score >= 0) {
            distribution.push({ level: 0, weight: this.enemyEnhancementLevels[0].spawnWeight });
        }
        if (score >= 100) {
            distribution.push({ level: 1, weight: this.enemyEnhancementLevels[1].spawnWeight });
        }
        if (score >= 300) {
            distribution.push({ level: 2, weight: this.enemyEnhancementLevels[2].spawnWeight });
        }
        if (score >= 600) {
            distribution.push({ level: 3, weight: this.enemyEnhancementLevels[3].spawnWeight });
        }
        if (score >= 1200) {
            distribution.push({ level: 4, weight: this.enemyEnhancementLevels[4].spawnWeight });
        }
        if (score >= 2400) {
            distribution.push({ level: 5, weight: this.enemyEnhancementLevels[5].spawnWeight });
        }
        
        // 随着分数增加，降低低级敌人的权重，增加高级敌人的权重
        if (score >= 500) {
            distribution.forEach(item => {
                if (item.level === 0) item.weight *= 0.7; // 普通敌人权重降低30%
            });
        }
        if (score >= 1000) {
            distribution.forEach(item => {
                if (item.level <= 1) item.weight *= 0.6; // 低级敌人权重再降低40%
                if (item.level >= 3) item.weight *= 1.5; // 高级敌人权重增加50%
            });
        }
        if (score >= 2000) {
            distribution.forEach(item => {
                if (item.level <= 2) item.weight *= 0.4; // 中低级敌人权重大幅降低
                if (item.level >= 4) item.weight *= 2.0; // 顶级敌人权重翻倍
            });
        }
        
        return distribution;
    }

    // 新增：根据权重随机选择敌人强化等级
    selectEnemyEnhancementLevel(score) {
        const distribution = this.getEnemyEnhancementDistribution(score);
        
        if (distribution.length === 0) {
            return 0; // 默认返回普通敌人
        }
        
        // 计算总权重
        const totalWeight = distribution.reduce((sum, item) => sum + item.weight, 0);
        
        // 随机选择
        let random = Math.random() * totalWeight;
        
        for (const item of distribution) {
            random -= item.weight;
            if (random <= 0) {
                return item.level;
            }
        }
        
        return distribution[distribution.length - 1].level; // 默认返回最后一个
    }

    spawnEnemies(count) {
        console.log(`尝试生成 ${count} 个强化敌人，当前房间数量: ${this.rooms.length}`);
        
        // 定义可用的小龙人贴图数组
        const dragonTextures = ['xiaolongren', 'xiaolongren1', 'xiaolongren2'];
        
        for (let i = 0; i < count; i++) {
            const spawnPosition = this.findValidSpawnPosition();
            
            if (spawnPosition) {
                // 随机选择一种小龙人贴图
                const randomTexture = Phaser.Utils.Array.GetRandom(dragonTextures);
                
                // 根据当前分数选择敌人强化等级
                const enhancementLevel = this.selectEnemyEnhancementLevel(this.score);
                const enhancement = this.enemyEnhancementLevels[enhancementLevel];
                
                const enemy = this.enemies.create(spawnPosition.x, spawnPosition.y, randomTexture);
                
                // 应用强化效果
                this.applyEnemyEnhancement(enemy, enhancementLevel);
                
                // 使用body中心坐标计算距离
                const playerCenterX = this.player.body.x + this.player.body.width / 2;
                const playerCenterY = this.player.body.y + this.player.body.height / 2;
                const enemyCenterX = enemy.body.x + enemy.body.width / 2;
                const enemyCenterY = enemy.body.y + enemy.body.height / 2;
                const distanceToPlayer = Phaser.Math.Distance.Between(
                    playerCenterX, playerCenterY, 
                    enemyCenterX, enemyCenterY
                );
                
                console.log(`${enhancement.name}生成在位置: (${spawnPosition.x}, ${spawnPosition.y})，使用贴图: ${randomTexture}，血量: ${enhancement.hp}，Body中心距离玩家: ${Math.round(distanceToPlayer)}像素`);
            } else {
                console.log('无法找到有效的生成位置，使用备用方法');
                this.fallbackSpawnEnemy();
            }
        }
    }

    // 寻找玩家附近的有效生成位置
    findValidSpawnPosition() {
        // 使用玩家body中心坐标作为参考点
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        
        // 自适应调整生成距离
        this.adjustSpawnDistances();
        
        // 优先尝试在玩家移动方向前方生成
        const spawnPosition = this.trySpawnInMovementDirection(playerCenterX, playerCenterY);
        if (spawnPosition) {
            return spawnPosition;
        }
        
        // 如果移动方向生成失败，则使用标准随机生成
        for (let attempt = 0; attempt < this.spawnAttempts; attempt++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const distance = Phaser.Math.FloatBetween(
                this.adaptiveSpawnDistance.min, 
                this.adaptiveSpawnDistance.max
            );
            
            const spawnX = playerCenterX + Math.cos(angle) * distance;
            const spawnY = playerCenterY + Math.sin(angle) * distance;
            
            if (this.isValidSpawnPosition(spawnX, spawnY)) {
                return { x: spawnX, y: spawnY };
            }
        }
        
        return null;
    }

    // 自适应调整生成距离
    adjustSpawnDistances() {
        // 使用body中心坐标计算玩家周围敌人密度
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        
        const nearbyEnemies = this.enemies.getChildren().filter(enemy => {
            const enemyCenterX = enemy.body.x + enemy.body.width / 2;
            const enemyCenterY = enemy.body.y + enemy.body.height / 2;
            const distance = Phaser.Math.Distance.Between(
                playerCenterX, playerCenterY, 
                enemyCenterX, enemyCenterY
            );
            return distance <= 400;
        });
        
        const enemyDensity = nearbyEnemies.length;
        
        // 根据敌人密度调整生成距离，但保持更安全的最小距离
        if (enemyDensity < 2) {
            // 附近敌人太少，生成得稍近一些，但不能太近
            this.adaptiveSpawnDistance.min = 200;
            this.adaptiveSpawnDistance.max = 400;
        } else if (enemyDensity > 5) {
            // 附近敌人太多，生成得远一些
            this.adaptiveSpawnDistance.min = 300;
            this.adaptiveSpawnDistance.max = 800;
        } else {
            // 恢复默认距离
            this.adaptiveSpawnDistance.min = 250;
            this.adaptiveSpawnDistance.max = 600;
        }
        
        // 根据分数调整生成距离，但保持安全的最小距离
        if (this.score >= 400) {
            this.adaptiveSpawnDistance.min = Math.max(200, this.adaptiveSpawnDistance.min - 30);
        }
    }

    // 尝试在玩家移动方向前方生成敌人
    trySpawnInMovementDirection(playerCenterX, playerCenterY) {
        // 计算玩家移动方向 - 使用body中心位置
        const lastPlayerCenterX = this.lastPlayerPosition.x;
        const lastPlayerCenterY = this.lastPlayerPosition.y;
        const playerMovementX = playerCenterX - lastPlayerCenterX;
        const playerMovementY = playerCenterY - lastPlayerCenterY;
        const movementMagnitude = Math.sqrt(playerMovementX * playerMovementX + playerMovementY * playerMovementY);
        
        // 如果玩家移动距离不够，跳过方向性生成
        if (movementMagnitude < 20) {
            return null;
        }
        
        // 标准化移动方向
        const movementDirectionX = playerMovementX / movementMagnitude;
        const movementDirectionY = playerMovementY / movementMagnitude;
        
        // 在移动方向前方±45度角度范围内尝试生成
        for (let attempt = 0; attempt < 5; attempt++) {
            const baseAngle = Math.atan2(movementDirectionY, movementDirectionX);
            const angleVariation = Phaser.Math.FloatBetween(-Math.PI/4, Math.PI/4); // ±45度
            const finalAngle = baseAngle + angleVariation;
            
            const distance = Phaser.Math.FloatBetween(
                this.adaptiveSpawnDistance.min, 
                this.adaptiveSpawnDistance.max
            );
            
            const spawnX = playerCenterX + Math.cos(finalAngle) * distance;
            const spawnY = playerCenterY + Math.sin(finalAngle) * distance;
            
            if (this.isValidSpawnPosition(spawnX, spawnY)) {
                return { x: spawnX, y: spawnY };
            }
        }
        
        return null;
    }

    // 检查位置是否为有效的生成位置
    isValidSpawnPosition(x, y) {
        // 检查是否在地图边界内
        if (x < 32 || x >= this.map.widthInPixels - 32 || 
            y < 32 || y >= this.map.heightInPixels - 32) {
            return false;
        }
        
        // 将像素坐标转换为瓦片坐标
        const tileX = Math.floor(x / 32);
        const tileY = Math.floor(y / 32);
        
        // 检查该位置是否为墙壁
        const wallTile = this.wallLayer.getTileAt(tileX, tileY);
        if (wallTile && wallTile.index === 1) {
            return false; // 是墙壁，不能生成
        }
        
        // 检查该位置是否为地板
        const floorTile = this.floorLayer.getTileAt(tileX, tileY);
        if (!floorTile || floorTile.index !== 0) {
            return false; // 不是地板，不能生成
        }
        
        // 使用body中心坐标检查是否距离玩家太近
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        const distanceToPlayer = Phaser.Math.Distance.Between(playerCenterX, playerCenterY, x, y);
        if (distanceToPlayer < this.minSpawnDistance) {
            return false;
        }
        
        // 使用body中心坐标检查是否与现有敌人重叠
        const tooCloseToEnemy = this.enemies.getChildren().some(enemy => {
            const enemyCenterX = enemy.body.x + enemy.body.width / 2;
            const enemyCenterY = enemy.body.y + enemy.body.height / 2;
            const distance = Phaser.Math.Distance.Between(enemyCenterX, enemyCenterY, x, y);
            return distance < 100; // 增加敌人之间的最小距离，避免敌人生成得太近
        });
        
        if (tooCloseToEnemy) {
            return false;
        }
        
        return true;
    }

    // 备用生成方法（当找不到玩家附近的有效位置时使用）
    fallbackSpawnEnemy() {
        // 定义可用的小龙人贴图数组
        const dragonTextures = ['xiaolongren', 'xiaolongren1', 'xiaolongren2'];
        
        // 获取玩家位置用于距离检查
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        
        // 尝试在现有房间中生成（原来的逻辑作为备用），但要检查距离
        let spawnSuccess = false;
        
        // 在无限地牢中，我们有更多房间可以选择
        if (this.rooms.length >= 5) { // 降低房间数量要求
            // 增加尝试次数，在更大的地牢中寻找合适位置
            for (let attempt = 0; attempt < 20; attempt++) { // 从10增加到20次尝试
                // 随机选择任意房间，不限制只能是非玩家房间
                const roomIndex = Phaser.Math.Between(0, this.rooms.length - 1);
                const room = this.rooms[roomIndex];
                if (room) {
                    const enemyX = Phaser.Math.Between(room.x + 16, room.right - 16);
                    const enemyY = Phaser.Math.Between(room.y + 16, room.bottom - 16);
                    
                    // 在无限地牢中，可以适当降低最小距离要求
                    const distanceToPlayer = Phaser.Math.Distance.Between(
                        playerCenterX, playerCenterY, enemyX, enemyY
                    );
                    
                    if (distanceToPlayer >= this.minSpawnDistance - 50) { // 稍微降低距离要求
                        // 随机选择一种小龙人贴图
                        const randomTexture = Phaser.Utils.Array.GetRandom(dragonTextures);
                        
                        // 根据当前分数选择敌人强化等级
                        const enhancementLevel = this.selectEnemyEnhancementLevel(this.score);
                        const enhancement = this.enemyEnhancementLevels[enhancementLevel];
                        
                        const enemy = this.enemies.create(enemyX, enemyY, randomTexture);
                        
                        // 应用强化效果
                        this.applyEnemyEnhancement(enemy, enhancementLevel);
                        
                        console.log(`备用方法：${enhancement.name}生成在房间 ${roomIndex}，位置: (${enemyX}, ${enemyY})，使用贴图: ${randomTexture}，血量: ${enhancement.hp}，距离玩家: ${Math.round(distanceToPlayer)}像素`);
                        spawnSuccess = true;
                        break;
                    }
                }
            }
        }
        
        if (!spawnSuccess) {
            console.log('备用生成方法：在无限地牢中无法找到合适位置生成强化敌人');
        }
    }

    handlePlayerMovement() {
        this.player.setVelocity(0);
        let vx = 0;
        let vy = 0;

        // 方向键控制
        if (this.cursors.left.isDown) vx = -1;
        else if (this.cursors.right.isDown) vx = 1;
        if (this.cursors.up.isDown) vy = -1;
        else if (this.cursors.down.isDown) vy = 1;

        // WASD键控制
        if (this.wasd.A.isDown) vx = -1;
        else if (this.wasd.D.isDown) vx = 1;
        if (this.wasd.W.isDown) vy = -1;
        else if (this.wasd.S.isDown) vy = 1;

        const velocity = new Phaser.Math.Vector2(vx, vy).normalize().scale(this.playerSpeed);
        this.player.setVelocity(velocity.x, velocity.y);
    }
    
    handleEnemyMovement() {
        this.enemies.getChildren().forEach(enemy => {
            if (this.player.active) {
                // 更新血量条位置
                this.updateEnemyHealthBar(enemy);
                
                // 使用body中心坐标而非精灵坐标进行距离判断
                const playerCenterX = this.player.body.x + this.player.body.width / 2;
                const playerCenterY = this.player.body.y + this.player.body.height / 2;
                const enemyCenterX = enemy.body.x + enemy.body.width / 2;
                const enemyCenterY = enemy.body.y + enemy.body.height / 2;
                
                const distance = Phaser.Math.Distance.Between(
                    playerCenterX, playerCenterY, 
                    enemyCenterX, enemyCenterY
                );
                
                if (distance < 300) {
                    // 获取敌人的速度倍数
                    const speedMultiplier = enemy.getData('speedMultiplier') || 1.0;
                    const finalSpeed = this.enemySpeed * speedMultiplier;
                    
                    // 使用body中心位置进行移动目标计算
                    const angle = Phaser.Math.Angle.Between(
                        enemyCenterX, enemyCenterY,
                        playerCenterX, playerCenterY
                    );
                    const velocity = this.physics.velocityFromAngle(
                        Phaser.Math.RadToDeg(angle), 
                        finalSpeed
                    );
                    enemy.setVelocity(velocity.x, velocity.y);
                } else {
                    enemy.setVelocity(0);
                }
            } else {
                enemy.setVelocity(0);
            }
        });
    }

    shoot(pointer) {
        if (!this.player.active) return;
        
        // 检查射击间隔
        const currentTime = this.time.now;
        if (currentTime - this.lastShootTime < this.shootInterval) {
            return; // 还在冷却中
        }
        this.lastShootTime = currentTime;
        
        const bulletCount = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.BULLET_COUNT);
        const spreadDirections = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.BULLET_SPREAD);
        
        // 使用玩家body中心位置计算鼠标点击方向
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        const baseAngle = Phaser.Math.Angle.Between(playerCenterX, playerCenterY, pointer.worldX, pointer.worldY);
        
        // 如果是散射模式（多个方向）
        if (spreadDirections > 1) {
            const angleSpread = Math.PI / 6; // 30度扇形范围
            const angleStep = angleSpread / (spreadDirections - 1);
            const startAngle = baseAngle - angleSpread / 2;
            
            for (let dir = 0; dir < spreadDirections; dir++) {
                const shootAngle = startAngle + (dir * angleStep);
                this.createBulletsInDirection(shootAngle, bulletCount, playerCenterX, playerCenterY);
            }
        } else {
            // 单方向射击
            this.createBulletsInDirection(baseAngle, bulletCount, playerCenterX, playerCenterY);
        }
    }

    createBulletsInDirection(angle, count, startX, startY) {
        // 如果没有传入起始位置，使用玩家body中心
        if (startX === undefined || startY === undefined) {
            startX = this.player.body.x + this.player.body.width / 2;
            startY = this.player.body.y + this.player.body.height / 2;
        }
        
        for (let i = 0; i < count; i++) {
            const bullet = this.bullets.get(startX, startY);
            if (bullet) {
                bullet.setActive(true);
                bullet.setVisible(true);
                
                // 设置混天绫的缩放 - 根据实际尺寸1536x1024px调整
                // 缩放到约24px长度作为子弹（相对于1536px的长边）
                const bulletScale = 24 / 1536; // ≈ 0.0156
                bullet.setScale(bulletScale);
                
                // 如果有多发子弹，添加轻微的角度偏移以避免重叠
                let bulletAngle = angle;
                if (count > 1) {
                    const offsetRange = Math.PI / 12; // 15度范围内的随机偏移
                    const offset = (Math.random() - 0.5) * offsetRange;
                    bulletAngle += offset;
                }
                
                // 设置子弹旋转方向，使其指向飞行方向
                bullet.setRotation(bulletAngle);
                
                this.physics.velocityFromRotation(bulletAngle, this.bulletSpeed, bullet.body.velocity);
                
                // 设置碰撞体 - 根据实际纹理尺寸1536x1024px调整
                const targetBulletBodySize = 20; // 子弹碰撞体大小（像素）
                const bulletBodySize = targetBulletBodySize / bulletScale;
                bullet.body.setSize(bulletBodySize, bulletBodySize);
                
                // 设置碰撞体偏移，使其居中（基于1536x1024的实际尺寸）
                const huntianlingWidth = 1536;
                const huntianlingHeight = 1024;
                const bulletOffsetX = (huntianlingWidth - bulletBodySize) / 2;
                const bulletOffsetY = (huntianlingHeight - bulletBodySize) / 2;
                bullet.body.setOffset(bulletOffsetX, bulletOffsetY);
                
                // 新增：设置子弹的新技能属性
                bullet.pierceCount = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.BULLET_PIERCE);
                bullet.explosiveLevel = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.EXPLOSIVE_SHOT);
                bullet.bounces = 0; // 重置反弹计数
                bullet.hasHitEnemy = false; // 标记是否已命中敌人
            }
        }
    }

    handlePlayerEnemyCollision(player, enemy) {
        if (this.isPlayerInvincible) return;

        this.playerHp--;
        this.events.emit('updateHP', this.playerHp, this.maxPlayerHp);

        // 使用body中心坐标计算击退方向
        const playerCenterX = player.body.x + player.body.width / 2;
        const playerCenterY = player.body.y + player.body.height / 2;
        const enemyCenterX = enemy.body.x + enemy.body.width / 2;
        const enemyCenterY = enemy.body.y + enemy.body.height / 2;
        
        const knockback = new Phaser.Math.Vector2(
            enemyCenterX - playerCenterX, 
            enemyCenterY - playerCenterY
        ).normalize().scale(200);
        enemy.setVelocity(knockback.x, knockback.y);

        if (this.playerHp <= 0) {
            this.player.setActive(false).setVisible(false);
            this.player.body.enable = false;
            this.events.emit('gameOver', this.score);
        } else {
            this.isPlayerInvincible = true;
            this.tweens.add({
                targets: this.player,
                alpha: 0.5,
                duration: 100,
                repeat: 5,
                yoyo: true,
                onComplete: () => {
                    this.player.setAlpha(1);
                    this.isPlayerInvincible = false;
                }
            });
        }
    }

    handleBulletEnemyCollision(bullet, enemy) {
        // 如果游戏已结束（玩家不活跃），不进行任何处理
        if (!this.player.active) {
            return;
        }
        
        // 获取敌人当前血量
        let currentHp = enemy.getData('currentHp') || 1;
        
        // 减少血量
        currentHp -= 1;
        enemy.setData('currentHp', currentHp);
        
        // 更新血量条
        this.updateEnemyHealthBar(enemy);
        
        // 添加受伤效果
        enemy.setTint(0xff4444); // 红色闪烁表示受伤
        this.time.delayedCall(200, () => {
            const enhancementLevel = enemy.getData('enhancementLevel') || 0;
            const originalTint = this.enemyEnhancementLevels[enhancementLevel].tint;
            if (enemy.active) {
                enemy.setTint(originalTint); // 恢复原来的颜色
            }
        });
        
        // 检查敌人是否死亡
        if (currentHp <= 0) {
            // 记录爆炸位置（在敌人被销毁前）
            const explosionX = enemy.body.x + enemy.body.width / 2;
            const explosionY = enemy.body.y + enemy.body.height / 2;
            
            // 获取敌人的分数价值
            const scoreValue = enemy.getData('scoreValue') || 10;
            const enemyName = enemy.getData('name') || '敌人';
            
            // 移除血量条
            this.removeEnemyHealthBar(enemy);
            
            // 销毁敌人
            enemy.destroy();
            
            // 更新分数
            this.score += scoreValue;
            this.events.emit('updateScore', this.score);
            
            // 显示击杀奖励文本
            this.showKillReward(explosionX, explosionY, scoreValue, enemyName);
            
            // 触发生命吸取
            this.triggerLifeSteal();
            
            // 处理爆炸效果
            if (bullet.explosiveLevel > 0) {
                this.createExplosion(explosionX, explosionY, bullet.explosiveLevel);
            }
            
            // 改进的再生机制 - 根据分数动态调整
            const respawnDelay = this.calculateRespawnDelay(this.score);
            const respawnCount = this.calculateRespawnCount(this.score);
            
            console.log(`${enemyName}被击杀，获得${scoreValue}分，当前总分: ${this.score}, ${respawnDelay}ms后重生${respawnCount}个敌人`);
            
            this.time.delayedCall(respawnDelay, () => {
                // 再次检查游戏是否仍在进行
                if (!this.player.active) {
                    return;
                }
                
                console.log('开始重生强化敌人...');
                this.spawnEnemies(respawnCount);
                
                // 检查是否需要额外调整敌人数量以匹配当前分数等级
                this.adjustEnemyCountForScore();
                
                console.log('强化敌人重生完成，当前敌人数量:', this.enemies.countActive());
            });
        } else {
            // 敌人还活着，显示伤害数字
            this.showDamageNumber(enemy.x, enemy.y - 20, 1);
        }
        
        // 处理穿透效果
        if (bullet.pierceCount > 0) {
            bullet.pierceCount--;
            bullet.hasHitEnemy = true;
            console.log(`子弹穿透！剩余穿透次数: ${bullet.pierceCount}`);
            
            // 如果穿透次数用完，销毁子弹
            if (bullet.pierceCount <= 0) {
                bullet.destroy();
            }
        } else {
            // 没有穿透能力，销毁子弹
            bullet.destroy();
        }
    }

    // 创建爆炸效果
    createExplosion(x, y, level) {
        const explosionRadius = 40 + level * 15; // 爆炸半径随等级增加
        
        // 创建爆炸视觉效果
        const explosion = this.add.circle(x, y, explosionRadius, 0xff6600);
        explosion.setAlpha(0.7);
        
        // 爆炸动画
        this.tweens.add({
            targets: explosion,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 400,
            onComplete: () => explosion.destroy()
        });
        
        // 对范围内的敌人造成爆炸伤害
        this.enemies.getChildren().forEach(otherEnemy => {
            if (otherEnemy.active) {
                const distance = Phaser.Math.Distance.Between(
                    x, y,
                    otherEnemy.body.x + otherEnemy.body.width / 2,
                    otherEnemy.body.y + otherEnemy.body.height / 2
                );
                
                if (distance <= explosionRadius) {
                    // 击退效果
                    const knockback = new Phaser.Math.Vector2(
                        otherEnemy.body.x + otherEnemy.body.width / 2 - x,
                        otherEnemy.body.y + otherEnemy.body.height / 2 - y
                    ).normalize().scale(200 + level * 50);
                    
                    otherEnemy.setVelocity(knockback.x, knockback.y);
                    otherEnemy.setTint(0xff6600); // 橙色着色表示被爆炸伤害
                    
                    // 延迟销毁敌人
                    this.time.delayedCall(300, () => {
                        if (otherEnemy.active) {
                            otherEnemy.destroy();
                            this.score += 5; // 爆炸造成的击杀给予较少分数
                            this.events.emit('updateScore', this.score);
                            this.triggerLifeSteal(); // 爆炸击杀也能触发生命吸取
                        }
                    });
                }
            }
        });
        
        console.log(`爆炸效果！等级: ${level}, 半径: ${explosionRadius}`);
    }

    // 新增：显示击杀奖励文本
    showKillReward(x, y, scoreValue, enemyName) {
        const rewardText = this.add.text(x, y, `+${scoreValue}`, {
            fontSize: '16px',
            fill: '#ffff00',
            fontStyle: 'bold'
        });
        rewardText.setOrigin(0.5);
        
        // 飘动效果
        this.tweens.add({
            targets: rewardText,
            y: y - 40,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => rewardText.destroy()
        });
        
        // 如果是高价值目标，显示特殊效果
        if (scoreValue >= 50) {
            const specialText = this.add.text(x, y + 20, `击杀 ${enemyName}!`, {
                fontSize: '12px',
                fill: '#ff8000',
                fontStyle: 'bold'
            });
            specialText.setOrigin(0.5);
            
            this.tweens.add({
                targets: specialText,
                y: y - 20,
                alpha: 0,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => specialText.destroy()
            });
        }
    }

    // 新增：显示伤害数字
    showDamageNumber(x, y, damage) {
        const damageText = this.add.text(x, y, `-${damage}`, {
            fontSize: '14px',
            fill: '#ffffff',
            fontStyle: 'bold'
        });
        damageText.setOrigin(0.5);
        
        this.tweens.add({
            targets: damageText,
            y: y - 30,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
        });
    }

    // 根据分数计算应该存在的敌人数量
    calculateEnemyCountForScore(score) {
        // 根据分数阶段性增加敌人数量 - 强化敌人版本
        let enemyCount = this.baseEnemyCount; // 基础8个敌人
        
        if (score >= 50) enemyCount += 6;    // 50分: 14个敌人
        if (score >= 100) enemyCount += 8;   // 100分: 22个敌人
        if (score >= 200) enemyCount += 10;  // 200分: 32个敌人
        if (score >= 400) enemyCount += 12;  // 400分: 44个敌人
        if (score >= 800) enemyCount += 14;  // 800分: 58个敌人
        if (score >= 1600) enemyCount += 16; // 1600分: 74个敌人
        if (score >= 3200) enemyCount += 6;  // 3200分: 80个敌人（上限）
        
        return Math.min(enemyCount, this.maxEnemyCount);
    }

    // 根据分数计算重生延迟时间
    calculateRespawnDelay(score) {
        const delayReduction = Math.floor(score / 100) * 200; // 每100分减少200ms
        const delay = this.respawnDelayBase - delayReduction;
        return Math.max(delay, this.minRespawnDelay);
    }

    // 根据分数计算每次重生的敌人数量
    calculateRespawnCount(score) {
        // 无限怪物房间版本 - 更激进的重生策略
        if (score >= 1600) return 5;  // 1600分以上每次重生5个
        if (score >= 800) return 4;   // 800分以上每次重生4个
        if (score >= 400) return 3;   // 400分以上每次重生3个
        if (score >= 100) return 2;   // 100分以上每次重生2个
        return 1; // 默认重生1个
    }

    // 检查并调整敌人数量以匹配当前分数
    adjustEnemyCountForScore() {
        const targetCount = this.calculateEnemyCountForScore(this.score);
        const currentCount = this.enemies.countActive();
        
        if (currentCount < targetCount) {
            const spawnCount = targetCount - currentCount;
            console.log(`分数${this.score}: 当前敌人${currentCount}个，目标${targetCount}个，生成${spawnCount}个新敌人`);
            this.spawnEnemies(spawnCount);
        }
    }

    // 检查难度等级是否发生变化并显示提示
    checkDifficultyLevelChange() {
        const currentDifficultyLevel = this.getDifficultyLevel(this.score);
        if (currentDifficultyLevel > this.lastDifficultyLevel) {
            this.lastDifficultyLevel = currentDifficultyLevel;
            this.showDifficultyLevelUp(currentDifficultyLevel);
        }
    }

    // 获取当前难度等级
    getDifficultyLevel(score) {
        if (score >= 1600) return 7;
        if (score >= 800) return 6;
        if (score >= 400) return 5;
        if (score >= 200) return 4;
        if (score >= 100) return 3;
        if (score >= 50) return 2;
        return 1;
    }

    // 显示难度等级提升提示
    showDifficultyLevelUp(level) {
        const enemyCount = this.calculateEnemyCountForScore(this.score);
        const respawnDelay = this.calculateRespawnDelay(this.score);
        
        // 创建难度提升提示文本
        const difficultyText = this.add.text(400, 300, 
            `难度提升！等级 ${level}\n敌人数量: ${enemyCount}\n重生速度: ${(respawnDelay/1000).toFixed(1)}秒`, 
            {
                fontSize: '24px',
                fill: '#ffff00',
                align: 'center',
                backgroundColor: '#000000',
                padding: { x: 20, y: 10 }
            }
        );
        difficultyText.setOrigin(0.5);
        difficultyText.setScrollFactor(0); // 固定在屏幕上，不跟随摄像头
        
        // 添加闪烁效果
        this.tweens.add({
            targets: difficultyText,
            alpha: { from: 1, to: 0.3 },
            duration: 300,
            repeat: 3,
            yoyo: true,
            onComplete: () => {
                // 2秒后消失
                this.time.delayedCall(2000, () => {
                    difficultyText.destroy();
                });
            }
        });
        
        console.log(`难度等级提升到 ${level}! 敌人数量: ${enemyCount}, 重生延迟: ${respawnDelay}ms`);
    }

    // 更新玩家位置跟踪
    updatePlayerPositionTracking() {
        // 记录玩家body中心位置而非精灵位置
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        this.lastPlayerPosition.x = playerCenterX;
        this.lastPlayerPosition.y = playerCenterY;
    }

    showPauseMenu() {
        // 暂停游戏场景
        this.scene.pause();
        
        // 启动暂停菜单场景
        this.scene.launch('PauseScene', {
            gameScene: this
        });
    }

    // 实时位置输出 - 每500ms输出一次
    logPositionInfo() {
        // 精灵位置
        const spriteX = Math.round(this.player.x);
        const spriteY = Math.round(this.player.y);
        
        // Body位置及中心点
        const bodyX = Math.round(this.player.body.x);
        const bodyY = Math.round(this.player.body.y);
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        
        // 获取所有敌人的位置（基于body中心坐标计算距离）
        const enemies = this.enemies.getChildren();
        const enemyPositions = enemies.map(enemy => {
            const enemyCenterX = enemy.body.x + enemy.body.width / 2;
            const enemyCenterY = enemy.body.y + enemy.body.height / 2;
            return {
                x: Math.round(enemy.x), 
                y: Math.round(enemy.y),
                bodyX: Math.round(enemy.body.x),
                bodyY: Math.round(enemy.body.y),
                distance: Math.round(Phaser.Math.Distance.Between(
                    playerCenterX, playerCenterY, 
                    enemyCenterX, enemyCenterY
                ))
            };
        });
        
        // 找到最近的敌人（基于body中心距离）
        let nearestEnemy = null;
        let shortestDistance = Infinity;
        
        enemies.forEach(enemy => {
            if (enemy.active) {
                const enemyCenterX = enemy.body.x + enemy.body.width / 2;
                const enemyCenterY = enemy.body.y + enemy.body.height / 2;
                const distance = Phaser.Math.Distance.Between(
                    playerCenterX, playerCenterY, 
                    enemyCenterX, enemyCenterY
                );
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    nearestEnemy = {
                        spriteX: Math.round(enemy.x),
                        spriteY: Math.round(enemy.y),
                        bodyX: Math.round(enemy.body.x),
                        bodyY: Math.round(enemy.body.y),
                        distance: Math.round(distance)
                    };
                }
            }
        });
        
        console.log('=== 实时位置信息 (基于Body中心距离) ===');
        console.log(`玩家精灵位置: (${spriteX}, ${spriteY})`);
        console.log(`玩家Body位置: (${bodyX}, ${bodyY})`);
        console.log(`玩家Body中心: (${Math.round(playerCenterX)}, ${Math.round(playerCenterY)})`);
        
        if (nearestEnemy) {
            console.log(`最近怪物精灵: (${nearestEnemy.spriteX}, ${nearestEnemy.spriteY})`);
            console.log(`最近怪物Body: (${nearestEnemy.bodyX}, ${nearestEnemy.bodyY})`);
            console.log(`Body中心距离: ${nearestEnemy.distance}`);
        } else {
            console.log('最近怪物: 无');
        }
        
        if (enemyPositions.length > 0) {
            console.log(`所有敌人Body中心距离: ${enemyPositions.map(pos => `(${pos.x}, ${pos.y})[${pos.distance}]`).join(', ')}`);
        }
        console.log('==========================================');
    }

    // 新增：调试信息开关
    toggleDebug() {
        this.debugEnabled = !this.debugEnabled;
        // 通知 UI 场景显示/隐藏调试信息
        this.events.emit('debugToggled', this.debugEnabled);

        // 切换物理世界调试绘制
        if (this.debugEnabled) {
            this.physics.world.drawDebug = true;
            // 若未创建 debugGraphic，则创建
            if (!this.physics.world.debugGraphic) {
                this.physics.world.createDebugGraphic();
            }
            if (this.physics.world.debugGraphic) {
                this.physics.world.debugGraphic.setVisible(true);
            }
        } else {
            this.physics.world.drawDebug = false;
            if (this.physics.world.debugGraphic) {
                this.physics.world.debugGraphic.setVisible(false);
            }
        }

        console.log('Debug 模式:', this.debugEnabled ? '开启' : '关闭');
    }

    // 新增：新技能更新逻辑
    updateNewSkills() {
        // 更新火焰护体
        this.updateFireShield();
        
        // 更新分身
        this.updateClones();
        
        // 检查瞬移突进
        this.checkDashAttack();
        
        // 更新射击间隔
        this.updateAttackSpeed();
    }

    // 火焰护体更新
    updateFireShield() {
        const fireShieldLevel = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.FIRE_SHIELD);
        
        if (fireShieldLevel > 0 && !this.fireShieldActive) {
            this.activateFireShield();
        } else if (fireShieldLevel === 0 && this.fireShieldActive) {
            this.deactivateFireShield();
        }
        
        if (this.fireShieldActive) {
            // 检查是否需要重新创建火焰粒子（等级提升时）
            const currentParticleCount = this.fireShieldEffects.getChildren().length;
            const requiredParticleCount = Math.max(4, 4 + fireShieldLevel * 2);
            
            if (currentParticleCount !== requiredParticleCount) {
                // 重新创建火焰护体效果
                this.fireShieldEffects.clear(true, true);
                this.activateFireShield();
            } else {
                this.updateFireShieldEffects(fireShieldLevel);
            }
        }
    }

    // 激活火焰护体
    activateFireShield() {
        this.fireShieldActive = true;
        
        // 创建火焰护体效果
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        
        // 获取当前等级来决定火焰粒子数量
        const fireShieldLevel = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.FIRE_SHIELD);
        const particleCount = Math.max(4, 4 + fireShieldLevel * 2); // 基础4个，每级增加2个
        
        // 创建多个火焰粒子围绕玩家旋转
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const fireEffect = this.add.circle(
                playerCenterX + Math.cos(angle) * this.fireShieldRadius,
                playerCenterY + Math.sin(angle) * this.fireShieldRadius,
                6 + fireShieldLevel * 1.5, // 火焰大小随等级调整
                0xff4500
            );
            fireEffect.setAlpha(0.8);
            fireEffect.rotationAngle = angle;
            this.fireShieldEffects.add(fireEffect);
        }
        
        console.log(`火焰护体已激活 - 等级: ${fireShieldLevel}, 火焰粒子数量: ${particleCount}`);
    }

    // 停用火焰护体
    deactivateFireShield() {
        this.fireShieldActive = false;
        this.fireShieldEffects.clear(true, true);
        
        // 清理所有敌人的火焰伤害计时器
        this.enemyFireDamageTimers.clear();
        
        console.log('火焰护体已停用');
    }

    // 更新火焰护体效果
    updateFireShieldEffects(level) {
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        const time = this.time.now * 0.005; // 旋转速度
        
        // 更新火焰粒子位置
        this.fireShieldEffects.getChildren().forEach((fireEffect, index) => {
            const baseAngle = fireEffect.rotationAngle;
            const currentAngle = baseAngle + time;
            const radius = this.fireShieldRadius + level * 10; // 等级越高半径越大
            
            fireEffect.x = playerCenterX + Math.cos(currentAngle) * radius;
            fireEffect.y = playerCenterY + Math.sin(currentAngle) * radius;
            fireEffect.setRadius(6 + level * 2); // 等级越高火焰越大
        });
        
        // 检查与敌人的碰撞
        this.enemies.getChildren().forEach(enemy => {
            const enemyCenterX = enemy.body.x + enemy.body.width / 2;
            const enemyCenterY = enemy.body.y + enemy.body.height / 2;
            const distance = Phaser.Math.Distance.Between(
                playerCenterX, playerCenterY,
                enemyCenterX, enemyCenterY
            );
            
            if (distance <= this.fireShieldRadius + level * 10 + 20) {
                // 敌人在火焰护体范围内，造成伤害
                this.damageEnemyWithFireShield(enemy, level);
            }
        });
    }

    // 火焰护体对敌人造成伤害
    damageEnemyWithFireShield(enemy, level) {
        // 检查该敌人是否还在火焰护体伤害冷却中
        const enemyId = enemy.body.id || enemy.name || enemy.getData('id');
        const currentTime = this.time.now;
        
        if (this.enemyFireDamageTimers.has(enemyId)) {
            const lastDamageTime = this.enemyFireDamageTimers.get(enemyId);
            if (currentTime - lastDamageTime < this.fireShieldDamageDelay) {
                return; // 还在冷却中，不造成伤害
            }
        }
        
        // 记录本次伤害时间
        this.enemyFireDamageTimers.set(enemyId, currentTime);
        
        // 添加烧伤效果
        enemy.setTint(0xff4500); // 红色着色表示被烧伤
        
        // 减少击退效果 - 将原来的150 + level * 30改为80 + level * 15
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        const enemyCenterX = enemy.body.x + enemy.body.width / 2;
        const enemyCenterY = enemy.body.y + enemy.body.height / 2;
        
        const knockback = new Phaser.Math.Vector2(
            enemyCenterX - playerCenterX,
            enemyCenterY - playerCenterY
        ).normalize().scale(80 + level * 15); // 减少击退力度
        
        enemy.setVelocity(knockback.x, knockback.y);
        
        // 延迟销毁敌人 - 增加延迟时间让效果更温和
        this.time.delayedCall(500, () => {
            if (enemy.active) {
                enemy.destroy();
                this.score += 8; // 稍微减少分数奖励
                this.events.emit('updateScore', this.score);
                this.triggerLifeSteal(); // 触发生命吸取
                
                // 清理该敌人的伤害计时器
                this.enemyFireDamageTimers.delete(enemyId);
            }
        });
        
        console.log(`火焰护体造成伤害 - 等级: ${level}, 击退力度: ${80 + level * 15}`);
    }

    // 更新分身
    updateClones() {
        const cloneCount = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.SUMMON_CLONE);
        
        if (cloneCount > this.clones.countActive()) {
            this.spawnClones(cloneCount - this.clones.countActive());
        } else if (cloneCount < this.clones.countActive()) {
            // 移除多余的分身
            const excess = this.clones.countActive() - cloneCount;
            for (let i = 0; i < excess; i++) {
                const clone = this.clones.getFirstAlive();
                if (clone) clone.destroy();
            }
        }
        
        // 更新分身位置和行为
        this.updateCloneBehavior();
    }

    // 生成分身
    spawnClones(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = 100;
            const playerCenterX = this.player.body.x + this.player.body.width / 2;
            const playerCenterY = this.player.body.y + this.player.body.height / 2;
            
            const cloneX = playerCenterX + Math.cos(angle) * distance;
            const cloneY = playerCenterY + Math.sin(angle) * distance;
            
            const clone = this.clones.create(cloneX, cloneY, 'player');
            clone.setScale(0.035); // 与玩家相同的缩放
            clone.setAlpha(0.7); // 半透明表示是分身
            clone.setTint(0x00ffff); // 蓝色着色区分分身
            
            // 设置分身的碰撞体
            const targetBodySize = 32;
            const bodySize = targetBodySize / 0.035;
            clone.body.setSize(bodySize, bodySize);
            const offset = (1024 - bodySize) / 2;
            clone.body.setOffset(offset, offset);
            
            console.log('分身已生成');
        }
    }

    // 更新分身行为
    updateCloneBehavior() {
        const playerCenterX = this.player.body.x + this.player.body.width / 2;
        const playerCenterY = this.player.body.y + this.player.body.height / 2;
        
        this.clones.getChildren().forEach((clone, index) => {
            if (clone.active) {
                // 分身围绕玩家移动
                const angle = (index / this.clones.countActive()) * Math.PI * 2 + this.time.now * 0.002;
                const distance = 120;
                const targetX = playerCenterX + Math.cos(angle) * distance;
                const targetY = playerCenterY + Math.sin(angle) * distance;
                
                // 移动到目标位置
                const moveSpeed = 150;
                const dx = targetX - (clone.body.x + clone.body.width / 2);
                const dy = targetY - (clone.body.y + clone.body.height / 2);
                const distance2 = Math.sqrt(dx * dx + dy * dy);
                
                if (distance2 > 20) {
                    clone.setVelocity(
                        (dx / distance2) * moveSpeed,
                        (dy / distance2) * moveSpeed
                    );
                } else {
                    clone.setVelocity(0, 0);
                }
                
                // 分身自动攻击
                this.updateCloneAttack(clone);
            }
        });
    }

    // 分身攻击逻辑
    updateCloneAttack(clone) {
        // 每2秒射击一次
        if (this.time.now - this.cloneShootTimer > 2000) {
            const nearestEnemy = this.findNearestEnemyToClone(clone);
            if (nearestEnemy) {
                this.cloneShoot(clone, nearestEnemy);
                this.cloneShootTimer = this.time.now;
            }
        }
    }

    // 找到分身附近最近的敌人
    findNearestEnemyToClone(clone) {
        let nearestEnemy = null;
        let shortestDistance = 200; // 分身攻击范围
        
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
                const distance = Phaser.Math.Distance.Between(
                    clone.body.x + clone.body.width / 2,
                    clone.body.y + clone.body.height / 2,
                    enemy.body.x + enemy.body.width / 2,
                    enemy.body.y + enemy.body.height / 2
                );
                
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    nearestEnemy = enemy;
                }
            }
        });
        
        return nearestEnemy;
    }

    // 分身射击
    cloneShoot(clone, target) {
        const cloneCenterX = clone.body.x + clone.body.width / 2;
        const cloneCenterY = clone.body.y + clone.body.height / 2;
        const targetCenterX = target.body.x + target.body.width / 2;
        const targetCenterY = target.body.y + target.body.height / 2;
        
        const bullet = this.cloneBullets.get(cloneCenterX, cloneCenterY);
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.setScale(0.0156); // 与主角子弹相同
            bullet.setTint(0x00ffff); // 蓝色着色区分分身子弹
            
            const angle = Phaser.Math.Angle.Between(cloneCenterX, cloneCenterY, targetCenterX, targetCenterY);
            bullet.setRotation(angle);
            this.physics.velocityFromRotation(angle, this.bulletSpeed * 0.8, bullet.body.velocity);
            
            // 设置碰撞体
            const targetBulletBodySize = 20;
            const bulletBodySize = targetBulletBodySize / 0.0156;
            bullet.body.setSize(bulletBodySize, bulletBodySize);
            const bulletOffsetX = (1536 - bulletBodySize) / 2;
            const bulletOffsetY = (1024 - bulletBodySize) / 2;
            bullet.body.setOffset(bulletOffsetX, bulletOffsetY);
        }
    }

    // 检查瞬移突进
    checkDashAttack() {
        const dashLevel = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.DASH_ATTACK);
        
        if (dashLevel > 0 && this.spaceKey.isDown && this.time.now - this.lastDashTime > this.dashCooldown) {
            this.performDashAttack(dashLevel);
        }
    }

    // 执行瞬移突进
    performDashAttack(level) {
        // 瞬移到鼠标位置
        const pointer = this.input.activePointer;
        const targetX = pointer.worldX;
        const targetY = pointer.worldY;
        
        // 检查目标位置是否有效
        if (this.isValidDashPosition(targetX, targetY)) {
            // 记录原位置
            const oldX = this.player.x;
            const oldY = this.player.y;
            
            // 瞬移
            this.player.setPosition(targetX, targetY);
            
            // 产生冲击波效果
            this.createDashImpact(targetX, targetY, level);
            
            // 更新冷却时间
            this.lastDashTime = this.time.now;
            
            console.log(`瞬移突进！从 (${Math.round(oldX)}, ${Math.round(oldY)}) 到 (${Math.round(targetX)}, ${Math.round(targetY)})`);
        }
    }

    // 检查瞬移位置是否有效
    isValidDashPosition(x, y) {
        // 检查是否在地图边界内
        if (x < 32 || x >= this.map.widthInPixels - 32 || 
            y < 32 || y >= this.map.heightInPixels - 32) {
            return false;
        }
        
        // 检查是否为地板
        const tileX = Math.floor(x / 32);
        const tileY = Math.floor(y / 32);
        const floorTile = this.floorLayer.getTileAt(tileX, tileY);
        const wallTile = this.wallLayer.getTileAt(tileX, tileY);
        
        return floorTile && floorTile.index === 0 && (!wallTile || wallTile.index !== 1);
    }

    // 创建瞬移冲击效果
    createDashImpact(x, y, level) {
        // 创建冲击波圆圈
        const impactRadius = 60 + level * 20;
        const impactCircle = this.add.circle(x, y, impactRadius, 0xffff00);
        impactCircle.setAlpha(0.5);
        
        // 冲击波扩散动画
        this.tweens.add({
            targets: impactCircle,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => impactCircle.destroy()
        });
        
        // 对范围内的敌人造成伤害
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
                const distance = Phaser.Math.Distance.Between(
                    x, y,
                    enemy.body.x + enemy.body.width / 2,
                    enemy.body.y + enemy.body.height / 2
                );
                
                if (distance <= impactRadius) {
                    // 击退敌人
                    const knockback = new Phaser.Math.Vector2(
                        enemy.body.x + enemy.body.width / 2 - x,
                        enemy.body.y + enemy.body.height / 2 - y
                    ).normalize().scale(300 + level * 50);
                    
                    enemy.setVelocity(knockback.x, knockback.y);
                    
                    // 销毁敌人
                    this.time.delayedCall(100, () => {
                        if (enemy.active) {
                            enemy.destroy();
                            this.score += 10;
                            this.events.emit('updateScore', this.score);
                            this.triggerLifeSteal(); // 触发生命吸取
                        }
                    });
                }
            }
        });
    }

    // 更新攻击速度
    updateAttackSpeed() {
        const newInterval = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.ATTACK_SPEED);
        if (newInterval !== this.shootInterval) {
            this.shootInterval = newInterval;
            console.log(`攻击速度更新: ${this.shootInterval}ms 间隔`);
        }
    }

    // 生命吸取触发
    triggerLifeSteal() {
        const lifeStealChance = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.LIFE_STEAL);
        
        if (lifeStealChance > 0 && Math.random() * 100 < lifeStealChance) {
            if (this.playerHp < this.maxPlayerHp) {
                this.playerHp++;
                this.events.emit('updateHP', this.playerHp, this.maxPlayerHp);
                
                // 创建治疗效果
                const healEffect = this.add.text(
                    this.player.x, this.player.y - 30,
                    '+1 HP', 
                    { fontSize: '16px', fill: '#00ff00' }
                );
                healEffect.setOrigin(0.5);
                
                this.tweens.add({
                    targets: healEffect,
                    y: healEffect.y - 30,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => healEffect.destroy()
                });
                
                console.log(`生命吸取触发！回复1点生命值，当前血量: ${this.playerHp}/${this.maxPlayerHp}`);
            }
        }
    }

    // 子弹撞墙处理（支持反弹）
    handleBulletWallCollision(bullet, wall) {
        const bounceCount = this.upgradeManager.getUpgradeValue(UpgradeManager.UPGRADE_TYPES.BULLET_BOUNCE);
        
        if (bounceCount > 0 && (!bullet.bounces || bullet.bounces < bounceCount)) {
            // 初始化反弹计数
            if (!bullet.bounces) bullet.bounces = 0;
            bullet.bounces++;
            
            // 计算反弹方向
            const bulletVelocity = bullet.body.velocity;
            const wallTileX = wall.x;
            const wallTileY = wall.y;
            
            // 简单的反弹逻辑：反转速度分量
            if (Math.abs(bullet.x - wallTileX) > Math.abs(bullet.y - wallTileY)) {
                // 水平撞击，反转X速度
                bullet.body.velocity.x = -bulletVelocity.x;
            } else {
                // 垂直撞击，反转Y速度
                bullet.body.velocity.y = -bulletVelocity.y;
            }
            
            // 更新子弹旋转
            const newAngle = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
            bullet.setRotation(newAngle);
            
            console.log(`子弹反弹！剩余反弹次数: ${bounceCount - bullet.bounces}`);
        } else {
            // 没有反弹能力或反弹次数用完，销毁子弹
            bullet.destroy();
        }
    }

    // 新增：应用敌人强化效果
    applyEnemyEnhancement(enemy, enhancementLevel) {
        const enhancement = this.enemyEnhancementLevels[enhancementLevel];
        
        // 设置敌人的基础属性
        const baseScale = 0.035;
        const finalScale = baseScale * enhancement.scale;
        enemy.setScale(finalScale);
        
        // 设置颜色着色
        enemy.setTint(enhancement.tint);
        
        // 设置碰撞体
        const targetEnemyBodySize = 28 * enhancement.scale; // 碰撞体也根据等级缩放
        const enemyBodySize = targetEnemyBodySize / finalScale;
        enemy.body.setSize(enemyBodySize, enemyBodySize);
        
        const enemyTextureSize = 1024;
        const enemyOffset = (enemyTextureSize - enemyBodySize) / 2;
        enemy.body.setOffset(enemyOffset, enemyOffset);
        
        enemy.setCollideWorldBounds(false);
        
        // 设置敌人的强化属性
        enemy.setData('enhancementLevel', enhancementLevel);
        enemy.setData('maxHp', enhancement.hp);
        enemy.setData('currentHp', enhancement.hp);
        enemy.setData('speedMultiplier', enhancement.speed);
        enemy.setData('scoreValue', enhancement.scoreValue);
        enemy.setData('name', enhancement.name);
        
        // 如果是强化敌人，添加血量显示
        if (enhancementLevel > 0) {
            this.createEnemyHealthBar(enemy);
        }
    }

    // 新增：创建敌人血量条
    createEnemyHealthBar(enemy) {
        const maxHp = enemy.getData('maxHp');
        if (maxHp <= 1) return; // 普通敌人不显示血量条
        
        // 创建血量条背景
        const healthBarBg = this.add.rectangle(enemy.x, enemy.y - 30, 30, 4, 0x000000);
        healthBarBg.setOrigin(0.5);
        
        // 创建血量条前景
        const healthBarFg = this.add.rectangle(enemy.x, enemy.y - 30, 30, 4, 0x00ff00);
        healthBarFg.setOrigin(0.5);
        
        // 将血量条关联到敌人
        enemy.setData('healthBarBg', healthBarBg);
        enemy.setData('healthBarFg', healthBarFg);
        
        // 更新血量条显示
        this.updateEnemyHealthBar(enemy);
    }

    // 新增：更新敌人血量条
    updateEnemyHealthBar(enemy) {
        const healthBarBg = enemy.getData('healthBarBg');
        const healthBarFg = enemy.getData('healthBarFg');
        
        if (healthBarBg && healthBarFg) {
            const currentHp = enemy.getData('currentHp');
            const maxHp = enemy.getData('maxHp');
            
            // 更新位置
            healthBarBg.setPosition(enemy.x, enemy.y - 35);
            healthBarFg.setPosition(enemy.x, enemy.y - 35);
            
            // 更新血量条长度
            const healthPercentage = currentHp / maxHp;
            healthBarFg.scaleX = healthPercentage;
            
            // 根据血量改变颜色
            if (healthPercentage > 0.6) {
                healthBarFg.setFillStyle(0x00ff00); // 绿色
            } else if (healthPercentage > 0.3) {
                healthBarFg.setFillStyle(0xffff00); // 黄色
            } else {
                healthBarFg.setFillStyle(0xff0000); // 红色
            }
        }
    }

    // 新增：移除敌人血量条
    removeEnemyHealthBar(enemy) {
        const healthBarBg = enemy.getData('healthBarBg');
        const healthBarFg = enemy.getData('healthBarFg');
        
        if (healthBarBg) {
            healthBarBg.destroy();
            enemy.setData('healthBarBg', null);
        }
        if (healthBarFg) {
            healthBarFg.destroy();
            enemy.setData('healthBarFg', null);
        }
    }
}
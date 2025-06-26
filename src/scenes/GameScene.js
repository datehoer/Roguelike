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
        this.baseEnemyCount = 3; // 基础敌人数量
        this.maxEnemyCount = 20; // 最大敌人数量
        this.scoreThresholds = [0, 50, 100, 200, 400, 800, 1600]; // 分数阈值
        this.respawnDelayBase = 3000; // 基础重生延迟（毫秒）
        this.minRespawnDelay = 500; // 最小重生延迟（毫秒）
        
        // 新增：动态生成相关变量
        this.proximitySpawnRadius = 400; // 玩家周围生成范围
        this.minSpawnDistance = 250; // 最小生成距离（增加到250像素，避免直接在玩家身边生成）
        this.maxSpawnDistance = 600; // 最大生成距离
        this.spawnAttempts = 20; // 寻找有效生成位置的最大尝试次数
        
        // 新增：智能生成相关变量
        this.lastPlayerPosition = { x: 0, y: 0 }; // 记录上次玩家位置
        this.playerMovementThreshold = 100; // 玩家移动阈值
        this.adaptiveSpawnDistance = { min: 200, max: 600 }; // 自适应生成距离（提高最小值）
        this.enemyDistributionCheck = true; // 是否检查敌人分布
        
        // 添加定期检查计时器
        this.lastEnemyCheck = 0;
        this.enemyCheckInterval = 5000; // 每5秒检查一次敌人数量
        this.lastDifficultyLevel = 0; // 记录上次的难度等级
        // 新增：调试模式开关
        this.debugEnabled = false;
    }

    create() {
        // 重置升级管理器
        this.upgradeManager.reset();
        
        // 重置玩家状态
        this.playerHp = 3;
        this.maxPlayerHp = 3;
        this.score = 0;
        this.playerSpeed = 200; // 重置速度
        
        // 1. 地图生成
        this.map = this.make.tilemap({ tileWidth: 32, tileHeight: 32, width: 50, height: 50 });
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
        
        this.physics.add.collider(this.bullets, this.wallLayer, (bullet) => bullet.destroy());
        this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemyCollision, null, this);

        // 6. 输入控制
        this.cursors = this.input.keyboard.createCursorKeys();
        // 添加WASD键支持
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        // 添加ESC键支持暂停功能
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => this.showPauseMenu());
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
        }

        // 发送升级事件通知UI
        this.events.emit('upgradeApplied', upgradeInfo);
    }

    // --- 主要修改区域开始 ---

    generateDungeon() {
        // 首先用墙填充整个地图 (使用瓦片索引1)
        this.wallLayer.fill(1, 0, 0, this.map.width, this.map.height);

        this.rooms = [];
        const maxRooms = 15; // 增加房间数量
        const minRoomSize = 6; // 尺寸单位: 瓦片
        const maxRoomSize = 12; // 尺寸单位: 瓦片

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
                if (Phaser.Geom.Intersects.RectangleToRectangle(newRoomInTiles, 
                    Phaser.Geom.Rectangle.Inflate(otherRoomTiles, 2, 2))) {
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
        const extraConnections = Math.floor(this.rooms.length / 3); // 添加一些额外连接
        
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
        const tileY = this.map.worldToTileY(y);

        for (let x = startX; x <= endX; x++) {
            this.floorLayer.putTileAt(0, x, tileY);
            this.wallLayer.putTileAt(-1, x, tileY);
        }
    }

    digVerticalCorridor(y1, y2, x) {
        const startY = this.map.worldToTileY(Math.min(y1, y2));
        const endY = this.map.worldToTileY(Math.max(y1, y2));
        const tileX = this.map.worldToTileX(x);

        for (let y = startY; y <= endY; y++) {
            this.floorLayer.putTileAt(0, tileX, y);
            this.wallLayer.putTileAt(-1, tileX, y);
        }
    }

    // --- 主要修改区域结束 ---


    spawnEnemies(count) {
        console.log(`尝试生成 ${count} 个敌人，当前房间数量: ${this.rooms.length}`);
        
        // 定义可用的小龙人贴图数组
        const dragonTextures = ['xiaolongren', 'xiaolongren1', 'xiaolongren2'];
        
        for (let i = 0; i < count; i++) {
            const spawnPosition = this.findValidSpawnPosition();
            
            if (spawnPosition) {
                // 随机选择一种小龙人贴图
                const randomTexture = Phaser.Utils.Array.GetRandom(dragonTextures);
                const enemy = this.enemies.create(spawnPosition.x, spawnPosition.y, randomTexture);
                
                // 设置小龙人的缩放和碰撞体，参考玩家设置
                // 假设小龙人图片尺寸和玩家类似，如果实际尺寸不同请调整scale值
                const enemyScale = 0.035; // 相比玩家稍小一点
                enemy.setScale(enemyScale);
                
                // 设置碰撞体，参考玩家的设置方式
                const targetEnemyBodySize = 28; // 敌人碰撞体稍小于玩家
                const enemyBodySize = targetEnemyBodySize / enemyScale;
                enemy.body.setSize(enemyBodySize, enemyBodySize);
                
                // 设置偏移量使其在纹理中居中，假设图片尺寸为1024x1024
                const enemyTextureSize = 1024; // 如果xiaolongren图片尺寸不同，请调整此值
                const enemyOffset = (enemyTextureSize - enemyBodySize) / 2;
                enemy.body.setOffset(enemyOffset, enemyOffset);
                
                enemy.setCollideWorldBounds(false);
                
                // 使用body中心坐标计算距离
                const playerCenterX = this.player.body.x + this.player.body.width / 2;
                const playerCenterY = this.player.body.y + this.player.body.height / 2;
                const enemyCenterX = enemy.body.x + enemy.body.width / 2;
                const enemyCenterY = enemy.body.y + enemy.body.height / 2;
                const distanceToPlayer = Phaser.Math.Distance.Between(
                    playerCenterX, playerCenterY, 
                    enemyCenterX, enemyCenterY
                );
                
                console.log(`敌人生成在位置: (${spawnPosition.x}, ${spawnPosition.y})，使用贴图: ${randomTexture}，Body中心距离玩家: ${Math.round(distanceToPlayer)}像素`);
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
        
        // 先尝试在除玩家当前房间外的其他房间生成
        if (this.rooms.length >= 2) {
            for (let attempt = 0; attempt < 10; attempt++) {
                const roomIndex = Phaser.Math.Between(1, this.rooms.length - 1);
                const room = this.rooms[roomIndex];
                if (room) {
                    const enemyX = Phaser.Math.Between(room.x + 16, room.right - 16);
                    const enemyY = Phaser.Math.Between(room.y + 16, room.bottom - 16);
                    
                    // 检查距离玩家是否足够远
                    const distanceToPlayer = Phaser.Math.Distance.Between(
                        playerCenterX, playerCenterY, enemyX, enemyY
                    );
                    
                    if (distanceToPlayer >= this.minSpawnDistance) {
                        // 随机选择一种小龙人贴图
                        const randomTexture = Phaser.Utils.Array.GetRandom(dragonTextures);
                        const enemy = this.enemies.create(enemyX, enemyY, randomTexture);
                        
                        // 设置小龙人的缩放和碰撞体，与主要生成方法保持一致
                        const enemyScale = 0.035;
                        enemy.setScale(enemyScale);
                        
                        const targetEnemyBodySize = 28;
                        const enemyBodySize = targetEnemyBodySize / enemyScale;
                        enemy.body.setSize(enemyBodySize, enemyBodySize);
                        
                        const enemyTextureSize = 1024;
                        const enemyOffset = (enemyTextureSize - enemyBodySize) / 2;
                        enemy.body.setOffset(enemyOffset, enemyOffset);
                        
                        enemy.setCollideWorldBounds(false);
                        console.log(`备用方法：敌人生成在房间 ${roomIndex}，位置: (${enemyX}, ${enemyY})，使用贴图: ${randomTexture}，距离玩家: ${Math.round(distanceToPlayer)}像素`);
                        spawnSuccess = true;
                        break;
                    }
                }
            }
        }
        
        // 如果上面的方法失败，尝试在第一个房间（玩家房间）的边缘生成
        if (!spawnSuccess && this.rooms.length > 0) {
            const room = this.rooms[0];
            if (room) {
                for (let attempt = 0; attempt < 10; attempt++) {
                    const enemyX = Phaser.Math.Between(room.x + 16, room.right - 16);
                    const enemyY = Phaser.Math.Between(room.y + 16, room.bottom - 16);
                    
                    // 检查距离玩家是否足够远
                    const distanceToPlayer = Phaser.Math.Distance.Between(
                        playerCenterX, playerCenterY, enemyX, enemyY
                    );
                    
                    if (distanceToPlayer >= this.minSpawnDistance) {
                        // 随机选择一种小龙人贴图
                        const randomTexture = Phaser.Utils.Array.GetRandom(dragonTextures);
                        const enemy = this.enemies.create(enemyX, enemyY, randomTexture);
                        
                        // 设置小龙人的缩放和碰撞体，与主要生成方法保持一致
                        const enemyScale = 0.035;
                        enemy.setScale(enemyScale);
                        
                        const targetEnemyBodySize = 28;
                        const enemyBodySize = targetEnemyBodySize / enemyScale;
                        enemy.body.setSize(enemyBodySize, enemyBodySize);
                        
                        const enemyTextureSize = 1024;
                        const enemyOffset = (enemyTextureSize - enemyBodySize) / 2;
                        enemy.body.setOffset(enemyOffset, enemyOffset);
                        
                        enemy.setCollideWorldBounds(false);
                        console.log(`备用方法：敌人生成在位置: (${enemyX}, ${enemyY})，使用贴图: ${randomTexture}，距离玩家: ${Math.round(distanceToPlayer)}像素`);
                        spawnSuccess = true;
                        break;
                    }
                }
            }
        }
        
        if (!spawnSuccess) {
            console.log('备用生成方法：无法找到足够远的位置生成敌人');
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
                    // 使用body中心位置进行移动目标计算
                    const angle = Phaser.Math.Angle.Between(
                        enemyCenterX, enemyCenterY,
                        playerCenterX, playerCenterY
                    );
                    const velocity = this.physics.velocityFromAngle(
                        Phaser.Math.RadToDeg(angle), 
                        this.enemySpeed
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
        
        bullet.destroy();
        enemy.destroy();
        
        this.score += 10;
        this.events.emit('updateScore', this.score);
        
        // 改进的再生机制 - 根据分数动态调整
        const respawnDelay = this.calculateRespawnDelay(this.score);
        const respawnCount = this.calculateRespawnCount(this.score);
        
        console.log(`敌人被击杀，当前分数: ${this.score}, ${respawnDelay}ms后重生${respawnCount}个敌人`);
        
        this.time.delayedCall(respawnDelay, () => {
            // 再次检查游戏是否仍在进行
            if (!this.player.active) {
                return;
            }
            
            console.log('开始重生敌人...');
            this.spawnEnemies(respawnCount);
            
            // 检查是否需要额外调整敌人数量以匹配当前分数等级
            this.adjustEnemyCountForScore();
            
            console.log('敌人重生完成，当前敌人数量:', this.enemies.countActive());
        });
    }

    // 根据分数计算应该存在的敌人数量
    calculateEnemyCountForScore(score) {
        // 根据分数阶段性增加敌人数量
        let enemyCount = this.baseEnemyCount;
        
        if (score >= 50) enemyCount += 2;    // 50分: 5个敌人
        if (score >= 100) enemyCount += 2;   // 100分: 7个敌人
        if (score >= 200) enemyCount += 3;   // 200分: 10个敌人
        if (score >= 400) enemyCount += 3;   // 400分: 13个敌人
        if (score >= 800) enemyCount += 4;   // 800分: 17个敌人
        if (score >= 1600) enemyCount += 3;  // 1600分: 20个敌人
        
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
        if (score >= 800) return 3;  // 800分以上每次重生3个
        if (score >= 400) return 2;  // 400分以上每次重生2个
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
}
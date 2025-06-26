export default class UpgradeManager {
    static UPGRADE_TYPES = {
        BULLET_COUNT: 'bulletCount',
        BULLET_SPREAD: 'bulletSpread', 
        HP_BOOST: 'hpBoost',
        SPEED_BOOST: 'speedBoost',
        // 新增技能
        FIRE_SHIELD: 'fireShield',           // 火焰护体
        DASH_ATTACK: 'dashAttack',           // 瞬移突进
        BULLET_PIERCE: 'bulletPierce',       // 混天绫穿透
        SUMMON_CLONE: 'summonClone',         // 分身术
        BULLET_BOUNCE: 'bulletBounce',       // 子弹反弹
        LIFE_STEAL: 'lifeSteal',             // 生命吸取
        ATTACK_SPEED: 'attackSpeed',         // 攻击速度
        EXPLOSIVE_SHOT: 'explosiveShot'      // 爆炸冲击
    };

    static UPGRADE_DATA = {
        [UpgradeManager.UPGRADE_TYPES.BULLET_COUNT]: {
            name: '多重射击',
            description: '增加射击子弹数量',
            icon: '⚡',
            maxLevel: 5,
            baseValue: 1,
            increment: 1
        },
        [UpgradeManager.UPGRADE_TYPES.BULLET_SPREAD]: {
            name: '散射模式',
            description: '增加射击方向数量',
            icon: '🌟',
            maxLevel: 4,
            baseValue: 1,
            increment: 2 // 每级增加2个方向：3, 5, 7, 9
        },
        [UpgradeManager.UPGRADE_TYPES.HP_BOOST]: {
            name: '生命强化',
            description: '增加最大生命值',
            icon: '❤️',
            maxLevel: 5,
            baseValue: 3,
            increment: 1
        },
        [UpgradeManager.UPGRADE_TYPES.SPEED_BOOST]: {
            name: '速度提升',
            description: '增加移动速度',
            icon: '💨',
            maxLevel: 5,
            baseValue: 200,
            increment: 50
        },
        // 新增技能数据
        [UpgradeManager.UPGRADE_TYPES.FIRE_SHIELD]: {
            name: '火焰护体',
            description: '周围环绕火焰护盾，烧伤接触的敌人',
            icon: '🔥',
            maxLevel: 4,
            baseValue: 0,  // 0表示未激活
            increment: 1   // 每级增加护盾效果
        },
        [UpgradeManager.UPGRADE_TYPES.DASH_ATTACK]: {
            name: '瞬移突进',
            description: '瞬移到目标位置并造成冲击伤害',
            icon: '⚡',
            maxLevel: 4,
            baseValue: 0,  // 0表示未激活
            increment: 1
        },
        [UpgradeManager.UPGRADE_TYPES.BULLET_PIERCE]: {
            name: '混天绫穿透',
            description: '混天绫可以穿透多个敌人',
            icon: '🌪️',
            maxLevel: 5,
            baseValue: 0,  // 0表示无穿透
            increment: 1   // 每级增加1次穿透
        },
        [UpgradeManager.UPGRADE_TYPES.SUMMON_CLONE]: {
            name: '分身术',
            description: '召唤分身协助战斗',
            icon: '👥',
            maxLevel: 3,
            baseValue: 0,  // 0表示无分身
            increment: 1   // 每级增加1个分身
        },
        [UpgradeManager.UPGRADE_TYPES.BULLET_BOUNCE]: {
            name: '子弹反弹',
            description: '混天绫撞墙后反弹继续攻击',
            icon: '💎',
            maxLevel: 4,
            baseValue: 0,  // 0表示无反弹
            increment: 1   // 每级增加1次反弹
        },
        [UpgradeManager.UPGRADE_TYPES.LIFE_STEAL]: {
            name: '生命吸取',
            description: '击杀敌人时有几率回复生命值',
            icon: '🩸',
            maxLevel: 5,
            baseValue: 0,  // 0%几率
            increment: 15  // 每级增加15%几率（15%, 30%, 45%, 60%, 75%）
        },
        [UpgradeManager.UPGRADE_TYPES.ATTACK_SPEED]: {
            name: '攻击速度',
            description: '增加射击频率',
            icon: '🏹',
            maxLevel: 6,
            baseValue: 300, // 基础射击间隔(ms)
            increment: -40  // 每级减少40ms间隔
        },
        [UpgradeManager.UPGRADE_TYPES.EXPLOSIVE_SHOT]: {
            name: '爆炸冲击',
            description: '混天绫击中敌人时产生爆炸',
            icon: '💥',
            maxLevel: 4,
            baseValue: 0,  // 0表示无爆炸
            increment: 1   // 每级增加爆炸效果
        }
    };

    constructor() {
        this.upgrades = {
            [UpgradeManager.UPGRADE_TYPES.BULLET_COUNT]: 0,
            [UpgradeManager.UPGRADE_TYPES.BULLET_SPREAD]: 0,
            [UpgradeManager.UPGRADE_TYPES.HP_BOOST]: 0,
            [UpgradeManager.UPGRADE_TYPES.SPEED_BOOST]: 0,
            // 新增技能初始化
            [UpgradeManager.UPGRADE_TYPES.FIRE_SHIELD]: 0,
            [UpgradeManager.UPGRADE_TYPES.DASH_ATTACK]: 0,
            [UpgradeManager.UPGRADE_TYPES.BULLET_PIERCE]: 0,
            [UpgradeManager.UPGRADE_TYPES.SUMMON_CLONE]: 0,
            [UpgradeManager.UPGRADE_TYPES.BULLET_BOUNCE]: 0,
            [UpgradeManager.UPGRADE_TYPES.LIFE_STEAL]: 0,
            [UpgradeManager.UPGRADE_TYPES.ATTACK_SPEED]: 0,
            [UpgradeManager.UPGRADE_TYPES.EXPLOSIVE_SHOT]: 0
        };

        // 升级触发分数阈值 - 改为动态计算
        this.baseUpgradeInterval = 100; // 基础升级间隔
        this.intervalIncrease = 50; // 每次升级后间隔增加量
        this.upgradeCount = 0; // 已完成的升级次数
        this.nextUpgradeThreshold = this.baseUpgradeInterval; // 下次升级所需分数
    }

    // 检查是否应该触发升级
    checkForUpgrade(currentScore) {
        if (currentScore >= this.nextUpgradeThreshold) {
            // 计算下次升级阈值
            this.upgradeCount++;
            this.nextUpgradeThreshold = this.calculateNextUpgradeThreshold();
            console.log(`升级触发！已完成升级次数: ${this.upgradeCount}, 下次升级需要: ${this.nextUpgradeThreshold} 分`);
            return true;
        }
        return false;
    }

    // 计算下次升级阈值（递增难度）
    calculateNextUpgradeThreshold() {
        // 公式：baseInterval + (count * intervalIncrease) + (count^1.3 * 30)
        // 这样会产生类似：100, 180, 290, 430, 600, 800, 1030, 1290, 1580, 1900... 的序列
        const linearIncrease = this.upgradeCount * this.intervalIncrease;
        const exponentialIncrease = Math.floor(Math.pow(this.upgradeCount, 1.3) * 30);
        
        return this.nextUpgradeThreshold + this.baseUpgradeInterval + linearIncrease + exponentialIncrease;
    }

    // 获取下次升级所需分数（用于UI显示）
    getNextUpgradeThreshold() {
        return this.nextUpgradeThreshold;
    }

    // 获取升级进度信息
    getUpgradeProgress(currentScore) {
        if (currentScore >= this.nextUpgradeThreshold) {
            return {
                ready: true,
                current: currentScore,
                target: this.nextUpgradeThreshold,
                progress: 1.0
            };
        }
        
        // 计算上次升级阈值
        let lastThreshold = 0;
        if (this.upgradeCount > 0) {
            // 重新计算上次的阈值
            let tempThreshold = this.baseUpgradeInterval;
            for (let i = 1; i < this.upgradeCount; i++) {
                const linearIncrease = i * this.intervalIncrease;
                const exponentialIncrease = Math.floor(Math.pow(i, 1.3) * 30);
                tempThreshold += this.baseUpgradeInterval + linearIncrease + exponentialIncrease;
            }
            lastThreshold = tempThreshold;
        }
        
        const progressRange = this.nextUpgradeThreshold - lastThreshold;
        const currentProgress = currentScore - lastThreshold;
        
        return {
            ready: false,
            current: currentScore,
            target: this.nextUpgradeThreshold,
            progress: Math.max(0, Math.min(1, currentProgress / progressRange)),
            pointsNeeded: this.nextUpgradeThreshold - currentScore
        };
    }

    // 生成升级选项（随机3个）
    generateUpgradeOptions() {
        const availableUpgrades = [];
        
        // 过滤出还可以升级的选项
        Object.keys(this.upgrades).forEach(type => {
            const upgradeData = UpgradeManager.UPGRADE_DATA[type];
            if (this.upgrades[type] < upgradeData.maxLevel) {
                availableUpgrades.push(type);
            }
        });

        // 如果没有可升级的项目，返回空数组
        if (availableUpgrades.length === 0) {
            return [];
        }

        // 随机选择3个（如果可用的少于3个，就全部返回）
        const shuffled = [...availableUpgrades].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(3, shuffled.length));
    }

    // 应用升级
    applyUpgrade(upgradeType) {
        const upgradeData = UpgradeManager.UPGRADE_DATA[upgradeType];
        if (this.upgrades[upgradeType] < upgradeData.maxLevel) {
            this.upgrades[upgradeType]++;
            return true;
        }
        return false;
    }

    // 获取升级当前值
    getUpgradeValue(upgradeType) {
        const upgradeData = UpgradeManager.UPGRADE_DATA[upgradeType];
        const level = this.upgrades[upgradeType];
        
        switch (upgradeType) {
            case UpgradeManager.UPGRADE_TYPES.BULLET_COUNT:
                return upgradeData.baseValue + (level * upgradeData.increment);
            
            case UpgradeManager.UPGRADE_TYPES.BULLET_SPREAD:
                if (level === 0) return 1; // 默认1个方向
                return 1 + (level * upgradeData.increment); // 3, 5, 7, 9方向
            
            case UpgradeManager.UPGRADE_TYPES.HP_BOOST:
                return upgradeData.baseValue + (level * upgradeData.increment);
            
            case UpgradeManager.UPGRADE_TYPES.SPEED_BOOST:
                return upgradeData.baseValue + (level * upgradeData.increment);
            
            // 新增技能值计算
            case UpgradeManager.UPGRADE_TYPES.FIRE_SHIELD:
                return level; // 直接返回等级，0表示未激活
            
            case UpgradeManager.UPGRADE_TYPES.DASH_ATTACK:
                return level; // 直接返回等级，0表示未激活
            
            case UpgradeManager.UPGRADE_TYPES.BULLET_PIERCE:
                return level; // 穿透次数
            
            case UpgradeManager.UPGRADE_TYPES.SUMMON_CLONE:
                return level; // 分身数量
            
            case UpgradeManager.UPGRADE_TYPES.BULLET_BOUNCE:
                return level; // 反弹次数
            
            case UpgradeManager.UPGRADE_TYPES.LIFE_STEAL:
                return level * upgradeData.increment; // 生命吸取几率百分比
            
            case UpgradeManager.UPGRADE_TYPES.ATTACK_SPEED:
                return Math.max(50, upgradeData.baseValue + (level * upgradeData.increment)); // 射击间隔，最小50ms
            
            case UpgradeManager.UPGRADE_TYPES.EXPLOSIVE_SHOT:
                return level; // 直接返回等级，0表示未激活
            
            default:
                return upgradeData.baseValue;
        }
    }

    // 获取升级信息文本
    getUpgradeInfo(upgradeType) {
        const upgradeData = UpgradeManager.UPGRADE_DATA[upgradeType];
        const currentLevel = this.upgrades[upgradeType];
        const currentValue = this.getUpgradeValue(upgradeType);
        
        let nextValue = null;
        if (currentLevel < upgradeData.maxLevel) {
            // 临时增加一级来计算下一级的值
            this.upgrades[upgradeType]++;
            nextValue = this.getUpgradeValue(upgradeType);
            this.upgrades[upgradeType]--; // 恢复原始值
        }

        let valueText = '';
        switch (upgradeType) {
            case UpgradeManager.UPGRADE_TYPES.BULLET_COUNT:
                valueText = nextValue ? `${currentValue} → ${nextValue} 发子弹` : `${currentValue} 发子弹 (已满级)`;
                break;
            case UpgradeManager.UPGRADE_TYPES.BULLET_SPREAD:
                valueText = nextValue ? `${currentValue} → ${nextValue} 个方向` : `${currentValue} 个方向 (已满级)`;
                break;
            case UpgradeManager.UPGRADE_TYPES.HP_BOOST:
                valueText = nextValue ? `${currentValue} → ${nextValue} 生命值` : `${currentValue} 生命值 (已满级)`;
                break;
            case UpgradeManager.UPGRADE_TYPES.SPEED_BOOST:
                valueText = nextValue ? `${currentValue} → ${nextValue} 速度` : `${currentValue} 速度 (已满级)`;
                break;
            // 新增技能信息文本
            case UpgradeManager.UPGRADE_TYPES.FIRE_SHIELD:
                if (currentLevel === 0) {
                    valueText = '激活火焰护体';
                } else {
                    valueText = nextValue ? `等级 ${currentLevel} → ${nextValue}` : `等级 ${currentLevel} (已满级)`;
                }
                break;
            case UpgradeManager.UPGRADE_TYPES.DASH_ATTACK:
                if (currentLevel === 0) {
                    valueText = '获得瞬移突进技能';
                } else {
                    valueText = nextValue ? `等级 ${currentLevel} → ${nextValue}` : `等级 ${currentLevel} (已满级)`;
                }
                break;
            case UpgradeManager.UPGRADE_TYPES.BULLET_PIERCE:
                valueText = nextValue ? `穿透 ${currentValue} → ${nextValue} 次` : `穿透 ${currentValue} 次 (已满级)`;
                break;
            case UpgradeManager.UPGRADE_TYPES.SUMMON_CLONE:
                valueText = nextValue ? `${currentValue} → ${nextValue} 个分身` : `${currentValue} 个分身 (已满级)`;
                break;
            case UpgradeManager.UPGRADE_TYPES.BULLET_BOUNCE:
                valueText = nextValue ? `反弹 ${currentValue} → ${nextValue} 次` : `反弹 ${currentValue} 次 (已满级)`;
                break;
            case UpgradeManager.UPGRADE_TYPES.LIFE_STEAL:
                valueText = nextValue ? `${currentValue}% → ${nextValue}% 几率` : `${currentValue}% 几率 (已满级)`;
                break;
            case UpgradeManager.UPGRADE_TYPES.ATTACK_SPEED:
                const currentInterval = currentValue / 1000;
                const nextInterval = nextValue ? nextValue / 1000 : null;
                valueText = nextValue ? `${currentInterval.toFixed(1)}s → ${nextInterval.toFixed(1)}s 间隔` : `${currentInterval.toFixed(1)}s 间隔 (已满级)`;
                break;
            case UpgradeManager.UPGRADE_TYPES.EXPLOSIVE_SHOT:
                if (currentLevel === 0) {
                    valueText = '激活爆炸冲击';
                } else {
                    valueText = nextValue ? `等级 ${currentLevel} → ${nextValue}` : `等级 ${currentLevel} (已满级)`;
                }
                break;
        }

        return {
            name: upgradeData.name,
            description: upgradeData.description,
            icon: upgradeData.icon,
            valueText: valueText,
            level: currentLevel,
            maxLevel: upgradeData.maxLevel
        };
    }

    // 重置所有升级
    reset() {
        Object.keys(this.upgrades).forEach(type => {
            this.upgrades[type] = 0;
        });
        this.upgradeCount = 0;
        this.nextUpgradeThreshold = this.baseUpgradeInterval;
    }
} 
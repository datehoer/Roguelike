export default class UpgradeManager {
    static UPGRADE_TYPES = {
        BULLET_COUNT: 'bulletCount',
        BULLET_SPREAD: 'bulletSpread', 
        HP_BOOST: 'hpBoost',
        SPEED_BOOST: 'speedBoost'
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
        }
    };

    constructor() {
        this.upgrades = {
            [UpgradeManager.UPGRADE_TYPES.BULLET_COUNT]: 0,
            [UpgradeManager.UPGRADE_TYPES.BULLET_SPREAD]: 0,
            [UpgradeManager.UPGRADE_TYPES.HP_BOOST]: 0,
            [UpgradeManager.UPGRADE_TYPES.SPEED_BOOST]: 0
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
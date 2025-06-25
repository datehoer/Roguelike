// src/scenes/UIScene.js
export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UI');
    }

    create() {
        // 分数
        this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '24px', fill: '#fff' });

        // HP
        this.hpText = this.add.text(this.scale.width - 10, 10, 'HP: 3/3', { fontSize: '24px', fill: '#ff0000' });
        this.hpText.setOrigin(1, 0);

        // 难度等级显示
        this.difficultyText = this.add.text(10, 40, 'Difficulty: 1', { fontSize: '18px', fill: '#00ff00' });

        // 敌人数量显示
        this.enemyCountText = this.add.text(10, 65, 'Enemies: 3', { fontSize: '16px', fill: '#ffff00' });

        // 升级信息显示
        this.upgradeInfoText = this.add.text(10, 90, '', { fontSize: '14px', fill: '#88ff88' });

        // 下次升级提示
        this.nextUpgradeText = this.add.text(10, 110, '', { fontSize: '12px', fill: '#cccccc' });

        // 从主游戏场景获取事件
        const gameScene = this.scene.get('Game');

        // 存储当前最大HP用于显示
        this.currentMaxHp = 3;

        gameScene.events.on('updateScore', (score) => {
            // 添加null检查，防止场景停止后仍然接收事件
            if (!this.scene.isActive() || !this.scoreText || !this.scoreText.active) {
                return;
            }
            
            this.scoreText.setText(`Score: ${score}`);
            
            // 更新难度等级显示
            const difficultyLevel = this.getDifficultyLevel(score);
            if (this.difficultyText && this.difficultyText.active) {
                this.difficultyText.setText(`Difficulty: ${difficultyLevel}`);
            }
            
            // 更新敌人数量显示
            const expectedEnemies = this.calculateEnemyCountForScore(score);
            if (this.enemyCountText && this.enemyCountText.active) {
                this.enemyCountText.setText(`Enemies: ${expectedEnemies}`);
            }

            // 更新下次升级信息
            this.updateNextUpgradeInfo(score);
        });

        gameScene.events.on('updateHP', (hp, maxHp) => {
            // 添加null检查，防止场景停止后仍然接收事件
            if (!this.scene.isActive() || !this.hpText || !this.hpText.active) {
                return;
            }
            
            // 如果传入了maxHp参数，更新存储的最大HP
            if (maxHp !== undefined) {
                this.currentMaxHp = maxHp;
            }
            
            this.hpText.setText(`HP: ${hp}/${this.currentMaxHp}`);
        });

        // 监听升级事件以更新UI显示
        gameScene.events.on('upgradeApplied', (upgradeInfo) => {
            if (!this.scene.isActive() || !this.upgradeInfoText || !this.upgradeInfoText.active) {
                return;
            }
            
            this.showUpgradeNotification(upgradeInfo);
        });

        // 游戏结束事件 - 仅启动GameOverScene，让GameOverScene负责停止UI场景
        gameScene.events.on('gameOver', (finalScore) => {
            this.scene.start('GameOver', { score: finalScore });
        });
    }

    // 更新下次升级信息
    updateNextUpgradeInfo(currentScore) {
        const gameScene = this.scene.get('Game');
        if (gameScene && gameScene.upgradeManager) {
            const upgradeProgress = gameScene.upgradeManager.getUpgradeProgress(currentScore);
            
            if (upgradeProgress.ready) {
                this.nextUpgradeText.setText('升级可用！');
            } else if (upgradeProgress.pointsNeeded !== undefined) {
                this.nextUpgradeText.setText(`下次升级: ${upgradeProgress.pointsNeeded} 分`);
            } else {
                // 备用显示
                const nextThreshold = gameScene.upgradeManager.getNextUpgradeThreshold();
                const pointsNeeded = nextThreshold - currentScore;
                this.nextUpgradeText.setText(`下次升级: ${pointsNeeded} 分`);
            }
        } else {
            // 如果升级管理器不可用，使用原来的固定阈值显示
            const upgradeThresholds = [100, 250, 450, 700, 1000, 1400, 1850, 2350, 2900, 3500];
            const nextThreshold = upgradeThresholds.find(threshold => threshold > currentScore);
            
            if (nextThreshold) {
                const pointsNeeded = nextThreshold - currentScore;
                this.nextUpgradeText.setText(`下次升级: ${pointsNeeded} 分`);
            } else {
                this.nextUpgradeText.setText('所有升级已解锁');
            }
        }
    }

    // 显示升级通知
    showUpgradeNotification(upgradeInfo) {
        this.upgradeInfoText.setText(`获得升级: ${upgradeInfo.name}`);
        
        // 3秒后清除升级信息
        this.time.delayedCall(3000, () => {
            if (this.upgradeInfoText && this.upgradeInfoText.active) {
                this.upgradeInfoText.setText('');
            }
        });
    }

    // 获取当前难度等级 (与GameScene保持一致)
    getDifficultyLevel(score) {
        if (score >= 1600) return 7;
        if (score >= 800) return 6;
        if (score >= 400) return 5;
        if (score >= 200) return 4;
        if (score >= 100) return 3;
        if (score >= 50) return 2;
        return 1;
    }

    // 计算敌人数量 (与GameScene保持一致)
    calculateEnemyCountForScore(score) {
        let enemyCount = 3; // 基础敌人数量
        
        if (score >= 50) enemyCount += 2;    // 50分: 5个敌人
        if (score >= 100) enemyCount += 2;   // 100分: 7个敌人
        if (score >= 200) enemyCount += 3;   // 200分: 10个敌人
        if (score >= 400) enemyCount += 3;   // 400分: 13个敌人
        if (score >= 800) enemyCount += 4;   // 800分: 17个敌人
        if (score >= 1600) enemyCount += 3;  // 1600分: 20个敌人
        
        return Math.min(enemyCount, 20); // 最大敌人数量
    }

    // 清理方法，在场景停止时调用
    shutdown() {
        // 移除所有事件监听器，防止内存泄漏
        const gameScene = this.scene.get('Game');
        if (gameScene) {
            gameScene.events.off('updateScore');
            gameScene.events.off('updateHP');
            gameScene.events.off('upgradeApplied');
            gameScene.events.off('gameOver');
        }
    }
}
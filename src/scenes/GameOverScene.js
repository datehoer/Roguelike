import ScoreManager from '../utils/ScoreManager.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.isNewRecord = ScoreManager.isNewRecord(this.finalScore);
        this.playerRank = ScoreManager.getPlayerRank(this.finalScore);
        
        // 立即停止UI场景，确保不会遮盖游戏结束界面
        this.scene.stop('UI');
    }

    create() {
        const { width, height } = this.scale;
        
        // 半透明背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        
        // 游戏结束标题
        const gameOverText = this.add.text(width / 2, height * 0.2, 'GAME OVER', {
            fontSize: '48px',
            fill: '#ff6b6b',
            fontFamily: 'Arial Black',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // 标题动画
        this.tweens.add({
            targets: gameOverText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            ease: 'Back.easeOut',
            yoyo: true,
            repeat: 1
        });

        // 显示最终分数
        const scoreText = this.add.text(width / 2, height * 0.35, `最终分数: ${this.finalScore}`, {
            fontSize: '32px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 新记录提示
        if (this.isNewRecord && this.finalScore > 0) {
            const newRecordText = this.add.text(width / 2, height * 0.28, '🏆 新记录! 🏆', {
                fontSize: '24px',
                fill: '#ffd700',
                fontFamily: 'Arial Bold'
            }).setOrigin(0.5);

            // 新记录动画
            this.tweens.add({
                targets: newRecordText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 1000,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });

            // 创建庆祝粒子效果
            this.createCelebrationEffect();
        } else if (this.playerRank <= 10 && this.finalScore > 0) {
            this.add.text(width / 2, height * 0.28, `进入前10名! 排名第${this.playerRank}位`, {
                fontSize: '20px',
                fill: '#4ecdc4',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
        }

        // 输入提示
        this.add.text(width / 2, height * 0.45, '输入你的名字保存分数:', {
            fontSize: '20px',
            fill: '#eee',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 输入框背景
        const inputBg = this.add.rectangle(width / 2, height * 0.55, 300, 50, 0x333333)
            .setStrokeStyle(2, 0x666666);

        // 创建HTML输入框
        this.createPlayerNameInput();

        // 保存按钮
        const saveButton = this.add.rectangle(width / 2 - 80, height * 0.7, 120, 50, 0x4ecdc4)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                saveButton.setFillStyle(0x26d0ce);
                this.tweens.add({
                    targets: saveButton,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                saveButton.setFillStyle(0x4ecdc4);
                this.tweens.add({
                    targets: saveButton,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.saveScore());

        this.add.text(width / 2 - 80, height * 0.7, '保存分数', {
            fontSize: '18px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 重新开始按钮
        const restartButton = this.add.rectangle(width / 2 + 80, height * 0.7, 120, 50, 0x16537e)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                restartButton.setFillStyle(0x1e90ff);
                this.tweens.add({
                    targets: restartButton,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                restartButton.setFillStyle(0x16537e);
                this.tweens.add({
                    targets: restartButton,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.restartGame());

        this.add.text(width / 2 + 80, height * 0.7, '重新开始', {
            fontSize: '18px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 返回主菜单按钮
        const menuButton = this.add.rectangle(width / 2, height * 0.85, 200, 50, 0x0f3460)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                menuButton.setFillStyle(0x16537e);
                this.tweens.add({
                    targets: menuButton,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                menuButton.setFillStyle(0x0f3460);
                this.tweens.add({
                    targets: menuButton,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.goToMenu());

        this.add.text(width / 2, height * 0.85, '返回主菜单', {
            fontSize: '18px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }

    createCelebrationEffect() {
        const { width, height } = this.scale;
        
        // 创建庆祝粒子
        for (let i = 0; i < 30; i++) {
            const x = Phaser.Math.Between(width * 0.2, width * 0.8);
            const y = Phaser.Math.Between(height * 0.1, height * 0.4);
            const color = Phaser.Math.RND.pick([0xffd700, 0xffa500, 0xff6b6b, 0x4ecdc4]);
            
            const particle = this.add.circle(x, y, Phaser.Math.Between(3, 8), color);
            
            this.tweens.add({
                targets: particle,
                y: y + Phaser.Math.Between(50, 150),
                x: x + Phaser.Math.Between(-50, 50),
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: Phaser.Math.Between(1000, 2000),
                ease: 'Quad.easeOut',
                delay: Phaser.Math.Between(0, 1000),
                onComplete: () => particle.destroy()
            });
        }
    }

    createPlayerNameInput() {
        try {
            // 先清理任何现有的输入框
            this.cleanupInput();
            
            const gameCanvas = document.querySelector('canvas');
            if (!gameCanvas) {
                console.error('Canvas element not found');
                return;
            }
            
            const canvasRect = gameCanvas.getBoundingClientRect();
            
            this.nameInput = document.createElement('input');
            this.nameInput.type = 'text';
            this.nameInput.placeholder = '输入你的名字...';
            this.nameInput.maxLength = 15;
            this.nameInput.style.position = 'absolute';
            this.nameInput.style.left = (canvasRect.left + this.scale.width / 2 - 150) + 'px';
            this.nameInput.style.top = (canvasRect.top + this.scale.height * 0.55 - 25) + 'px';
            this.nameInput.style.width = '300px';
            this.nameInput.style.height = '50px';
            this.nameInput.style.fontSize = '18px';
            this.nameInput.style.textAlign = 'center';
            this.nameInput.style.border = '2px solid #666666';
            this.nameInput.style.backgroundColor = '#333333';
            this.nameInput.style.color = '#fff';
            this.nameInput.style.borderRadius = '5px';
            this.nameInput.style.outline = 'none';
            this.nameInput.style.zIndex = '1000';
            this.nameInput.style.fontFamily = 'Arial, sans-serif';
            
            document.body.appendChild(this.nameInput);
            
            // 设置焦点，但添加延迟确保元素已完全添加到DOM
            setTimeout(() => {
                if (this.nameInput && this.nameInput.parentNode) {
                    this.nameInput.focus();
                }
            }, 100);

            // 存储事件处理器引用以便后续清理
            this.keydownHandler = (e) => {
                if (e.key === 'Enter') {
                    this.saveScore();
                }
            };
            
            // 监听回车键
            this.nameInput.addEventListener('keydown', this.keydownHandler);
            
            console.log('Name input created successfully');
        } catch (error) {
            console.error('Error creating name input:', error);
            // 如果创建输入框失败，nameInput将保持为null，saveScore方法会使用默认名称
        }
    }

    saveScore() {
        // 确保nameInput存在，如果不存在则使用默认值
        let playerName = '匿名玩家';
        if (this.nameInput && this.nameInput.value !== undefined) {
            playerName = this.nameInput.value.trim() || '匿名玩家';
        }
        
        try {
            ScoreManager.saveScore(playerName, this.finalScore);
            
            // 显示保存成功提示
            const savedText = this.add.text(this.scale.width / 2, this.scale.height * 0.6, '分数已保存!', {
                fontSize: '20px',
                fill: '#4ecdc4',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            // 成功提示动画
            this.tweens.add({
                targets: savedText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 200,
                ease: 'Back.easeOut',
                yoyo: true
            });

            // 清理输入框
            this.cleanupInput();

            // 1.5秒后自动跳转到主菜单
            this.time.delayedCall(1500, () => {
                this.goToMenu();
            });

        } catch (error) {
            console.error('保存分数时出错:', error);
            
            // 显示错误提示
            const errorText = this.add.text(this.scale.width / 2, this.scale.height * 0.6, '保存失败，请重试', {
                fontSize: '20px',
                fill: '#ff6b6b',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            
            // 3秒后移除错误提示
            this.time.delayedCall(3000, () => {
                if (errorText && errorText.active) {
                    errorText.destroy();
                }
            });
            
            return; // 保存失败时不清理输入框，让用户可以重试
        }
    }

    restartGame() {
        this.cleanupInput();
        // 停止所有游戏相关场景，然后重新开始
        this.scene.stop('Game');
        this.scene.stop('UI');
        this.scene.start('Preloader');
    }

    goToMenu() {
        this.cleanupInput();
        // 停止所有可能在运行的游戏相关场景
        this.scene.stop('Game');
        this.scene.stop('UI');
        this.scene.start('Menu');
    }

    cleanupInput() {
        try {
            if (this.nameInput) {
                // 移除事件监听器
                this.nameInput.removeEventListener('keydown', this.keydownHandler);
                
                // 从DOM中移除元素
                if (this.nameInput.parentNode) {
                    this.nameInput.parentNode.removeChild(this.nameInput);
                }
                
                this.nameInput = null;
                console.log('Name input cleaned up successfully');
            }
        } catch (error) {
            console.error('Error cleaning up input:', error);
            // 强制设置为null，即使清理失败
            this.nameInput = null;
        }
    }

    destroy() {
        this.cleanupInput();
        super.destroy();
    }
}
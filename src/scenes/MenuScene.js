export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    init() {
        // 确保在进入主菜单时停止所有可能残留的游戏场景
        this.scene.stop('Game');
        this.scene.stop('UI');
        this.scene.stop('GameOver');
        this.scene.stop('Leaderboard');
    }

    create() {
        const { width, height } = this.scale;
        
        // 背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        
        // 添加一些背景装饰
        this.createBackgroundEffects();
        
        // 游戏标题
        const mainTitle = this.add.text(width / 2, height * 0.2, 'ROGUELIKE', {
            fontSize: '64px',
            fill: '#eee',
            fontFamily: 'Arial Black',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const subTitle = this.add.text(width / 2, height * 0.3, 'ADVENTURE', {
            fontSize: '32px',
            fill: '#16537e',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 标题动画
        this.tweens.add({
            targets: mainTitle,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // 开始游戏按钮
        const startButton = this.add.rectangle(width / 2, height * 0.5, 200, 60, 0x16537e)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                startButton.setFillStyle(0x1e90ff);
                this.tweens.add({
                    targets: startButton,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                startButton.setFillStyle(0x16537e);
                this.tweens.add({
                    targets: startButton,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.startGame());

        this.add.text(width / 2, height * 0.5, '开始游戏', {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 排行榜按钮
        const leaderboardButton = this.add.rectangle(width / 2, height * 0.65, 200, 60, 0x0f3460)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                leaderboardButton.setFillStyle(0x16537e);
                this.tweens.add({
                    targets: leaderboardButton,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                leaderboardButton.setFillStyle(0x0f3460);
                this.tweens.add({
                    targets: leaderboardButton,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.showLeaderboard());

        this.add.text(width / 2, height * 0.65, '排行榜', {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 操作说明
        this.add.text(width / 2, height * 0.85, '使用方向键或WASD移动，鼠标点击射击', {
            fontSize: '16px',
            fill: '#aaa',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 版本信息
        this.add.text(width - 10, height - 10, 'v1.0', {
            fontSize: '12px',
            fill: '#666',
            fontFamily: 'Arial'
        }).setOrigin(1, 1);
    }

    createBackgroundEffects() {
        const { width, height } = this.scale;
        
        // 创建一些背景粒子效果
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const size = Phaser.Math.Between(2, 6);
            
            const particle = this.add.circle(x, y, size, 0x16537e, 0.3);
            
            // 粒子动画
            this.tweens.add({
                targets: particle,
                alpha: 0.8,
                duration: Phaser.Math.Between(2000, 4000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
            
            this.tweens.add({
                targets: particle,
                y: y + Phaser.Math.Between(-50, 50),
                duration: Phaser.Math.Between(3000, 6000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 3000)
            });
        }
    }

    startGame() {
        this.scene.start('Preloader');
    }

    showLeaderboard() {
        this.scene.start('Leaderboard');
    }
} 
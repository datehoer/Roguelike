export default class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    init(data) {
        this.gameScene = data.gameScene;
    }

    create() {
        const { width, height } = this.scale;
        
        // 半透明背景遮罩
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        
        // 暂停标题
        const pauseTitle = this.add.text(width / 2, height * 0.3, '游戏暂停', {
            fontSize: '48px',
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // 添加标题动画
        this.tweens.add({
            targets: pauseTitle,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // 继续游戏按钮
        const continueButton = this.add.rectangle(width / 2, height * 0.5, 220, 60, 0x16537e)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                continueButton.setFillStyle(0x1e90ff);
                this.tweens.add({
                    targets: continueButton,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                continueButton.setFillStyle(0x16537e);
                this.tweens.add({
                    targets: continueButton,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.resumeGame());

        this.add.text(width / 2, height * 0.5, '继续游戏', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 重新开始按钮
        const restartButton = this.add.rectangle(width / 2, height * 0.62, 220, 60, 0x0f3460)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                restartButton.setFillStyle(0x16537e);
                this.tweens.add({
                    targets: restartButton,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                restartButton.setFillStyle(0x0f3460);
                this.tweens.add({
                    targets: restartButton,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.restartGame());

        this.add.text(width / 2, height * 0.62, '重新开始', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 返回主菜单按钮
        const menuButton = this.add.rectangle(width / 2, height * 0.74, 220, 60, 0x8b0000)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                menuButton.setFillStyle(0xff0000);
                this.tweens.add({
                    targets: menuButton,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                menuButton.setFillStyle(0x8b0000);
                this.tweens.add({
                    targets: menuButton,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => this.returnToMenu());

        this.add.text(width / 2, height * 0.74, '返回主菜单', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 操作提示
        this.add.text(width / 2, height * 0.88, '按 ESC 键继续游戏', {
            fontSize: '16px',
            fill: '#aaaaaa',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 添加ESC键监听
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => this.resumeGame());
    }

    resumeGame() {
        // 恢复游戏场景
        this.scene.resume('Game');
        
        // 关闭暂停场景
        this.scene.stop();
    }

    restartGame() {
        // 停止当前游戏场景
        this.scene.stop('Game');
        this.scene.stop('UI');
        this.scene.stop();
        
        // 重新启动游戏
        this.scene.start('Game');
        this.scene.launch('UI');
    }

    returnToMenu() {
        // 停止所有游戏相关场景
        this.scene.stop('Game');
        this.scene.stop('UI');
        this.scene.stop();
        
        // 返回主菜单
        this.scene.start('Menu');
    }
} 
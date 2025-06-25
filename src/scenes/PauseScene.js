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

        // 继续游戏按钮 - 左上
        const continueButton = this.add.rectangle(width * 0.35, height * 0.55, 200, 60, 0x16537e)
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

        this.add.text(width * 0.35, height * 0.55, '继续游戏', {
            fontSize: '22px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 重新开始按钮 - 右上
        const restartButton = this.add.rectangle(width * 0.65, height * 0.55, 200, 60, 0x0f3460)
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

        this.add.text(width * 0.65, height * 0.55, '重新开始', {
            fontSize: '22px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 调试信息开关按钮 - 左下
        const debugButton = this.add.rectangle(width * 0.35, height * 0.7, 200, 60, 0x4b5320)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                debugButton.setFillStyle(0x6b8e23);
                this.tweens.add({ targets: debugButton, scaleX: 1.1, scaleY: 1.1, duration: 100 });
            })
            .on('pointerout', () => {
                debugButton.setFillStyle(0x4b5320);
                this.tweens.add({ targets: debugButton, scaleX: 1, scaleY: 1, duration: 100 });
            })
            .on('pointerdown', () => {
                this.toggleDebug(debugButtonText);
            });

        const debugButtonText = this.add.text(width * 0.35, height * 0.7, this.gameScene.debugEnabled ? '隐藏调试信息' : '显示调试信息', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 返回主菜单按钮 - 右下
        const menuButton = this.add.rectangle(width * 0.65, height * 0.7, 200, 60, 0x8b0000)
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

        this.add.text(width * 0.65, height * 0.7, '返回主菜单', {
            fontSize: '22px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 操作提示
        this.add.text(width / 2, height * 0.85, '按 ESC 键继续游戏', {
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

    // 调试信息开关方法
    toggleDebug(labelText) {
        if (this.gameScene && this.gameScene.toggleDebug) {
            this.gameScene.toggleDebug();
            // 更新按钮文字
            labelText.setText(this.gameScene.debugEnabled ? '隐藏调试信息' : '显示调试信息');
        }
    }
} 
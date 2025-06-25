export default class UpgradeScene extends Phaser.Scene {
    constructor() {
        super('UpgradeScene');
    }

    init(data) {
        this.upgradeOptions = data.upgradeOptions;
        this.upgradeManager = data.upgradeManager;
        this.gameScene = data.gameScene;
        this.isUpgradeSelected = false; // 防止重复选择
    }

    create() {
        // 半透明黑色背景覆盖整个屏幕
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);

        // 标题
        this.add.text(400, 150, '选择升级', {
            fontSize: '36px',
            fill: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 如果没有可升级选项
        if (!this.upgradeOptions || this.upgradeOptions.length === 0) {
            this.add.text(400, 300, '所有升级已达到最高级！', {
                fontSize: '24px',
                fill: '#ffffff'
            }).setOrigin(0.5);

            this.add.text(400, 350, '点击继续游戏', {
                fontSize: '18px',
                fill: '#cccccc'
            }).setOrigin(0.5);

            this.input.once('pointerdown', () => {
                this.resumeGame();
            });
            return;
        }

        // 创建升级选项按钮
        this.createUpgradeButtons();

        // 添加说明文字
        this.add.text(400, 500, '点击选择你想要的升级', {
            fontSize: '18px',
            fill: '#cccccc'
        }).setOrigin(0.5);
    }

    createUpgradeButtons() {
        const buttonWidth = 200;
        const buttonHeight = 120;
        const spacing = 50;
        const startX = 400 - ((this.upgradeOptions.length - 1) * (buttonWidth + spacing)) / 2;

        this.upgradeButtons = []; // 存储按钮引用以便禁用

        this.upgradeOptions.forEach((upgradeType, index) => {
            const x = startX + index * (buttonWidth + spacing);
            const y = 320;

            const upgradeInfo = this.upgradeManager.getUpgradeInfo(upgradeType);

            // 创建按钮背景
            const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x333333)
                .setStrokeStyle(3, 0x666666)
                .setInteractive({ useHandCursor: true });

            // 图标
            const icon = this.add.text(x, y - 30, upgradeInfo.icon, {
                fontSize: '32px'
            }).setOrigin(0.5);

            // 升级名称
            const name = this.add.text(x, y - 5, upgradeInfo.name, {
                fontSize: '16px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // 升级效果描述
            const valueText = this.add.text(x, y + 15, upgradeInfo.valueText, {
                fontSize: '12px',
                fill: '#cccccc',
                align: 'center',
                wordWrap: { width: buttonWidth - 20 }
            }).setOrigin(0.5);

            // 等级显示
            const levelText = this.add.text(x, y + 35, `等级 ${upgradeInfo.level}/${upgradeInfo.maxLevel}`, {
                fontSize: '10px',
                fill: '#999999'
            }).setOrigin(0.5);

            // 存储按钮组元素
            const buttonGroup = { button, icon, name, valueText, levelText };
            this.upgradeButtons.push(buttonGroup);

            // 按钮悬停效果
            button.on('pointerover', () => {
                if (this.isUpgradeSelected) return; // 已选择时不响应悬停
                
                button.setFillStyle(0x444444);
                this.tweens.add({
                    targets: [button, icon, name, valueText, levelText],
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            });

            button.on('pointerout', () => {
                if (this.isUpgradeSelected) return; // 已选择时不响应悬停
                
                button.setFillStyle(0x333333);
                this.tweens.add({
                    targets: [button, icon, name, valueText, levelText],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            });

            // 点击事件
            button.on('pointerdown', () => {
                if (this.isUpgradeSelected) return; // 防止重复点击
                
                this.selectUpgrade(upgradeType);
            });
        });
    }

    selectUpgrade(upgradeType) {
        // 防止重复选择
        if (this.isUpgradeSelected) return;
        this.isUpgradeSelected = true;

        // 禁用所有按钮的交互
        this.disableAllButtons();

        // 应用升级
        this.upgradeManager.applyUpgrade(upgradeType);

        // 显示选择效果
        const upgradeInfo = this.upgradeManager.getUpgradeInfo(upgradeType);
        const confirmText = this.add.text(400, 450, `已选择: ${upgradeInfo.name}!`, {
            fontSize: '24px',
            fill: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 闪烁效果
        this.tweens.add({
            targets: confirmText,
            alpha: { from: 1, to: 0.3 },
            duration: 200,
            repeat: 2,
            yoyo: true,
            onComplete: () => {
                // 通知游戏场景应用升级效果
                this.gameScene.applyUpgrade(upgradeType, this.upgradeManager);
                
                // 延迟后恢复游戏
                this.time.delayedCall(500, () => {
                    this.resumeGame();
                });
            }
        });
    }

    // 禁用所有按钮
    disableAllButtons() {
        this.upgradeButtons.forEach(buttonGroup => {
            const { button, icon, name, valueText, levelText } = buttonGroup;
            
            // 移除交互
            button.removeInteractive();
            
            // 设置为灰色表示禁用
            button.setFillStyle(0x222222);
            button.setStrokeStyle(3, 0x444444);
            
            // 降低透明度
            [icon, name, valueText, levelText].forEach(element => {
                element.setAlpha(0.5);
            });
        });
    }

    resumeGame() {
        // 恢复游戏场景
        this.scene.resume('Game');
        this.scene.stop();
    }
} 
// src/scenes/PreloaderScene.js
export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // 创建一个简单的加载条
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            this.startGame();
        });
        
        // --- 加载图片资源 ---
        // 加载哪吒角色图片
        this.load.image('player', 'src/assets/nezha.png');
        
        // --- 动态生成纹理 ---
        // 敌人 (红色方块)
        this.make.graphics({ fillStyle: { color: 0xff0000 } })
            .fillRect(0, 0, 16, 16)
            .generateTexture('enemy', 16, 16);
            
        // 子弹 (黄色小方块)
        this.make.graphics({ fillStyle: { color: 0xffff00 } })
            .fillRect(0, 0, 8, 8)
            .generateTexture('bullet', 8, 8);

        // 墙 (深灰色)
        this.make.graphics({ fillStyle: { color: 0x333333 } })
            .fillRect(0, 0, 32, 32)
            .generateTexture('wall', 32, 32);

        // 地板 (浅灰色)
        this.make.graphics({ fillStyle: { color: 0xcccccc } })
            .fillRect(0, 0, 32, 32)
            .generateTexture('floor', 32, 32);
    }

    startGame() {
        // 确保在启动新游戏前停止所有其他场景
        this.scene.stop('Menu');
        this.scene.stop('GameOver');
        this.scene.stop('Leaderboard');
        this.scene.stop('UI');
        
        this.scene.start('Game');
        this.scene.launch('UI'); // 同时启动UI场景
    }
}
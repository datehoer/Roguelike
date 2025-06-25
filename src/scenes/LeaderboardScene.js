import ScoreManager from '../utils/ScoreManager.js';

export default class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('Leaderboard');
    }

    init() {
        // 确保在进入排行榜时停止所有游戏相关场景
        this.scene.stop('Game');
        this.scene.stop('UI');
        this.scene.stop('GameOver');
    }

    create() {
        const { width, height } = this.scale;
        
        // 背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        
        // 标题
        this.add.text(width / 2, 80, '排行榜', {
            fontSize: '48px',
            fill: '#eee',
            fontFamily: 'Arial Black',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(width / 2, 120, 'TOP 10', {
            fontSize: '24px',
            fill: '#16537e',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 获取并显示排行榜
        const scores = ScoreManager.getTopScores(10);
        this.displayScores(scores);

        // 清空记录按钮
        const clearButton = this.add.rectangle(width / 2 - 100, height - 60, 160, 40, 0xff6b6b)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => clearButton.setFillStyle(0xff5252))
            .on('pointerout', () => clearButton.setFillStyle(0xff6b6b))
            .on('pointerdown', () => this.clearScores());

        this.add.text(width / 2 - 100, height - 60, '清空记录', {
            fontSize: '16px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 返回按钮
        const backButton = this.add.rectangle(width / 2 + 100, height - 60, 160, 40, 0x16537e)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => backButton.setFillStyle(0x1e90ff))
            .on('pointerout', () => backButton.setFillStyle(0x16537e))
            .on('pointerdown', () => this.goBack());

        this.add.text(width / 2 + 100, height - 60, '返回主菜单', {
            fontSize: '16px',
            fill: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }

    displayScores(scores) {
        const { width } = this.scale;
        const startY = 180;
        const lineHeight = 40;

        if (scores.length === 0) {
            this.add.text(width / 2, startY + 100, '暂无记录', {
                fontSize: '24px',
                fill: '#666',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            return;
        }

        // 表头
        this.add.text(width / 2 - 200, startY, '排名', {
            fontSize: '20px',
            fill: '#4ecdc4',
            fontFamily: 'Arial Bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, startY, '玩家名', {
            fontSize: '20px',
            fill: '#4ecdc4',
            fontFamily: 'Arial Bold'
        }).setOrigin(0.5);

        this.add.text(width / 2 + 200, startY, '分数', {
            fontSize: '20px',
            fill: '#4ecdc4',
            fontFamily: 'Arial Bold'
        }).setOrigin(0.5);

        // 分割线
        this.add.line(width / 2, startY + 20, -300, 0, 300, 0, 0x4ecdc4, 2);

        // 显示分数列表
        scores.forEach((score, index) => {
            const y = startY + 40 + (index * lineHeight);
            const rank = index + 1;
            
            // 根据排名设置颜色
            let color = '#fff';
            if (rank === 1) color = '#ffd700'; // 金色
            else if (rank === 2) color = '#c0c0c0'; // 银色
            else if (rank === 3) color = '#cd7f32'; // 铜色

            // 排名
            this.add.text(width / 2 - 200, y, `#${rank}`, {
                fontSize: '18px',
                fill: color,
                fontFamily: 'Arial Bold'
            }).setOrigin(0.5);

            // 玩家名
            this.add.text(width / 2, y, score.name, {
                fontSize: '18px',
                fill: '#eee',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            // 分数
            this.add.text(width / 2 + 200, y, score.score.toString(), {
                fontSize: '18px',
                fill: color,
                fontFamily: 'Arial Bold'
            }).setOrigin(0.5);

            // 日期（小字）
            this.add.text(width / 2 + 300, y, new Date(score.date).toLocaleDateString(), {
                fontSize: '12px',
                fill: '#999',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
        });
    }

    clearScores() {
        // 确认对话框
        const confirmText = this.add.text(this.scale.width / 2, this.scale.height / 2, 
            '确认清空所有记录吗？\n\n点击这里确认', {
            fontSize: '24px',
            fill: '#ff6b6b',
            fontFamily: 'Arial',
            align: 'center',
            backgroundColor: '#000',
            padding: { x: 20, y: 20 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        confirmText.on('pointerdown', () => {
            ScoreManager.clearScores();
            this.scene.restart(); // 重新加载场景
        });

        // 3秒后自动消失
        this.time.delayedCall(3000, () => {
            if (confirmText.active) {
                confirmText.destroy();
            }
        });
    }

    goBack() {
        this.scene.start('Menu');
    }
} 
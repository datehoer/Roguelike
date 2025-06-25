// src/utils/ScoreManager.js
export default class ScoreManager {
    static STORAGE_KEY = 'roguelike_scores';

    // 保存分数
    static saveScore(playerName, score) {
        const scores = this.getScores();
        const newScore = {
            name: playerName,
            score: score,
            date: new Date().toISOString()
        };
        
        scores.push(newScore);
        
        // 按分数排序（降序）
        scores.sort((a, b) => b.score - a.score);
        
        // 只保留前20名（避免数据过多）
        const topScores = scores.slice(0, 20);
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(topScores));
        
        return newScore;
    }

    // 获取所有分数
    static getScores() {
        try {
            const scores = localStorage.getItem(this.STORAGE_KEY);
            return scores ? JSON.parse(scores) : [];
        } catch (error) {
            console.error('Error loading scores:', error);
            return [];
        }
    }

    // 获取前N名分数
    static getTopScores(count = 10) {
        const scores = this.getScores();
        return scores.slice(0, count);
    }

    // 获取最高分
    static getHighScore() {
        const scores = this.getScores();
        return scores.length > 0 ? scores[0].score : 0;
    }

    // 检查是否是新记录
    static isNewRecord(score) {
        const highScore = this.getHighScore();
        return score > highScore;
    }

    // 获取玩家排名（如果分数足够进入排行榜）
    static getPlayerRank(score) {
        const scores = this.getScores();
        const rank = scores.findIndex(s => score > s.score);
        return rank === -1 ? scores.length + 1 : rank + 1;
    }

    // 清空所有分数
    static clearScores() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    // 导出分数数据（用于备份）
    static exportScores() {
        const scores = this.getScores();
        const dataStr = JSON.stringify(scores, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'roguelike_scores.json';
        link.click();
    }

    // 导入分数数据（用于恢复）
    static importScores(jsonData) {
        try {
            const scores = JSON.parse(jsonData);
            if (Array.isArray(scores)) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
                return true;
            }
        } catch (error) {
            console.error('Error importing scores:', error);
        }
        return false;
    }
} 
// src/main.js
import MenuScene from './scenes/MenuScene.js';
import PreloaderScene from './scenes/PreloaderScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';
import UpgradeScene from './scenes/UpgradeScene.js';
import PauseScene from './scenes/PauseScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            // debug: true // 打开这个可以看碰撞体
        }
    },
    scene: [MenuScene, PreloaderScene, GameScene, UIScene, GameOverScene, LeaderboardScene, UpgradeScene, PauseScene]
};

const game = new Phaser.Game(config);
import { Scene } from 'phaser';

export class MainScene extends Scene {
    constructor () {
        super('MainScene');
    }

    preload () {
    }

    create () {
        this.add.text(1920/2, 1080/2, 'Multi Cursor', {
            fontFamily: 'Consolas', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        
    }
}

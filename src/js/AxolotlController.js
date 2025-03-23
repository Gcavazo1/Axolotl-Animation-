import { SpriteManager } from './SpriteManager.js';
import { SpriteRenderer } from './SpriteRenderer.js';

export class AxolotlController {
    constructor(gl, spriteManager) {
        this.gl = gl;
        this.spriteManager = spriteManager;
        
        // Position and size
        this.position = { x: 0, y: 0 };
        this.width = 128;  // Default size
        this.height = 128;
        
        // Screen boundaries
        this.boundaries = {
            left: 0,
            top: 0,
            right: 800,
            bottom: 600
        };
        
        console.log("Axolotl character initialized - keyboard controls disabled");
    }
    
    // Set screen boundaries for the character
    setScreenBoundaries(left, top, right, bottom) {
        this.boundaries = { left, top, right, bottom };
        console.log(`Screen boundaries set: left=${left}, top=${top}, right=${right}, bottom=${bottom}`);
    }
    
    // Update character animation
    update(deltaTime) {
        // Update sprite animation
        if (this.spriteManager) {
            this.spriteManager.update(deltaTime);
        }
    }
} 
export class SpriteManager {
    constructor(gl, texture, frameWidth, frameHeight, columns, rows) {
        this.gl = gl;
        this.texture = texture;
        this.frameWidth = frameWidth || 64;  // Default frame size
        this.frameHeight = frameHeight || 64;
        this.columns = columns || 10;        // Default columns in the sprite sheet
        this.rows = rows || 8;               // Default rows in the sprite sheet
        
        // Animation state
        this.currentAnimation = 'getUp';
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDisplayCount = 0;          // Counter for double framing
        this.framesPerDisplayFrame = 2;      // Display each frame twice (double framing)
        
        // Animation sequence management
        this.sequenceTimer = 0;              // Timer for the overall sequence
        this.currentSequence = 0;            // Current sequence in the 20-second flow
        this.sequenceDuration = 20;          // Total duration in seconds
        
        // Animation definitions for new sprite sheet
        this.sequences = [
            { name: 'getUp', duration: 1, loops: 1 },       // 1 second
            { name: 'run', duration: 3, loops: 3 },         // 3 seconds
            { name: 'sprint', duration: 4, loops: 4 },      // 4 seconds
            { name: 'run', duration: 3, loops: 3 },         // 3 seconds
            { name: 'transition', duration: 1, loops: 1 },  // 1 second
            { name: 'sprintLand', duration: 8, loops: 8 }   // 8 seconds
        ];
        
        // Calculate total sequence duration
        this.totalSequenceDuration = this.sequences.reduce((total, seq) => total + seq.duration, 0);
        
        // Create animations map - these match the sprite sheet rows
        this.animations = {
            // Row 1: Get Up animation (first row of sprite sheet)
            'getUp': {
                frames: Array.from({length: 10}, (_, i) => i),  // 10 frames in row 1
                frameTime: 1000 / 24, // 24fps
                rowIndex: 0
            },
            // Row 2: Run animation
            'run': {
                frames: Array.from({length: 10}, (_, i) => i),  // 10 frames in row 2
                frameTime: 1000 / 24, // 24fps
                rowIndex: 1
            },
            // Row 3: Sprint animation
            'sprint': {
                frames: Array.from({length: 10}, (_, i) => i),  // 10 frames in row 3
                frameTime: 1000 / 24, // 24fps
                rowIndex: 2
            },
            // Row 4: Transition animation
            'transition': {
                frames: Array.from({length: 10}, (_, i) => i),  // 10 frames in row 4
                frameTime: 1000 / 24, // 24fps
                rowIndex: 3
            },
            // Row 5: Sprint on Land animation
            'sprintLand': {
                frames: Array.from({length: 10}, (_, i) => i),  // 10 frames in row 5
                frameTime: 1000 / 24, // 24fps
                rowIndex: 4
            }
        };
        
        // Get texture dimensions
        const textureInfo = this.getTextureInfo();
        console.log(`Sprite sheet dimensions: ${textureInfo.width}x${textureInfo.height}`);
        console.log(`Frames: ${frameWidth}x${frameHeight}, Grid: ${columns}x${rows}`);
    }
    
    // Reset the animation sequence to start from the beginning
    resetSequence() {
        this.sequenceTimer = 0;
        this.currentSequence = 0;
        this.setAnimation(this.sequences[0].name);
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDisplayCount = 0;
        console.log("Animation sequence reset to beginning");
    }
    
    // Set the current animation by name
    setAnimation(name) {
        if (this.animations[name] && this.currentAnimation !== name) {
            this.currentAnimation = name;
            this.currentFrame = 0;
            this.frameTimer = 0;
            this.frameDisplayCount = 0;
            console.log(`Animation changed to: ${name}`);
        }
    }
    
    // Get the current frame time for the active animation
    getFrameTime() {
        return this.animations[this.currentAnimation]?.frameTime || (1000 / 24);
    }
    
    // Get the number of frames in the current animation
    getFrameCount() {
        return this.animations[this.currentAnimation]?.frames.length || 1;
    }
    
    // Set the frame time for all animations
    setFrameTimeForAll(frameTime) {
        for (const animName in this.animations) {
            this.animations[animName].frameTime = frameTime;
        }
        console.log(`Set frame time for all animations to ${frameTime}ms`);
    }
    
    // Update animation based on elapsed time - handles the entire 20-second sequence
    update(deltaTime) {
        // Update sequence timer (in seconds)
        this.sequenceTimer += deltaTime;
        
        // Log animation state for debugging
        if (Math.floor(this.sequenceTimer * 10) % 10 === 0) {
            console.log(`Animation state: t=${this.sequenceTimer.toFixed(1)}s, sequence=${this.currentSequence}, animation=${this.currentAnimation}, frame=${this.currentFrame}`);
        }
        
        // Manage animation sequence transitions
        this.updateSequence();
        
        if (!this.animations[this.currentAnimation]) return;
        
        // Update frame timer
        this.frameTimer += deltaTime * 1000; // Convert to milliseconds
        
        const frameTime = this.animations[this.currentAnimation].frameTime;
        if (this.frameTimer >= frameTime) {
            // Reset frame timer
            this.frameTimer -= frameTime;
            
            // Increment frame display count for double framing
            this.frameDisplayCount++;
            
            // Only move to next frame after displaying current frame twice
            if (this.frameDisplayCount >= this.framesPerDisplayFrame) {
                this.frameDisplayCount = 0;
                
                // Move to next frame
                const frames = this.animations[this.currentAnimation].frames;
                const nextFrameIndex = (this.currentFrame + 1) % frames.length;
                this.currentFrame = nextFrameIndex;
                
                // Log frame change
                if (nextFrameIndex === 0) {
                    console.log(`Animation cycle complete: ${this.currentAnimation}`);
                }
            }
        }
    }
    
    // Handle the sequence transitions
    updateSequence() {
        // Calculate elapsed time for the current sequence
        let elapsed = this.sequenceTimer;
        let sequenceIndex = 0;
        
        // Find current sequence based on elapsed time
        for (let i = 0; i < this.sequences.length; i++) {
            if (elapsed < this.sequences[i].duration) {
                sequenceIndex = i;
                break;
            }
            elapsed -= this.sequences[i].duration;
            sequenceIndex = i + 1;
        }
        
        // Loop back to beginning if we reached the end
        if (sequenceIndex >= this.sequences.length) {
            console.log("Animation sequence complete, restarting");
            this.sequenceTimer = 0;
            sequenceIndex = 0;
            elapsed = 0;
        }
        
        // Change animation if we've moved to a new sequence
        if (sequenceIndex !== this.currentSequence) {
            const oldSequence = this.currentSequence;
            this.currentSequence = sequenceIndex;
            const newAnimation = this.sequences[sequenceIndex].name;
            this.setAnimation(newAnimation);
            console.log(`Sequence changed from ${oldSequence} to ${sequenceIndex}: ${newAnimation} (${sequenceIndex + 1}/${this.sequences.length})`);
        }
    }
    
    // Get UV coordinates for the current frame
    getTextureCoords() {
        if (!this.animations[this.currentAnimation]) {
            console.error(`Animation not found: ${this.currentAnimation}`);
            return {
                u1: 0, v1: 0,
                u2: 1, v2: 0,
                u3: 0, v3: 1,
                u4: 1, v4: 1
            };
        }
        
        // Get current animation data
        const animation = this.animations[this.currentAnimation];
        const frameIndex = animation.frames[this.currentFrame];
        const rowIndex = animation.rowIndex;
        
        // Calculate the row and column in the sprite sheet
        const col = frameIndex % this.columns;
        const row = rowIndex; // Use the row index from the animation definition
        
        // Calculate UV coordinates (normalized 0-1) for this frame
        const u1 = col / this.columns;
        const v1 = row / this.rows;
        const u2 = (col + 1) / this.columns;
        const v2 = (row + 1) / this.rows;
        
        console.log(`Frame ${frameIndex} (col=${col}, row=${row}) - Animation: ${this.currentAnimation}, Sequence: ${this.currentSequence + 1}/${this.sequences.length}`);
        console.log(`UVs: u1=${u1.toFixed(3)}, v1=${v1.toFixed(3)}, u2=${u2.toFixed(3)}, v2=${v2.toFixed(3)}`);
        
        // Format for WebGL (triangle strip: bottom-left, bottom-right, top-left, top-right)
        return {
            u1: u1, v1: v2, // Bottom left
            u2: u2, v2: v2, // Bottom right
            u3: u1, v3: v1, // Top left
            u4: u2, v4: v1  // Top right
        };
    }
    
    // Get the texture for rendering
    getTexture() {
        return this.texture;
    }
    
    // Get texture dimensions
    getTextureInfo() {
        // Try to get texture dimensions
        try {
            const gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            
            // Check if texture exists and is valid
            if (!this.texture) {
                console.error("No texture available");
                return { width: 0, height: 0 };
            }
            
            // We can't directly query texture size, so we need to create a framebuffer
            // and check the framebuffer status
            const tempFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, tempFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
            
            // Check if framebuffer is complete (texture is valid)
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                console.error("Framebuffer not complete, can't get texture dimensions");
                return { width: 640, height: 640 }; // Hardcoded fallback
            }
            
            // Clean up
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteFramebuffer(tempFramebuffer);
            
            return { width: 640, height: 640 }; // Hardcoded for now
        } catch (error) {
            console.error("Error getting texture dimensions:", error);
            return { width: 640, height: 640 }; // Default fallback
        }
    }
    
    // Render scaling factor based on canvas size
    getScaleFactor() {
        const canvas = this.gl.canvas;
        // Scale based on smaller dimension to maintain proportions
        const scaleFactor = Math.min(
            canvas.width / 800,   // Base width reference
            canvas.height / 600   // Base height reference
        );
        
        return 1.0; // Fixed scale factor for debugging
    }
} 
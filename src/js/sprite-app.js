/**
 * Simplified Axolotl Sprite Animation
 * Focuses solely on rendering the sprite animation correctly
 */

export class SpriteAnimation {
    constructor() {
        // Get the canvas and its context
        this.canvas = document.getElementById('sprite-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size - don't modify dimensions as they're set in HTML
        
        // Ensure the canvas is transparent
        this.canvas.style.backgroundColor = 'transparent';
        console.log("Setting sprite canvas to transparent background");
        
        // Animation properties
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.columns = 10;
        this.rows = 10;
        
        // Initial sprite position (start at left side)
        this.spriteX = 50; // Start at left margin
        this.spriteY = this.canvas.height / 2 - this.frameHeight * 0.74; // Center Y
        
        // Movement parameters
        this.startX = 50;  // Starting X position
        this.targetX = this.canvas.width * 0.75; // Target X (3/4 across)
        this.totalDistance = this.targetX - this.startX;
        this.direction = 1; // 1 = right, -1 = left
        this.isFlipped = false; // Track if sprite is flipped
        
        // Default sprite size - scaled up for visibility
        this.defaultSpriteScale = 2.0;
        this.spriteScale = this.defaultSpriteScale;
        this.updateSpriteSize();
        
        // Animation state
        this.currentAnimation = 'getUp';
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDisplayCount = 0;
        this.framesPerDisplayFrame = 2; // Display each frame twice
        
        // Animation sequences (20 seconds total)
        this.sequences = [
            { name: 'getUp', duration: 1, loops: 1 },       // 1 second
            { name: 'run', duration: 6, loops: 6 },         // 6 seconds (combined the two run sequences)
            { name: 'sprint', duration: 4, loops: 4 },      // 4 seconds
            { name: 'transition', duration: 1, loops: 1 },  // 1 second
            { name: 'sprintLand', duration: 8, loops: 8 }   // 8 seconds
        ];
        
        // Sequence timing
        this.sequenceTimer = 0;
        this.currentSequence = 0;
        this.totalSequenceDuration = this.sequences.reduce((total, seq) => total + seq.duration, 0);
        
        // Animation definitions based on the user's description of the sprite sheet:
        // - 10x10 grid, each cell is 64x64 pixels
        // - Each row contains 12 frames followed by 8 empty cells
        // - Each animation spans two rows
        this.animations = {
            // Get Up (Rows 3-4)
            'getUp': {
                frames: Array.from({length: 12}, (_, i) => i),
                frameTime: 1000 / 24,  // 24fps with double framing
                rowIndex: 2  // Row 3 (0-indexed)
            },
            // Run (Rows 5-6)
            'run': {
                frames: Array.from({length: 12}, (_, i) => i),
                frameTime: 1000 / 24,
                rowIndex: 4  // Row 5 (0-indexed)
            },
            // Sprint (Rows 1-2)
            'sprint': {
                frames: Array.from({length: 12}, (_, i) => i),
                frameTime: 1000 / 24,
                rowIndex: 0  // Row 1 (0-indexed)
            },
            // Transition (Rows 7-8)
            'transition': {
                frames: Array.from({length: 12}, (_, i) => i),
                frameTime: 1000 / 24,
                rowIndex: 6  // Row 7 (0-indexed)
            },
            // Sprint on Land (Rows 9-10)
            'sprintLand': {
                frames: Array.from({length: 12}, (_, i) => i),
                frameTime: 1000 / 24,
                rowIndex: 8  // Row 9 (0-indexed)
            }
        };
        
        // Default movement speeds for each animation type
        this.defaultMovementSpeeds = {
            'getUp': 0.08,     // Slower during getting up
            'run': 0.3,        // Slower during normal run
            'sprint': 0.7,     // Fast during sprint
            'transition': -0.13,   // No movement during transition
            'sprintLand': 0.85  // Same speed as sprint for consistency
        };
        
        // Create a copy of default speeds to work with
        this.movementSpeeds = { ...this.defaultMovementSpeeds };
        
        // Speed multiplier - can be adjusted by UI controls
        this.sprintSpeedMultiplier = 1.0;
        
        // Animation active state - don't start automatically
        this.isActive = false;
        
        // Load the sprite sheet
        this.spriteSheet = new Image();
        this.spriteSheet.onload = () => {
            console.log("Sprite sheet loaded successfully:", this.spriteSheet.width, "x", this.spriteSheet.height);
            this.isLoaded = true;
            
            // Draw initial frame but don't start animation yet
            this.render();
        };
        this.spriteSheet.onerror = (error) => {
            console.error("Error loading sprite sheet:", error);
        };
        this.spriteSheet.src = 'src/assets/sprites/axolotl_spritesheet_revised_640x640.png';
        
        console.log("Sprite animation initialized but not started");
    }
    
    // Update sprite size based on scale
    updateSpriteSize() {
        this.spriteDisplayWidth = this.frameWidth * this.spriteScale;
        this.spriteDisplayHeight = this.frameHeight * this.spriteScale;
        this.spriteY = this.canvas.height / 2 - this.spriteDisplayHeight * 0.37; // Adjust Y position
    }
    
    // Set sprite size scale
    setSpriteScale(scale) {
        this.spriteScale = parseFloat(scale);
        this.updateSpriteSize();
    }
    
    // Set sprint speed multiplier
    setSprintSpeedMultiplier(multiplier) {
        this.sprintSpeedMultiplier = parseFloat(multiplier);
        
        // Update movement speeds for sprint-related animations
        this.movementSpeeds.sprint = this.defaultMovementSpeeds.sprint * this.sprintSpeedMultiplier;
        this.movementSpeeds.sprintLand = this.defaultMovementSpeeds.sprintLand * this.sprintSpeedMultiplier;
        
        console.log(`Sprint speed multiplier set to ${this.sprintSpeedMultiplier}, new sprint speed: ${this.movementSpeeds.sprint}`);
    }
    
    // Reset all configurations to defaults
    resetConfig() {
        // Reset sprite scale
        this.spriteScale = this.defaultSpriteScale;
        this.updateSpriteSize();
        
        // Reset speed multiplier
        this.sprintSpeedMultiplier = 1.0;
        this.movementSpeeds = { ...this.defaultMovementSpeeds };
        
        console.log("Sprite configuration reset to defaults");
    }
    
    startAnimation() {
        // Animation timing variables
        this.lastTime = performance.now();
        this.isActive = true;
        
        // Start the animation loop
        this.animate();
        console.log("Sprite animation started");
    }
    
    animate() {
        if (!this.isActive) return;
        
        // Calculate time delta
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        // Update animation
        this.update(deltaTime);
        
        // Render current frame
        this.render();
        
        // Request next frame
        requestAnimationFrame(() => this.animate());
    }
    
    update(deltaTime) {
        if (!this.isLoaded) return;
        
        // Update sequence timer
        this.sequenceTimer += deltaTime;
        
        // Update sprite position based on progress through the animation
        this.updatePosition(deltaTime);
        
        // Periodically log animation state for debugging
        if (Math.floor(this.sequenceTimer * 10) % 10 === 0) {
            console.log(`Animation state: t=${this.sequenceTimer.toFixed(1)}s, sequence=${this.currentSequence}, animation=${this.currentAnimation}, frame=${this.currentFrame}`);
        }
        
        // Handle sequence transitions
        this.updateSequence();
        
        // Update frame timer
        this.frameTimer += deltaTime * 1000; // Convert to milliseconds
        
        // Get current animation frame time
        const animation = this.animations[this.currentAnimation];
        if (!animation) return;
        
        // Check if it's time to advance to the next frame
        const frameTime = animation.frameTime;
        if (this.frameTimer >= frameTime) {
            // Reset frame timer
            this.frameTimer -= frameTime;
            
            // Increment frame display count for double framing
            this.frameDisplayCount++;
            
            // Only move to next frame after displaying current frame twice
            if (this.frameDisplayCount >= this.framesPerDisplayFrame) {
                this.frameDisplayCount = 0;
                
                // Move to next frame
                const frames = animation.frames;
                const nextFrameIndex = (this.currentFrame + 1) % frames.length;
                this.currentFrame = nextFrameIndex;
                
                // Log frame change completion
                if (nextFrameIndex === 0) {
                    console.log(`Animation cycle complete: ${this.currentAnimation}`);
                }
                
                // Log when switching to second row
                if (nextFrameIndex === 10) {
                    console.log(`Switching to second row for ${this.currentAnimation}`);
                }
            }
        }
    }
    
    // Update the sprite's horizontal position based on progress through the animation
    updatePosition(deltaTime) {
        // Get movement speed for current animation
        const speed = this.movementSpeeds[this.currentAnimation] || 0.5;
        
        // Handle the sprite land sequence specially
        if (this.currentAnimation === 'sprintLand') {
            const totalSprintLandTime = 8; // Total duration of sprint land (8 seconds)
            const sprintLandElapsed = this.sequenceTimer - (this.totalSequenceDuration - totalSprintLandTime);
            
            // First 4 seconds: move left
            if (sprintLandElapsed <= 4 && !this.isFlipped) {
                this.direction = -1;
                this.isFlipped = true;
                console.log("Flipping sprite to face left");
            } 
            // Last 4 seconds: move right
            else if (sprintLandElapsed > 4 && this.isFlipped) {
                this.direction = 1;
                this.isFlipped = false;
                console.log("Flipping sprite to face right");
            }
        } else {
            // For all other animations, always move right and don't flip
            this.direction = 1;
            this.isFlipped = false;
        }
        
        // Move based on current animation speed and delta time
        const moveAmount = speed * 100 * deltaTime * this.direction;
        
        // Move the sprite, but keep within boundaries
        const newX = this.spriteX + moveAmount;
        
        // Constrain position within canvas bounds
        this.spriteX = Math.max(this.startX, Math.min(newX, this.targetX));
    }
    
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
            this.spriteX = this.startX; // Reset position to start
            sequenceIndex = 0;
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
    
    setAnimation(name) {
        if (this.animations[name] && this.currentAnimation !== name) {
            this.currentAnimation = name;
            this.currentFrame = 0;
            this.frameTimer = 0;
            this.frameDisplayCount = 0;
            console.log(`Animation changed to: ${name}`);
        }
    }
    
    resetAnimation() {
        console.log("Resetting animation sequence");
        this.sequenceTimer = 0;
        this.currentSequence = 0;
        this.spriteX = this.startX; // Reset position to start
        this.setAnimation(this.sequences[0].name);
    }
    
    render() {
        if (!this.isLoaded) return;
        
        // Clear canvas with full transparency instead of a solid color
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get current animation
        const animation = this.animations[this.currentAnimation];
        if (!animation) return;
        
        // Calculate sprite sheet position
        const frameIndex = animation.frames[this.currentFrame];
        const baseRowIndex = animation.rowIndex;
        
        // Making sure we don't try to access empty frames (use first 12 frames in first row, then next row)
        if (frameIndex >= 12) {
            console.error(`Invalid frame index: ${frameIndex}. Only 12 frames per row are available.`);
            return;
        }
        
        const col = frameIndex % this.columns;
        
        // Determine which row of the pair to use
        // Use second row (bottom) of the pair if frame index is 10 or 11
        // This way, frames 0-9 are from top row, frames 10-11 are from bottom row
        const useSecondRow = frameIndex >= 10;
        const row = useSecondRow ? baseRowIndex + 1 : baseRowIndex;
        
        // Calculate actual column for second row (if we're using it)
        // For second row, we want to use columns 0-1 for frames 10-11
        const adjustedCol = useSecondRow ? frameIndex - 10 : col;
        
        const sourceX = adjustedCol * this.frameWidth;
        const sourceY = row * this.frameHeight;
        
        try {
            // Save the current context state
            this.ctx.save();
            
            if (this.isFlipped) {
                // If flipped, translate to sprite position + width then scale by -1 in x direction
                this.ctx.translate(this.spriteX + this.spriteDisplayWidth, 0);
                this.ctx.scale(-1, 1);
                
                // Draw the sprite (with adjusted x position due to flipping)
                this.ctx.drawImage(
                    this.spriteSheet,
                    sourceX, sourceY, this.frameWidth, this.frameHeight,
                    0, this.spriteY, this.spriteDisplayWidth, this.spriteDisplayHeight
                );
            } else {
                // Draw normally
                this.ctx.drawImage(
                    this.spriteSheet,
                    sourceX, sourceY, this.frameWidth, this.frameHeight,
                    this.spriteX, this.spriteY, this.spriteDisplayWidth, this.spriteDisplayHeight
                );
            }
            
            // Restore the context to its original state
            this.ctx.restore();
        } catch (error) {
            console.error("Error drawing sprite:", error);
        }
    }
}

// Start the application when the page loads
window.addEventListener('load', () => {
    new SpriteAnimation();
}); 
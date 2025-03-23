/**
 * Manages the transition between underwater and land shaders
 * and synchronizes the character animation with the water level.
 */
export class TransitionManager {
    constructor(app) {
        this.app = app;
        this.gl = app.gl;
        this.axolotl = app.axolotl;
        
        // Transition state
        this.transitioning = false;
        this.transitionProgress = 0; // 0 to 1
        this.transitionDuration = 10000; // 10 seconds total transition duration
        this.fadeStartTime = 9500; // Start fade at 9.5 seconds
        this.fadeDuration = 500; // 0.5 second fade duration
        this.transitionStartTime = 0;
        
        // Water level parameters
        this.initialWaterLevel = 0.65; // 65% from bottom
        this.targetWaterLevel = 0.2;   // Final water level at 20%
        this.currentWaterLevel = this.initialWaterLevel;
        
        // Opacity for fading
        this.opacity = 1.0;
        
        // Set initial water level
        this.app.setWaterLevel(this.currentWaterLevel);
        
        console.log("TransitionManager initialized");
    }
    
    // Start a transition to a target water level
    transitionToLevel(targetLevel) {
        // Only start transition if we're not already transitioning
        if (!this.transitioning) {
            this.initialWaterLevel = this.currentWaterLevel;
            this.targetWaterLevel = Math.max(0.2, Math.min(0.8, targetLevel)); // Clamp between 0.2 and 0.8
            this.transitionProgress = 0;
            this.opacity = 1.0;
            this.transitionStartTime = performance.now();
            this.transitioning = true;
            
            console.log(`Starting transition from ${this.initialWaterLevel.toFixed(2)} to ${this.targetWaterLevel.toFixed(2)}`);
        } else {
            console.log("Transition already in progress");
        }
    }
    
    // Update transition state
    update(deltaTime) {
        if (!this.transitioning) return;
        
        // Calculate progress
        const currentTime = performance.now();
        const elapsed = currentTime - this.transitionStartTime;
        
        // Calculate main transition progress (0 to 1)
        this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1);
        
        // Calculate fade effect (starts at 95% of the transition)
        if (elapsed >= this.fadeStartTime) {
            // Calculate fade progress (0 to 1)
            const fadeProgress = Math.min((elapsed - this.fadeStartTime) / this.fadeDuration, 1);
            // Apply fade effect
            this.opacity = 1.0 - fadeProgress;
        }
        
        // Update current water level based on progress
        this.currentWaterLevel = this.initialWaterLevel + 
            (this.targetWaterLevel - this.initialWaterLevel) * this.transitionProgress;
        
        // Update water level and opacity in app
        this.app.setWaterLevel(this.currentWaterLevel);
        this.app.setOpacity(this.opacity);
        
        // Check if transition is complete
        if (this.transitionProgress >= 1) {
            this.transitioning = false;
            console.log("Transition complete");
        }
    }
    
    // Get current water level (0-1)
    getWaterLevel() {
        return this.currentWaterLevel;
    }
    
    // Get current opacity (for fading)
    getOpacity() {
        return this.opacity;
    }
    
    // Check if currently transitioning
    isTransitioning() {
        return this.transitioning;
    }
} 
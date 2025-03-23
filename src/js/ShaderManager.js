/**
 * ShaderManager - Handles compiling and transitioning between shaders
 * Syncs with the sprite animation timing for a cohesive 20-second sequence
 */
export class ShaderManager {
    constructor() {
        // Create canvases for both shaders
        this.setupCanvases();
        
        // Initialize timing variables
        this.isPlaying = false;
        this.startTime = 0;
        this.currentTime = 0;
        this.totalDuration = 20; // 20 second sequence to match sprite
        this.transitionStart = 8.75; // Start fading underwater at 9 seconds
        this.transitionDuration = 1.4; // 1 second fade
        
        // Shader programs
        this.landProgram = null;
        this.underwaterProgram = null;
        
        // Track if shaders are compiled
        this.landCompiled = false;
        this.underwaterCompiled = false;
        
        // Default shader parameters
        this.defaultParams = {
            sunRayIntensity: 0.8,
            waveFrequency: 1.0
        };
        
        // Current shader parameters (can be adjusted via UI)
        this.shaderParams = { ...this.defaultParams };
        
        // Create start button
        this.createStartButton();
        
        console.log("ShaderManager initialized");
    }
    
    setupCanvases() {
        // Get the container for positioning
        this.container = document.getElementById('canvas-container');
        if (!this.container) {
            this.container = document.body;
            console.warn("No canvas-container found, using body as container");
        }
        
        // Create canvas for land shader (bottom layer)
        this.landCanvas = document.createElement('canvas');
        this.landCanvas.id = 'land-shader-canvas';
        this.landCanvas.width = 800;
        this.landCanvas.height = 564; // Matching sprite canvas
        this.landCanvas.style.position = 'absolute';
        this.landCanvas.style.zIndex = '1';
        this.container.appendChild(this.landCanvas);
        
        // Create canvas for underwater shader (middle layer)
        this.underwaterCanvas = document.createElement('canvas');
        this.underwaterCanvas.id = 'underwater-shader-canvas';
        this.underwaterCanvas.width = 800;
        this.underwaterCanvas.height = 564;
        this.underwaterCanvas.style.position = 'absolute';
        this.underwaterCanvas.style.zIndex = '2';
        this.container.appendChild(this.underwaterCanvas);
        
        // Get WebGL contexts
        try {
            this.landGL = this.landCanvas.getContext('webgl') || 
                          this.landCanvas.getContext('experimental-webgl');
            this.underwaterGL = this.underwaterCanvas.getContext('webgl') || 
                               this.underwaterCanvas.getContext('experimental-webgl');
                               
            if (!this.landGL || !this.underwaterGL) {
                throw new Error("WebGL not supported");
            }
            
            // Configure WebGL contexts
            this.configureGL(this.landGL);
            this.configureGL(this.underwaterGL);
            
            console.log("Shader canvases created and WebGL contexts initialized");
        } catch (error) {
            console.error("Error initializing WebGL:", error);
            this.showError("WebGL initialization failed: " + error.message);
        }
    }
    
    configureGL(gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    
    createStartButton() {
        // Get the control panel instead of creating a container inside the canvas
        this.buttonContainer = document.getElementById('control-panel');
        if (!this.buttonContainer) {
            console.warn("No control-panel found, button won't be visible");
            return;
        }
        
        // Create the start button
        this.startButton = document.createElement('button');
        this.startButton.textContent = 'Start Animation';
        this.startButton.id = 'start-button';
        
        // Add click handler
        this.startButton.addEventListener('click', () => this.startSequence());
        
        this.buttonContainer.appendChild(this.startButton);
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.padding = '20px';
        errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.fontFamily = 'Arial, sans-serif';
        errorDiv.style.zIndex = '100';
        errorDiv.textContent = message;
        
        this.container.appendChild(errorDiv);
    }
    
    async compileShaders() {
        try {
            console.log("Starting shader compilation...");
            console.log("Loading land shader from: src/shaders/common.vert and src/shaders/land.frag");
            
            // Load and compile land shader
            this.landProgram = await this.createShaderProgram(
                this.landGL,
                'src/shaders/common.vert',
                'src/shaders/land.frag'
            );
            this.landCompiled = true;
            console.log("Land shader compiled successfully");
            
            console.log("Loading underwater shader from: src/shaders/common.vert and src/shaders/underwater.frag");
            // Load and compile underwater shader
            this.underwaterProgram = await this.createShaderProgram(
                this.underwaterGL,
                'src/shaders/common.vert',
                'src/shaders/underwater.frag'
            );
            this.underwaterCompiled = true;
            console.log("Underwater shader compiled successfully");
            
            // Create buffers (fullscreen quad)
            this.landBuffer = this.createBuffer(this.landGL);
            this.underwaterBuffer = this.createBuffer(this.underwaterGL);
            
            console.log("Shaders compiled successfully");
            return true;
        } catch (error) {
            console.error("Error compiling shaders:", error);
            this.showError("Shader compilation failed: " + error.message);
            return false;
        }
    }
    
    async createShaderProgram(gl, vertPath, fragPath) {
        // Fetch shader sources
        const vertSource = await this.fetchShaderSource(vertPath);
        const fragSource = await this.fetchShaderSource(fragPath);
        
        // Create and compile shaders
        const vertShader = this.compileShader(gl, gl.VERTEX_SHADER, vertSource);
        const fragShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragSource);
        
        // Create program and link shaders
        const program = gl.createProgram();
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);
        
        // Check for linking errors
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Shader program linking failed: ${error}`);
        }
        
        // Get attribute and uniform locations
        const programInfo = {
            program: program,
            attribLocations: {
                position: gl.getAttribLocation(program, 'a_position') // common.vert uses 'a_position'
            },
            uniformLocations: {
                time: gl.getUniformLocation(program, 'u_time'),
                resolution: gl.getUniformLocation(program, 'u_resolution'),
                // Add custom parameters
                sunRayIntensity: gl.getUniformLocation(program, 'u_sunRayIntensity'),
                waveFrequency: gl.getUniformLocation(program, 'u_waveFrequency')
            }
        };
        
        return programInfo;
    }
    
    async fetchShaderSource(path) {
        console.log(`Fetching shader source from: ${path}`);
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch shader: ${path} (${response.status}: ${response.statusText})`);
            }
            let source = await response.text();
            
            // Process the shader source for WebGL compatibility
            source = this.processShaderSource(source, path);
            
            console.log(`Successfully loaded shader from ${path}, length: ${source.length} characters`);
            console.log(`Shader preview: ${source.substring(0, 100)}...`);
            return source;
        } catch (error) {
            console.error(`Error fetching shader source from ${path}:`, error);
            throw error;
        }
    }
    
    processShaderSource(source, path) {
        // WebGL 1.0 compatibility fixes
        if (path.endsWith('.frag') || path.endsWith('.vert')) {
            // Remove any version directives (WebGL 1.0 doesn't support them)
            source = source.replace(/#version [0-9]+( es)?/gi, '');
            
            // If no precision is set in fragment shaders, add it
            if (path.endsWith('.frag') && !source.includes('precision')) {
                source = 'precision mediump float;\n' + source;
            }
            
            console.log(`Processed shader for WebGL compatibility: ${path}`);
        }
        
        return source;
    }
    
    compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        // Check for compilation errors
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            console.error(`Shader compilation error (${type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'}):`, error);
            console.error("Problematic shader source:", source);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation error: ${error}`);
        }
        
        console.log(`Successfully compiled ${type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'} shader`);
        return shader;
    }
    
    createBuffer(gl) {
        // Create vertices for a fullscreen quad
        const vertices = new Float32Array([
            -1.0, -1.0,  // bottom left
             1.0, -1.0,  // bottom right
            -1.0,  1.0,  // top left
             1.0,  1.0   // top right
        ]);
        
        // Create buffer and store vertices
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        return buffer;
    }
    
    startSequence() {
        if (this.isPlaying) {
            console.log("Animation already playing");
            return;
        }
        
        // Change button state
        this.startButton.textContent = 'Compiling...';
        this.startButton.disabled = true;
        
        // Compile shaders and start animation
        this.compileShaders().then(success => {
            if (success) {
                // Start the animation
                this.isPlaying = true;
                this.startTime = performance.now() / 1000; // Convert to seconds
                
                // Change button text instead of hiding it
                this.startButton.textContent = 'Reset Animation';
                this.startButton.disabled = false;
                
                // Add new click handler for reset functionality
                this.startButton.removeEventListener('click', () => this.startSequence());
                this.startButton.addEventListener('click', () => this.resetAnimation());
                
                // Start sprite animation directly instead of simulating click
                if (window.spriteAnimation) {
                    window.spriteAnimation.startAnimation();
                    console.log("Started sprite animation");
                }
                
                // Start animation loop
                this.animate();
                console.log("Animation sequence started");
            } else {
                // Reset button if compilation failed
                this.startButton.textContent = 'Try Again';
                this.startButton.disabled = false;
            }
        });
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        // Calculate time since start
        this.currentTime = performance.now() / 1000 - this.startTime;
        
        // Render shaders if compiled successfully
        if (this.landCompiled) {
            this.renderLandShader();
        }
        
        // If water phase, draw underwater layer
        if (this.currentTime < this.transitionStart + this.transitionDuration && this.underwaterCompiled) {
            this.renderUnderwaterShader();
        }
        
        // Loop animation if still playing
        requestAnimationFrame(() => this.animate());
        
        // Optional: End the sequence after completion
        if (this.currentTime > this.totalDuration) {
            // Reset instead of stopping for continuous looping
            console.log("Animation cycle complete, restarting");
            this.startTime = performance.now() / 1000;
        }
    }
    
    renderLandShader() {
        if (!this.landCompiled) {
            console.warn("Land shader not compiled, cannot render");
            return;
        }
        
        try {
            const gl = this.landGL;
            const programInfo = this.landProgram;
            
            // Clear canvas
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            // Use the land shader program
            gl.useProgram(programInfo.program);
            
            // Set uniforms
            gl.uniform1f(programInfo.uniformLocations.time, this.currentTime);
            gl.uniform2f(programInfo.uniformLocations.resolution, 
                this.landCanvas.width, this.landCanvas.height);
            
            // Set custom parameters
            if (programInfo.uniformLocations.sunRayIntensity !== null) {
                gl.uniform1f(programInfo.uniformLocations.sunRayIntensity, this.shaderParams.sunRayIntensity);
            }
            
            // Log uniform values if it's the first render or every 5 seconds
            if (this.currentTime < 0.1 || Math.floor(this.currentTime) % 5 === 0) {
                console.log(`Land shader uniforms: time=${this.currentTime.toFixed(2)}, resolution=${this.landCanvas.width}x${this.landCanvas.height}, sunRays=${this.shaderParams.sunRayIntensity}`);
            }
            
            // Set up position attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, this.landBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.position,
                2,        // 2 components per vertex
                gl.FLOAT, // the data is 32bit floats
                false,    // don't normalize
                0,        // stride (0 = auto)
                0         // offset
            );
            gl.enableVertexAttribArray(programInfo.attribLocations.position);
            
            // Draw the fullscreen quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            // Check for WebGL errors
            const error = gl.getError();
            if (error !== gl.NO_ERROR) {
                console.error(`WebGL error in land shader: ${error}`);
            }
        } catch (error) {
            console.error("Error rendering land shader:", error);
        }
    }
    
    renderUnderwaterShader() {
        if (!this.underwaterCompiled) {
            console.warn("Underwater shader not compiled, skipping render");
            return;
        }
        
        try {
            const gl = this.underwaterGL;
            const programInfo = this.underwaterProgram;
            
            // Calculate opacity based on transition timing
            let opacity = 1.0;
            if (this.currentTime >= this.transitionStart) {
                const transitionProgress = (this.currentTime - this.transitionStart) / this.transitionDuration;
                opacity = Math.max(0, 1.0 - transitionProgress);
            }
            
            // If fully transparent, skip drawing
            if (opacity <= 0.01) return;
            
            // Clear canvas with alpha
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            // Set canvas opacity
            this.underwaterCanvas.style.opacity = opacity;
            
            // Use the underwater shader program
            gl.useProgram(programInfo.program);
            
            // Set uniforms
            gl.uniform1f(programInfo.uniformLocations.time, this.currentTime);
            gl.uniform2f(programInfo.uniformLocations.resolution, 
                this.underwaterCanvas.width, this.underwaterCanvas.height);
                
            // Set custom parameters
            if (programInfo.uniformLocations.waveFrequency !== null) {
                gl.uniform1f(programInfo.uniformLocations.waveFrequency, this.shaderParams.waveFrequency);
            }
            
            // Set up position attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, this.underwaterBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.position,
                2,        // 2 components per vertex
                gl.FLOAT, // the data is 32bit floats
                false,    // don't normalize
                0,        // stride (0 = auto)
                0         // offset
            );
            gl.enableVertexAttribArray(programInfo.attribLocations.position);
            
            // Draw the fullscreen quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            // Check for WebGL errors
            const error = gl.getError();
            if (error !== gl.NO_ERROR) {
                console.error(`WebGL error in underwater shader: ${error}`);
            }
        } catch (error) {
            console.error("Error rendering underwater shader:", error);
        }
    }
    
    resetAnimation() {
        this.startTime = performance.now() / 1000;
        console.log("Animation sequence reset");
        
        // Reset sprite animation if it exists
        if (window.spriteAnimation) {
            window.spriteAnimation.resetAnimation();
            console.log("Sprite animation reset synchronized with shader reset");
        }
    }
    
    // Simplified methods without using 2D context
    
    // Set sun ray intensity (for land shader)
    setSunRayIntensity(intensity) {
        this.shaderParams.sunRayIntensity = parseFloat(intensity);
        console.log(`Sun ray intensity set to ${this.shaderParams.sunRayIntensity}`);
    }
    
    // Set wave frequency (for underwater shader)
    setWaveFrequency(frequency) {
        this.shaderParams.waveFrequency = parseFloat(frequency);
        console.log(`Wave frequency set to ${this.shaderParams.waveFrequency}`);
    }
    
    // Reset shader parameters to defaults
    resetShaderParams() {
        this.shaderParams = { ...this.defaultParams };
        console.log("Shader parameters reset to defaults");
    }
} 
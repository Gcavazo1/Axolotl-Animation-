import { AxolotlController } from './AxolotlController.js';
import { ShaderLoader } from './ShaderLoader.js';
import { TransitionManager } from './TransitionManager.js';
import { SpriteRenderer } from './SpriteRenderer.js';
import { SpriteManager } from './SpriteManager.js';

class WebGLApp {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        
        // Fixed dimensions for windowed mode
        this.CANVAS_WIDTH = 800;
        this.CANVAS_HEIGHT = 600 - 36; // Subtract title bar height
        
        // Try to get WebGL context
        try {
            this.gl = this.canvas.getContext('webgl', {
                antialias: false,
                premultipliedAlpha: false
            });
            
            if (!this.gl) {
                console.error('WebGL not supported - trying experimental-webgl');
                this.gl = this.canvas.getContext('experimental-webgl');
            }
            
            if (!this.gl) {
                alert('Your browser does not support WebGL');
                return;
            }
            
            console.log("WebGL context initialized successfully");
        } catch (e) {
            console.error('WebGL context error:', e);
            alert('WebGL error: ' + e.message);
            return;
        }

        this.lastTime = 0;
        this.time = 0;
        this.waterLevel = 0.65;
        this.opacity = 1.0;
        this.init();
    }

    async init() {
        // Set canvas size - using fixed dimensions
        this.resize();
        
        // Initialize WebGL state
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Create a simple colored rectangle shader for fallback/debugging
        this.createColorShader();
        
        // Initialize shader loader
        this.shaderLoader = new ShaderLoader(this.gl);
        
        // Load shaders
        await Promise.all([
            this.shaderLoader.loadShader('land', 'src/shaders/common.vert', 'src/shaders/land.glsl'),
            this.shaderLoader.loadShader('underwater', 'src/shaders/common.vert', 'src/shaders/underwater.glsl')
        ]);
        
        // Get uniform locations
        this.shaderLoader.getLocations('land', ['a_position'], ['u_time', 'u_resolution']);
        this.shaderLoader.getLocations('underwater', ['a_position'], ['u_time', 'u_resolution']);
        
        // Initialize sprite renderer
        this.spriteRenderer = new SpriteRenderer(this.gl);
        
        try {
            // Try loading both potential sprite sheets
            let spriteTexture = null;
            try {
                // First try with the exact name
                spriteTexture = await this.loadTexture('src/assets/sprites/axolotl_spritesheet_revised_640x640.png');
                console.log("Loaded sprite sheet: axolotl_spritesheet_revised_640x640.png");
            } catch (e) {
                // If that fails, try the alternative name
                console.log("Failed to load primary sprite sheet, trying alternative...");
                spriteTexture = await this.loadTexture('src/assets/sprites/axolotl_spritesheet_revised.png');
                console.log("Loaded sprite sheet: axolotl_spritesheet_revised.png");
            }
            
            // Create a sprite manager with the new sprite sheet
            // Using 12 frames per row, 8 rows in sheet
            // Each frame is 64x64 pixels in a 640x640 sprite sheet
            const spriteManager = new SpriteManager(
                this.gl, 
                spriteTexture,
                64,             // Frame width: 640px / 10 columns = 64px
                64,             // Frame height: 640px / 10 rows = 64px
                10,             // 10 frames per row for proper alignment
                10              // 10 rows in the sprite sheet
            );
            
            // Initialize axolotl character
            this.axolotl = new AxolotlController(
                this.gl,
                spriteManager
            );
            
            // Position axolotl in the center of the canvas
            this.axolotl.position.x = this.canvas.width / 2;
            this.axolotl.position.y = this.canvas.height * 0.6; // Lower on screen for better visibility
            
            // Set the character size larger for better visibility
            this.axolotl.width = 128;  // 2x original size
            this.axolotl.height = 128; // 2x original size
            
            // Set screen boundaries based on our fixed canvas size
            this.axolotl.setScreenBoundaries(0, 0, this.canvas.width, this.canvas.height);
            
            console.log("Sprite character setup completed successfully");
        } catch (error) {
            console.error("Error loading sprite sheet:", error);
            alert("Failed to load sprite sheet. See console for details.");
        }
        
        // Create transition manager
        this.transitionManager = new TransitionManager(this);
        
        // Set up click handler for interaction
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Start animation loop
        this.animate(0);
        
        console.log("Application initialized successfully");
    }

    // Load texture from URL
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            const gl = this.gl;
            const texture = gl.createTexture();
            const image = new Image();
            
            // Set up image load handlers
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                
                // Use nearest filtering for pixelated look
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                
                console.log(`Texture loaded: ${url} (${image.width}x${image.height})`);
                
                // Create a debug display of the loaded texture
                this.debugImage(image, url);
                
                resolve(texture);
            };
            
            image.onerror = () => {
                console.error(`Failed to load image: ${url}`);
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            // Add crossOrigin setting for CORS support
            image.crossOrigin = "anonymous";
            
            // Load the image
            console.log(`Loading image from ${url}`);
            image.src = url;
        });
    }
    
    // Debug function to show loaded images on screen
    debugImage(image, url) {
        console.log("Creating debug display for image:", url);
        
        // Create an element to show the loaded texture for debugging
        const debugDiv = document.createElement('div');
        debugDiv.style.position = 'fixed';
        debugDiv.style.top = '5px'; 
        debugDiv.style.right = '5px';
        debugDiv.style.zIndex = '9999';
        debugDiv.style.background = '#fff';
        debugDiv.style.border = '2px solid red';
        debugDiv.style.padding = '5px';
        
        const label = document.createElement('div');
        label.textContent = `Sprite sheet: ${url.split('/').pop()}`;
        label.style.color = 'black';
        label.style.fontSize = '10px';
        debugDiv.appendChild(label);
        
        // Create a canvas to display the image
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(200, image.width);
        canvas.height = Math.min(200, image.height);
        const ctx = canvas.getContext('2d');
        
        // Draw the image scaled down
        const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        ctx.drawImage(image, 0, 0, w, h);
        
        debugDiv.appendChild(canvas);
        document.body.appendChild(debugDiv);
    }

    resize() {
        // Only resize if dimensions have changed
        if (this.canvas.width !== this.CANVAS_WIDTH || this.canvas.height !== this.CANVAS_HEIGHT) {
            this.canvas.width = this.CANVAS_WIDTH;
            this.canvas.height = this.CANVAS_HEIGHT;
            this.gl.viewport(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
            console.log(`Canvas resized to ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}`);
            
            // Update axolotl position if it exists
            if (this.axolotl) {
                // Position axolotl in the center horizontally, and at 60% of height vertically
                this.axolotl.position.x = this.CANVAS_WIDTH / 2;
                this.axolotl.position.y = this.CANVAS_HEIGHT * 0.6;
                
                // Update screen boundaries
                this.axolotl.setScreenBoundaries(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
            }
        }
    }

    animate(currentTime) {
        // Convert time to seconds
        currentTime *= 0.001;
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.time += deltaTime;
        
        // Debug info every second
        if (Math.floor(this.time) > Math.floor(this.time - deltaTime)) {
            this.debugState();
        }
        
        // Update transition manager
        this.transitionManager.update(deltaTime);
        
        // Update axolotl character if it exists
        if (this.axolotl) {
            this.axolotl.update(deltaTime);
        }
        
        // Render scene
        this.render();

        // Request next frame
        requestAnimationFrame((time) => this.animate(time));
    }

    render() {
        const gl = this.gl;
        
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        try {
            // Set resolution uniforms for both shaders
            const width = gl.canvas.width;
            const height = gl.canvas.height;
            
            // Draw the land shader (background)
            this.shaderLoader.useShader('land');
            this.shaderLoader.setUniform('land', 'u_time', '1f', this.time);
            this.shaderLoader.setUniform('land', 'u_resolution', '2f', width, height);
            this.shaderLoader.drawShader('land');
            
            // Draw the underwater shader with proper opacity
            if (this.opacity > 0.01) {
                // Set blend mode for transparency
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                
                this.shaderLoader.useShader('underwater');
                this.shaderLoader.setUniform('underwater', 'u_time', '1f', this.time);
                this.shaderLoader.setUniform('underwater', 'u_resolution', '2f', width, height);
                // Set water level if shader has this uniform
                try {
                    this.shaderLoader.setUniform('underwater', 'u_waterLevel', '1f', this.waterLevel);
                } catch (e) {
                    // Ignore if uniform doesn't exist
                }
                this.shaderLoader.drawShader('underwater');
            }
            
            // Draw a colored square for debugging in the center of the screen
            if (this.colorProgram) {
                // Reset blend mode
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                
                // Draw a magenta square at the axolotl position
                if (this.axolotl) {
                    const xNorm = (this.axolotl.position.x / gl.canvas.width) * 2 - 1;
                    const yNorm = -(this.axolotl.position.y / gl.canvas.height) * 2 + 1;
                    const width = (this.axolotl.width / gl.canvas.width) * 2;
                    const height = (this.axolotl.height / gl.canvas.height) * 2;
                    
                    // Draw a debug square at the axolotl position
                    this.drawColoredSquare(xNorm, yNorm, width, height, [1.0, 0.0, 1.0, 0.5]);
                    
                    console.log(`Drew debug square at (${xNorm.toFixed(2)}, ${yNorm.toFixed(2)}) with size ${width.toFixed(2)}x${height.toFixed(2)}`);
                }
            }
            
            // Draw the axolotl character on top
            if (this.axolotl) {
                // Force complete reset of WebGL state for sprite rendering
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // Premultiplied alpha blending
                gl.disable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                
                // Log rendering attempt
                console.log("Attempting to render axolotl sprite...");
                
                try {
                    this.spriteRenderer.draw(this.axolotl);
                    console.log("Sprite draw call completed");
                } catch (error) {
                    console.error("Error rendering sprite:", error);
                }
            }
        } catch (error) {
            console.error("Error in render loop:", error);
        }
    }

    // Debug function to help diagnose issues
    debugState() {
        console.log(`-------- DEBUG STATE t=${this.time.toFixed(1)}s --------`);
        console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
        console.log(`Water level: ${this.waterLevel.toFixed(2)}, Opacity: ${this.opacity.toFixed(2)}`);
        
        if (this.axolotl) {
            console.log(`Axolotl position: (${this.axolotl.position.x.toFixed(0)}, ${this.axolotl.position.y.toFixed(0)})`);
            console.log(`Axolotl size: ${this.axolotl.width}x${this.axolotl.height}`);
            
            if (this.axolotl.spriteManager) {
                const sm = this.axolotl.spriteManager;
                console.log(`Animation: ${sm.currentAnimation}, Frame: ${sm.currentFrame}, Sequence: ${sm.currentSequence + 1}/${sm.sequences.length}`);
                console.log(`Sequence timer: ${sm.sequenceTimer.toFixed(1)}s / ${sm.totalSequenceDuration}s`);
            }
        }
        console.log(`-------------------------------------`);
    }

    // Set water level (0-1)
    setWaterLevel(level) {
        this.waterLevel = Math.max(0.0, Math.min(1.0, level));
    }
    
    // Set opacity for underwater shader
    setOpacity(opacity) {
        this.opacity = Math.max(0.0, Math.min(1.0, opacity));
    }
    
    // Handle click events
    handleClick(e) {
        // Get click position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        console.log(`Canvas clicked at (${x}, ${y})`);
        
        // Reset animation sequence when clicked
        if (this.axolotl && this.axolotl.spriteManager) {
            this.axolotl.spriteManager.resetSequence();
            console.log("Animation sequence reset");
        }
        
        // Calculate clicked position as percentage of canvas height
        const clickedY = y / this.canvas.height;
        
        // Trigger transition based on clicked position
        this.transitionManager.transitionToLevel(1.0 - clickedY);
    }

    // Create a simple solid color shader for fallback/debugging
    createColorShader() {
        const gl = this.gl;
        
        // Vertex shader source
        const vsSource = `
            attribute vec4 aVertexPosition;
            uniform mat4 uModelViewMatrix;
            
            void main() {
                gl_Position = uModelViewMatrix * aVertexPosition;
            }
        `;
        
        // Fragment shader source
        const fsSource = `
            precision mediump float;
            uniform vec4 uColor;
            
            void main() {
                gl_FragColor = uColor;
            }
        `;
        
        // Create shader program
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        
        // Create the shader program
        this.colorProgram = gl.createProgram();
        gl.attachShader(this.colorProgram, vertexShader);
        gl.attachShader(this.colorProgram, fragmentShader);
        gl.linkProgram(this.colorProgram);
        
        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(this.colorProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the color shader program: ' + gl.getProgramInfoLog(this.colorProgram));
            return;
        }
        
        // Create buffer for the square
        this.createSquareBuffer();
        
        // Get uniform locations
        this.colorProgramInfo = {
            program: this.colorProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(this.colorProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                modelViewMatrix: gl.getUniformLocation(this.colorProgram, 'uModelViewMatrix'),
                color: gl.getUniformLocation(this.colorProgram, 'uColor'),
            },
        };
        
        console.log("Color shader created for debugging");
    }
    
    // Create a shader
    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        // Check if compilation was successful
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    // Create a buffer for a square
    createSquareBuffer() {
        const gl = this.gl;
        
        // Create a buffer for the square's positions.
        this.squareBuffer = gl.createBuffer();
        
        // Select the buffer as the one to apply buffer operations to
        gl.bindBuffer(gl.ARRAY_BUFFER, this.squareBuffer);
        
        // Create an array of positions for the square.
        const positions = [
            -1.0,  1.0,
             1.0,  1.0,
            -1.0, -1.0,
             1.0, -1.0,
        ];
        
        // Pass the list of positions into WebGL to build the shape
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    }
    
    // Draw a colored square at the specified position
    drawColoredSquare(x, y, width, height, color) {
        const gl = this.gl;
        
        // Use the shader program for colored squares
        gl.useProgram(this.colorProgram);
        
        // Set vertex attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.squareBuffer);
        gl.vertexAttribPointer(
            this.colorProgramInfo.attribLocations.vertexPosition,
            2,          // 2 components per vertex
            gl.FLOAT,   // 32bit floats
            false,      // don't normalize
            0,          // stride (0 = auto)
            0           // offset
        );
        gl.enableVertexAttribArray(this.colorProgramInfo.attribLocations.vertexPosition);
        
        // Set the color
        gl.uniform4fv(this.colorProgramInfo.uniformLocations.color, color);
        
        // Create model view matrix
        const modelViewMatrix = mat4.create();
        mat4.identity(modelViewMatrix);
        mat4.translate(modelViewMatrix, modelViewMatrix, [x, y, 0]);
        mat4.scale(modelViewMatrix, modelViewMatrix, [width/2, height/2, 1]);
        
        // Set the transformation matrix
        gl.uniformMatrix4fv(
            this.colorProgramInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );
        
        // Draw the square
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

// Start the application when the page loads
window.addEventListener('load', () => {
    new WebGLApp();
}); 
import { mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/+esm';

export class SpriteRenderer {
    constructor(gl) {
        this.gl = gl;
        this.program = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.uniforms = {};
        
        this.init();
    }
    
    async init() {
        // Create shader program
        await this.createShaderProgram();
        
        // Create buffers
        this.createBuffers();
        
        // Get uniform locations
        this.getUniformLocations();
        
        console.log("SpriteRenderer initialized");
    }
    
    async createShaderProgram() {
        // Vertex shader
        const vertexShaderSource = `
            precision mediump float;
            
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            
            uniform mat4 u_transform;
            
            varying vec2 v_texCoord;
            
            void main() {
                // Convert from pixels to clip space (-1 to 1)
                vec4 position = u_transform * vec4(a_position, 0.0, 1.0);
                
                // Flip Y axis to match WebGL coordinate system
                position.y = -position.y;
                
                gl_Position = position;
                v_texCoord = a_texCoord;
            }
        `;
        
        // Fragment shader
        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec2 v_texCoord;
            
            uniform sampler2D u_texture;
            
            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                
                // Use a bright color overlay for debugging to make the sprite visible
                vec4 debugColor = vec4(1.0, 0.0, 1.0, 0.5);
                
                // Mix with a bright color to make it visible for debugging
                gl_FragColor = vec4(color.rgb, color.a);
                
                // Ensure alpha value is preserved
                if (color.a < 0.01) {
                    discard;
                }
            }
        `;
        
        // Create shaders
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // Create program
        this.program = this.createProgram(vertexShader, fragmentShader);
    }
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        // Check if compilation was successful
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        // Check if linking was successful
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    createBuffers() {
        // Vertex position buffer (a quad)
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        
        // Quad vertices: 2 triangles (using triangle strip)
        // Modified to use -0.5 to 0.5 for better centering
        const positions = new Float32Array([
            -0.5, -0.5,  // Bottom-left
             0.5, -0.5,  // Bottom-right
            -0.5,  0.5,  // Top-left
             0.5,  0.5   // Top-right
        ]);
        
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        // Texture coordinate buffer
        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        
        // Default texture coords
        const texCoords = new Float32Array([
            0.0, 1.0,  // Bottom-left
            1.0, 1.0,  // Bottom-right
            0.0, 0.0,  // Top-left
            1.0, 0.0   // Top-right
        ]);
        
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
    }
    
    getUniformLocations() {
        this.uniforms = {
            transform: this.gl.getUniformLocation(this.program, 'u_transform'),
            texture: this.gl.getUniformLocation(this.program, 'u_texture')
        };
    }
    
    draw(sprite) {
        if (!sprite.spriteManager) {
            console.error("Sprite has no spriteManager");
            return;
        }
        
        // Get texture from sprite manager
        const texture = sprite.spriteManager.getTexture();
        if (!texture) {
            console.error("No texture available for sprite");
            return;
        }
        
        // Enhanced sprite debug info
        console.log(`Drawing sprite at (${sprite.position.x.toFixed(0)}, ${sprite.position.y.toFixed(0)}), ` +
                    `size: ${sprite.width}x${sprite.height}, ` +
                    `animation: ${sprite.spriteManager.currentAnimation}, ` +
                    `frame: ${sprite.spriteManager.currentFrame}, ` +
                    `canvas size: ${this.gl.canvas.width}x${this.gl.canvas.height}`);
        
        // Get UV coordinates for the current frame
        const uvCoords = sprite.spriteManager.getTextureCoords();
        
        // Update texture coordinates buffer with the current frame UVs
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        
        // Format: [u1,v1, u2,v2, u3,v3, u4,v4] - bottom-left, bottom-right, top-left, top-right
        const texCoords = new Float32Array([
            uvCoords.u1, uvCoords.v1,  // Bottom-left
            uvCoords.u2, uvCoords.v2,  // Bottom-right
            uvCoords.u3, uvCoords.v3,  // Top-left
            uvCoords.u4, uvCoords.v4   // Top-right
        ]);
        
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.DYNAMIC_DRAW);
        
        // Use this shader program
        this.gl.useProgram(this.program);
        
        // Convert pixel coordinates to normalized device coordinates (-1 to 1)
        const canvas = this.gl.canvas;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Create transformation matrix
        const transformMatrix = mat4.create();
        mat4.identity(transformMatrix);
        
        // Scale to normalized device coordinates (NDC)
        const scaleX = sprite.width / canvasWidth;
        const scaleY = sprite.height / canvasHeight; 
        
        // Convert pixel coordinates to NDC
        const posX = (sprite.position.x / canvasWidth) * 2 - 1; 
        const posY = (sprite.position.y / canvasHeight) * 2 - 1;
        
        // Apply transformations
        mat4.translate(transformMatrix, transformMatrix, [posX, posY, 0]);
        mat4.scale(transformMatrix, transformMatrix, [scaleX, scaleY, 1]);
        
        // Add debug info for transform
        console.log(`Sprite transform (NDC): pos=${posX.toFixed(2)},${posY.toFixed(2)}, scale=${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);
        
        // Enable attributes
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        const positionLoc = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLoc);
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        const texCoordLoc = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.gl.enableVertexAttribArray(texCoordLoc);
        this.gl.vertexAttribPointer(texCoordLoc, 2, this.gl.FLOAT, false, 0, 0);
        
        // Set uniforms
        this.gl.uniformMatrix4fv(this.uniforms.transform, false, transformMatrix);
        
        // Set up texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.uniforms.texture, 0);
        
        // Enable blending for transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA); // Try premultiplied alpha
        
        // Ensure sprite is rendered on top
        this.gl.disable(this.gl.DEPTH_TEST);
        
        // Draw the sprite
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
} 
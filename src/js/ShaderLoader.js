export class ShaderLoader {
    constructor(gl) {
        this.gl = gl;
        this.programs = {};
    }

    async loadShader(name, vertexShaderPath, fragmentShaderPath) {
        try {
            // Fetch shader sources from files
            const vertexResponse = await fetch(vertexShaderPath);
            if (!vertexResponse.ok) {
                throw new Error(`Failed to fetch vertex shader: ${vertexShaderPath}`);
            }
            const vertexSource = await vertexResponse.text();

            const fragmentResponse = await fetch(fragmentShaderPath);
            if (!fragmentResponse.ok) {
                throw new Error(`Failed to fetch fragment shader: ${fragmentShaderPath}`);
            }
            const fragmentSource = await fragmentResponse.text();

            // Create and compile shaders
            const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
            const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

            // Create program
            const program = this.createProgram(vertexShader, fragmentShader);
            
            // Store program for later use
            this.programs[name] = {
                program: program,
                uniforms: {},
                attributes: {},
                buffers: {}
            };

            // Create geometry
            this.createGeometry(name);

            console.log(`Shader '${name}' loaded successfully`);
            return true;
        } catch (error) {
            console.error(`Error loading shader '${name}':`, error);
            return false;
        }
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        // Check if compilation was successful
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compilation error: ${error}`);
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
            const error = this.gl.getProgramInfoLog(program);
            throw new Error(`Program linking error: ${error}`);
        }

        return program;
    }

    createGeometry(name) {
        const shaderData = this.programs[name];
        if (!shaderData) return;

        // Create a simple quad covering the entire canvas
        const positions = new Float32Array([
            -1, -1,  // Bottom left
            1, -1,   // Bottom right
            -1, 1,   // Top left
            1, 1     // Top right
        ]);

        // Create and bind buffer
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        // Store buffer in shader data
        shaderData.buffers.position = positionBuffer;
    }

    getLocations(name, attributes, uniforms) {
        const shaderData = this.programs[name];
        if (!shaderData) return false;

        const program = shaderData.program;

        // Get attribute locations
        attributes.forEach(attributeName => {
            shaderData.attributes[attributeName] = this.gl.getAttribLocation(program, attributeName);
        });

        // Get uniform locations
        uniforms.forEach(uniformName => {
            shaderData.uniforms[uniformName] = this.gl.getUniformLocation(program, uniformName);
        });

        return true;
    }

    useShader(name) {
        const shaderData = this.programs[name];
        if (!shaderData) return false;

        this.gl.useProgram(shaderData.program);
        return true;
    }

    setUniform(name, uniformName, type, ...values) {
        const shaderData = this.programs[name];
        if (!shaderData || !shaderData.uniforms[uniformName]) return false;

        const location = shaderData.uniforms[uniformName];
        
        // Set uniform based on type
        switch (type) {
            case '1f':
                this.gl.uniform1f(location, values[0]);
                break;
            case '2f':
                this.gl.uniform2f(location, values[0], values[1]);
                break;
            case '3f':
                this.gl.uniform3f(location, values[0], values[1], values[2]);
                break;
            case '4f':
                this.gl.uniform4f(location, values[0], values[1], values[2], values[3]);
                break;
            case '1i':
                this.gl.uniform1i(location, values[0]);
                break;
            default:
                console.error(`Unsupported uniform type: ${type}`);
                return false;
        }

        return true;
    }

    drawShader(name) {
        const shaderData = this.programs[name];
        if (!shaderData) return false;

        // Use this shader program
        this.gl.useProgram(shaderData.program);

        // Bind position buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, shaderData.buffers.position);
        
        // Get the position attribute location
        const posAttr = shaderData.attributes.a_position || 
                        this.gl.getAttribLocation(shaderData.program, 'a_position');
        
        if (posAttr !== -1) {
            this.gl.enableVertexAttribArray(posAttr);
            this.gl.vertexAttribPointer(posAttr, 2, this.gl.FLOAT, false, 0, 0);
        }

        // Draw the quad
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        return true;
    }
} 
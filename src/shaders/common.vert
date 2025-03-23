#version 100
// Common Vertex Shader
// Used for rendering fullscreen quads for both underwater and land shaders

precision mediump float;

// Attributes
attribute vec2 a_position;

// Varyings
varying vec2 v_texCoord;

void main() {
    // Convert position from -1,1 to 0,1 for texture coordinates
    v_texCoord = a_position * 0.5 + 0.5;
    
    // Output position unchanged
    gl_Position = vec4(a_position, 0.0, 1.0);
} 
// Vertex Shader
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform mat4 u_matrix;
uniform vec2 u_textureSize;

varying vec2 v_texCoord;

void main() {
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}

// Fragment Shader
precision mediump float;

uniform sampler2D u_texture;
uniform vec4 u_tint;

varying vec2 v_texCoord;

void main() {
    vec4 texColor = texture2D(u_texture, v_texCoord);
    // Discard transparent pixels
    if (texColor.a < 0.1) discard;
    // Apply tint color
    gl_FragColor = texColor * u_tint;
} 
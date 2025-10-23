export let VERTEX_SHADER = `
    attribute vec4 a_position;
    attribute vec2 a_texcoord;

    uniform mat4 u_matrix;

    varying vec2 v_texcoord;

    void main() {
        gl_Position = u_matrix * a_position;
        v_texcoord = a_texcoord;
    }
`;

export let FRAGMENT_SHADER = `
    precision mediump float;
    
    uniform sampler2D u_texture;
    uniform float u_alpha;

    varying vec2 v_texcoord;

    void main() {
       vec4 texColor = texture2D(u_texture, v_texcoord);
       gl_FragColor = vec4(texColor.rgb, texColor.a * u_alpha);
    }
`;
import { m4 } from "twgl.js";
import { calculateProperties } from "../utils/utils";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";
import { KeyFrame, Segment } from "./types";


export class WebGLRenderer {
    context: WebGLRenderingContext;
    program: WebGLProgram;

    positionLocation: number;
    texcoordLocation: number;

    matrixLocation: WebGLUniformLocation;
    textureLocation: WebGLUniformLocation;
    alphaLocation: WebGLUniformLocation;

    positionBuffer: WebGLBuffer;
    texcoordBuffer: WebGLBuffer;

    constructor(public canvas: HTMLCanvasElement, public projectWidth: number, public projectHeight: number) {
        this.context = canvas.getContext("webgl") as WebGLRenderingContext;
        if (!this.context) console.error("Failed to get webgl context!");

        // setup GLSL program
        this.program = this.context.createProgram() as WebGLProgram;

        this.context.attachShader(this.program, this.loadShader(VERTEX_SHADER, this.context.VERTEX_SHADER) as WebGLShader);
        this.context.attachShader(this.program, this.loadShader(FRAGMENT_SHADER, this.context.FRAGMENT_SHADER) as WebGLShader);

        this.context.linkProgram(this.program);
        const linked = this.context.getProgramParameter(this.program, this.context.LINK_STATUS);

        if (!linked) {
            console.error("Error in program linking:" + this.context.getProgramInfoLog(this.program));
            this.context.deleteProgram(this.program);
        }

        this.context.useProgram(this.program);

        // look up where the vertex data needs to go.
        this.positionLocation = this.context.getAttribLocation(this.program, "a_position");
        this.texcoordLocation = this.context.getAttribLocation(this.program, "a_texcoord");

        // lookup uniforms
        this.matrixLocation = this.context.getUniformLocation(this.program, "u_matrix") as WebGLUniformLocation;
        this.textureLocation = this.context.getUniformLocation(this.program, "u_texture") as WebGLUniformLocation;
        this.alphaLocation = this.context.getUniformLocation(this.program, "u_alpha") as WebGLUniformLocation;

        // Create a buffer to put three 2d clip space points in
        this.positionBuffer = this.context.createBuffer() as WebGLBuffer;
        this.context.bindBuffer(this.context.ARRAY_BUFFER, this.positionBuffer);
        // Put a unit quad in the buffer
        let positions = [
            0, 0,
            1, 1,
            1, 0,
            0, 0,
            0, 1,
            1, 1,
        ]
        this.context.bufferData(this.context.ARRAY_BUFFER, new Float32Array(positions), this.context.STATIC_DRAW);

        // Create a buffer for texture coords
        this.texcoordBuffer = this.context.createBuffer() as WebGLBuffer;
        this.context.bindBuffer(this.context.ARRAY_BUFFER, this.texcoordBuffer);

        // Put texcoords in the buffer
        let texcoords = [
            0, 0,
            1, 1,
            1, 0,
            0, 0,
            0, 1,
            1, 1,
        ]
        this.context.bufferData(this.context.ARRAY_BUFFER, new Float32Array(texcoords), this.context.STATIC_DRAW);
    }

    public drawSegments(segments: Segment[], elements: (HTMLVideoElement | HTMLImageElement | HTMLCanvasElement)[], timestamp: number) {
        // Update canvas size to match its display size
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;
        
        // Check if the canvas is not the same size as its display size
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            // Make the canvas the same size as its display size
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
        }
        
        // Tell WebGL how to convert from clip space to pixels
        this.context.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.context.clear(this.context.COLOR_BUFFER_BIT);

        // Enable blending for transparency
        this.context.enable(this.context.BLEND);
        this.context.blendFunc(this.context.SRC_ALPHA, this.context.ONE_MINUS_SRC_ALPHA);

        for (let i = 0; i < segments.length; i++) {
            this.drawImage(segments[i], elements[i], calculateProperties(segments[i], timestamp));
        }

        this.context.flush();
    }

    private loadShader(shaderSource: string, shaderType: number) {
        // Create the shader object
        const shader = this.context.createShader(shaderType) as WebGLShader;

        // Load the shader source
        this.context.shaderSource(shader, shaderSource);

        // Compile the shader
        this.context.compileShader(shader);

        // Check the compile status
        const compiled = this.context.getShaderParameter(shader, this.context.COMPILE_STATUS);

        if (!compiled) {
            // Something went wrong during compilation; get the error
            const lastError = this.context.getShaderInfoLog(shader);

            console.error("*** Error compiling shader '" +
                shader +
                "':" +
                lastError +
                `\n` +
                shaderSource
                    .split("\n")
                    .map((l, i) => `${i + 1}: ${l}`)
                    .join("\n"));

            this.context.deleteShader(shader);
            return null;
        }

        return shader;
    }

    // creates a texture info { width: w, height: h, texture: tex }
    // The texture will start with 1x1 pixels and be updated
    // when the image has loaded
    createTexture() {
        let tex = this.context.createTexture() as WebGLTexture;
        this.context.bindTexture(this.context.TEXTURE_2D, tex);
        // Fill the texture with a 1x1 blue pixel.
        this.context.texImage2D(this.context.TEXTURE_2D, 0, this.context.RGBA, 1, 1, 0, this.context.RGBA, this.context.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, 255]));

        // let's assume all images are not a power of 2
        this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_WRAP_S, this.context.CLAMP_TO_EDGE);
        this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_WRAP_T, this.context.CLAMP_TO_EDGE);
        this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_MIN_FILTER, this.context.LINEAR);
        return tex;
    }

    // Unlike images, textures do not have a width and height associated
    // with them so we'll pass in the width and height of the texture
    private drawImage(segment: Segment, element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, properties: KeyFrame) {
        if (properties.scaleX as number <= 0 ||
            properties.scaleY as number <= 0 ||
            (properties.trimLeft as number) + (properties.trimRight as number) >= 1 ||
            (properties.trimTop as number) + (properties.trimBottom as number) >= 1) {
            return;
        }
        this.context.bindTexture(this.context.TEXTURE_2D, segment.texture);
        this.context.texImage2D(this.context.TEXTURE_2D, 0, this.context.RGBA, this.context.RGBA, this.context.UNSIGNED_BYTE, element);

        // Tell WebGL to use our shader program pair
        this.context.useProgram(this.program);

        // Setup the attributes to pull data from our buffers
        this.context.bindBuffer(this.context.ARRAY_BUFFER, this.positionBuffer);
        this.context.enableVertexAttribArray(this.positionLocation);
        this.context.vertexAttribPointer(this.positionLocation, 2, this.context.FLOAT, false, 0, 0);

        // Begin Crop
        this.context.bindBuffer(this.context.ARRAY_BUFFER, this.texcoordBuffer);

        // Put texcoords in the buffer
        let texcoords = [
            0 + (properties.trimLeft as number), 0 + (properties.trimTop as number),
            1 - (properties.trimRight as number), 1 - (properties.trimBottom as number),
            1 - (properties.trimRight as number), 0 + (properties.trimTop as number),
            0 + (properties.trimLeft as number), 0 + (properties.trimTop as number),
            0 + (properties.trimLeft as number), 1 - (properties.trimBottom as number),
            1 - (properties.trimRight as number), 1 - (properties.trimBottom as number),
        ]
        this.context.bufferData(this.context.ARRAY_BUFFER, new Float32Array(texcoords), this.context.STATIC_DRAW);
        // End Crop

        this.context.enableVertexAttribArray(this.texcoordLocation);
        this.context.vertexAttribPointer(this.texcoordLocation, 2, this.context.FLOAT, false, 0, 0);

        // this matirx will convert from pixels to clip space
        let matrix = m4.ortho(0, this.canvas.width, this.canvas.height, 0, -1, 1);

        // Get dimensions based on element type
        let elementWidth: number;
        let elementHeight: number;
        
        if (element instanceof HTMLVideoElement) {
            elementWidth = element.videoWidth;
            elementHeight = element.videoHeight;
        } else if (element instanceof HTMLCanvasElement) {
            // For canvas elements, use width/height
            elementWidth = element.width;
            elementHeight = element.height;
        } else {
            // For images, maintain aspect ratio and fit within canvas bounds
            const naturalWidth = element.naturalWidth;
            const naturalHeight = element.naturalHeight;
            
            // Calculate aspect ratio
            const aspectRatio = naturalWidth / naturalHeight;
            const canvasAspectRatio = this.canvas.width / this.canvas.height;
            
            // Calculate scale factor to fit image within canvas bounds while maintaining aspect ratio
            let scaleFactor: number;
            
            if (aspectRatio > canvasAspectRatio) {
                // Image is wider than canvas - scale based on width
                scaleFactor = this.canvas.width / naturalWidth;
            } else {
                // Image is taller than canvas - scale based on height
                scaleFactor = this.canvas.height / naturalHeight;
            }
            
            // Apply a maximum scale to prevent images from being too large
            // and a minimum scale to ensure visibility on smaller screens
            const maxScale = 1.0; // Don't make images larger than their natural size
            const minScale = 0.1; // Ensure images are at least 10% of their natural size
            scaleFactor = Math.min(maxScale, Math.max(minScale, scaleFactor));
            
            elementWidth = naturalWidth * scaleFactor;
            elementHeight = naturalHeight * scaleFactor;
            
            console.log('Image dimensions calculated:', {
                original: { width: naturalWidth, height: naturalHeight },
                calculated: { width: elementWidth, height: elementHeight },
                aspectRatio,
                canvasAspectRatio,
                scaleFactor,
                canvasSize: { width: this.canvas.width, height: this.canvas.height }
            });
        }

        let newWidth = elementWidth * (properties.scaleX as number);
        let newHeight = elementHeight * (properties.scaleY as number);

        // Calculate center position for rotation - use canvas dimensions instead of project dimensions
        let centerX = (this.canvas.width / 2) + (properties.x as number);
        let centerY = (this.canvas.height / 2) + (properties.y as number);

        // this matrix will translate our quad to center position
        matrix = m4.translate(matrix, [centerX, centerY, 0, 0]);

        // Apply rotation around center
        if (properties.rotation && (properties.rotation as number) !== 0) {
            matrix = m4.rotateZ(matrix, (properties.rotation as number) * Math.PI / 180);
        }

        // Translate to final position accounting for scale and trim
        matrix = m4.translate(matrix, [
            -(newWidth / 2) * (1 - (properties.trimLeft as number) - (properties.trimRight as number)),
            -(newHeight / 2) * (1 - (properties.trimTop as number) - (properties.trimBottom as number)), 0, 0]);

        // this matrix will scale our 1 unit quad
        // from 1 unit to texWidth, texHeight units
        matrix = m4.scale(matrix, [newWidth * (1 - (properties.trimRight as number) - (properties.trimLeft as number)),
        newHeight * (1 - (properties.trimTop as number) - (properties.trimBottom as number)), 0, 0]);

        // Set the matrix.
        this.context.uniformMatrix4fv(this.matrixLocation, false, matrix);

        // Set opacity (alpha) uniform
        let alpha = properties.opacity !== undefined ? (properties.opacity as number) : 1.0;
        this.context.uniform1f(this.alphaLocation, alpha);

        // Tell the shader to get the texture from texture unit 0
        this.context.uniform1i(this.textureLocation, 0);

        // draw the quad (2 triangles, 6 vertices)
        this.context.drawArrays(this.context.TRIANGLES, 0, 6);
    }
}

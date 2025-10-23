export interface Source {
    track: number;
    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
    inUse: boolean;
}

export interface TextStyle {
    fontSize: number;
    fontFamily: string;
    color: string;
    borderColor: string;
    borderWidth: number;
    backgroundColor: string;
}

export interface Media {
    sources: Source[]; // Source 0 should allways be present
    file: File;
    thumbnail: string;
    type?: 'video' | 'image' | 'text';
    textContent?: string;
    textStyle?: TextStyle;
}

export interface Segment {
    media: Media;
    start: number; // Global start
    duration: number;
    mediaStart: number;
    keyframes: KeyFrame[]; // Keyframe 0 should allways be present
    texture: WebGLTexture;
}

export interface KeyFrame {
    start: number; // Offset from segment start
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number; // Rotation in degrees
    opacity?: number; // Opacity from 0 to 1
    trimLeft?: number;
    trimRight?: number
    trimTop?: number;
    trimBottom?: number;
}

export interface SegmentID {
    index: number;
    track: number;
}


export interface Project {
    _id: string;
    name: string;
    width: number;
    height: number;
    framerate: number;
    duration: number;
}
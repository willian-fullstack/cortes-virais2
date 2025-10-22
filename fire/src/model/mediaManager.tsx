import { useEffect, useState } from "react";
import { calculateProperties } from "../utils/utils";
import PlaybackController from "./playbackController";
import { Media, Project, Segment, SegmentID } from "./types";
import { WebGLRenderer } from "./webgl";

export default function MediaManager(props: {
    setProjects: (projects: Project[]) => void;
    projects: Project[];
    projectUser: string;
    setProjectUser: (user: string) => void;
    projectHeight: number;
    setProjectHeight: (height: number) => void;
    projectWidth: number;
    setProjectWidth: (width: number) => void;
    projectFramerate: number;
    setProjectFramerate: (framerate: number) => void;
    projectName: string;
    setProjectName: (name: string) => void;
    projectId: string;
    setProjectId: (id: string) => void;
    projectDuration: number;
    setProjectDuration: (duration: number) => void;
}) {
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [trackList, setTrackList] = useState<Segment[][]>([[]]);
    const [selectedSegment, setSelectedSegment] = useState<SegmentID | null>(null);
    const [canvasRef] = useState<HTMLCanvasElement>(document.createElement("canvas"));
    const [renderer] = useState<WebGLRenderer>(new WebGLRenderer(canvasRef, props.projectWidth, props.projectHeight));

    useEffect(() => {
        canvasRef.width = props.projectWidth;
        canvasRef.height = props.projectHeight;
    }, [canvasRef, props.projectHeight, props.projectWidth]);

    useEffect(() => {
        let duration = 0;
        for (const track of trackList) {
            if (track.length === 0) continue;
            duration = Math.max(duration, track[track.length - 1].start + track[track.length - 1].duration);
        }

        props.setProjectDuration(duration);
    }, [trackList, props]);

    const thumbnailCanvas = document.createElement("canvas");
    const thumbnailCanvasContext = thumbnailCanvas.getContext("2d") as CanvasRenderingContext2D;

    const generateThumbnail = async (file: File) => {
        if (file.type.startsWith('image/')) {
            // Handle images
            let img = document.createElement("img") as HTMLImageElement;
            
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject();
                img.src = URL.createObjectURL(file);
            });

            // Generate Thumbnail for image
            thumbnailCanvas.width = img.naturalWidth;
            thumbnailCanvas.height = img.naturalHeight;
            thumbnailCanvasContext.drawImage(
                img,
                0,
                0,
                img.naturalWidth,
                img.naturalHeight
            );

            let media: Media = {
                sources: [{ track: 0, element: img as any, inUse: false }],
                file: file,
                thumbnail: thumbnailCanvas.toDataURL(),
            };

            return media;
        } else {
            // Handle videos
            let elm = document.createElement("video") as HTMLVideoElement;
            elm.preload = "auto";

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video loading timeout'));
                }, 10000); // 10 second timeout

                elm.onloadeddata = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                
                elm.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Video loading error'));
                };

                elm.src = URL.createObjectURL(file);
                elm.currentTime = 0.0001;
            });

            // Generate Thumbnail for video
            thumbnailCanvas.width = elm.videoWidth;
            thumbnailCanvas.height = elm.videoHeight;
            thumbnailCanvasContext.drawImage(
                elm,
                0,
                0,
                elm.videoWidth,
                elm.videoHeight
            );

            let media: Media = {
                sources: [{ track: 0, element: elm, inUse: false }],
                file: file,
                thumbnail: thumbnailCanvas.toDataURL(),
            };

            return media;
        }
    };

    const addVideo = async (files: File[]) => {
        let uniqueFiles: File[] = [];
        let found = false;
        for (let file of files) {
            for (let i = 0; i < mediaList.length; i++) {
                if (mediaList[i].file.name === file.name) {
                    found = true;
                    break;
                }
            }
            if (found) continue;
            uniqueFiles.push(file);
        }

        let filesList: Media[] = [];

        try {
            for (let file of uniqueFiles) {
                try {
                    const media = await generateThumbnail(file);
                    filesList.push(media);
                } catch (error) {
                    console.error(`Failed to load file ${file.name}:`, error);
                    alert(`Failed to load file: ${file.name}. Please try again or use a different file.`);
                }
            }

            if (filesList.length > 0) {
                setMediaList([...mediaList, ...filesList]);
                console.log("Successfully Loaded Segment Thumbnail!");
            }
        } catch (error) {
            console.error("Error loading files:", error);
        }

        return;
    }

    const dragAndDrop = (media: Media) => {
        if (renderer == null) return;
        
        // Handle different media types
        let duration = 0;
        let newElement: HTMLVideoElement | HTMLImageElement;
        
        if (media.file.type.startsWith('image/')) {
            // For images, set a default duration (e.g., 5 seconds)
            duration = 5000; // 5 seconds in milliseconds
            newElement = media.sources[0].element.cloneNode() as HTMLImageElement;
        } else {
            // For videos, use the actual duration
            duration = (media.sources[0].element as HTMLVideoElement).duration * 1000;
            newElement = media.sources[0].element.cloneNode() as HTMLVideoElement;
            (newElement as HTMLVideoElement).pause();
        }
        
        let segment: Segment = {
            media: media,
            start: 0,
            duration: duration,
            mediaStart: 0,
            texture: renderer.createTexture(),
            keyframes: [
                {
                    start: 0,
                    x: 0,
                    y: 0,
                    trimRight: 0,
                    trimLeft: 0,
                    trimTop: 0,
                    trimBottom: 0,
                    scaleX: 1.0,
                    scaleY: 1.0,
                },
            ]
        };

        if (trackList[trackList.length - 1].length === 0) {
            if (!media.sources.find(source => source.track === trackList.length - 1))
                media.sources.push({ track: trackList.length - 1, element: newElement, inUse: false });
            setTrackList([...trackList.slice(0, trackList.length - 1), [segment], []]);
        } else {
            media.sources.push({ track: trackList.length, element: newElement, inUse: false });
            setTrackList([...trackList, [segment], []]);
        }
    }

    const deleteVideo = (media: Media) => {
        for (const source of media.sources) {
            // Only call pause() on video elements, not images
            if (source.element instanceof HTMLVideoElement) {
                source.element.pause();
            }
        }

        if (selectedSegment && trackList[selectedSegment.track][selectedSegment.index].media === media) setSelectedSegment(null);
        setMediaList(mediaList.filter(item => item !== media));

        let newTrackList = trackList.map(track => track.filter(segment => segment.media !== media));

        // Clean Tracklist
        while (newTrackList.length > 0 && newTrackList[newTrackList.length - 1].length === 0) newTrackList.pop();
        newTrackList.push([]);

        setTrackList(newTrackList);
    }

    const deleteSelectedSegment = () => {
        if (selectedSegment === null) return;

        for (const source of trackList[selectedSegment.track][selectedSegment.index].media.sources) {
            // Only call pause() on video elements, not images
            if (source.element instanceof HTMLVideoElement) {
                source.element.pause();
            }
        }

        let newTrackList = [
            ...trackList.slice(0, selectedSegment.track),
            [...trackList[selectedSegment.track].slice(0, selectedSegment.index), ...trackList[selectedSegment.track].slice(selectedSegment.index + 1)],
            ...trackList.slice(selectedSegment.track + 1)
        ];

        // Clean Tracklist
        while (newTrackList.length > 0 && newTrackList[newTrackList.length - 1].length === 0) newTrackList.pop();
        newTrackList.push([]);

        setTrackList(newTrackList);
        setSelectedSegment(null);
    }

    const split = (timestamp: number) => {

        if (selectedSegment === null) return;

        const segment = trackList[selectedSegment.track][selectedSegment.index];

        if (segment.start > timestamp || segment.start + segment.duration < timestamp) return;

        // Find index of current keyframe at timestamp
        // There is always at least 1 keyframe in a segment

        let segmentTimeCut = timestamp - segment.start;
        let lenKeyframes = segment.keyframes.length;
        let keyFrameIndex = 0;
        for (let i = 1; i < lenKeyframes; i++) {
            let checkKeyframe = segment.keyframes[i];
            if (checkKeyframe.start > segmentTimeCut) {
                break;
            }
            keyFrameIndex = i;
        }

        let interpKeyFrame = calculateProperties(segment, timestamp);

        // Remove remaining keyframes from split segment
        let leftSegmentKeyFrames = segment.keyframes.slice(0, keyFrameIndex + 1);
        // Move remaining keyframes to new split segment
        let rightSegmentKeyFrames = segment.keyframes.slice(keyFrameIndex + 1, lenKeyframes);

        // Edit new keyframes to new offset
        for (let i = 0; i < rightSegmentKeyFrames.length; i++) {
            rightSegmentKeyFrames[i].start -= segmentTimeCut;
        }

        // Add interpolated keyframe at the end of the selected split segement
        let newInterpKeyFrame = {
            ...interpKeyFrame,
            start: segmentTimeCut - 1 / props.projectFramerate
        };
        leftSegmentKeyFrames.push(newInterpKeyFrame);

        setTrackList([
            ...trackList.slice(0, selectedSegment.track),
            [
                ...trackList[selectedSegment.track].slice(0, selectedSegment.index),
                {
                    ...trackList[selectedSegment.track][selectedSegment.index], duration: timestamp - segment.start,
                    keyframes: leftSegmentKeyFrames
                },
                {
                    media: segment.media,
                    start: timestamp,
                    duration: segment.start + segment.duration - timestamp,
                    mediaStart: timestamp - segment.start + segment.mediaStart,
                    texture: segment.texture,
                    keyframes: [interpKeyFrame].concat(rightSegmentKeyFrames)
                },
                ...trackList[selectedSegment.track].slice(selectedSegment.index + 1)
            ],
            ...trackList.slice(selectedSegment.track + 1)
        ]);
    }

    const splitAtMultiplePositions = (timestamps: number[]) => {
        if (timestamps.length === 0) return;

        // Sort timestamps in descending order to avoid index shifting issues
        const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
        
        let newTrackList = [...trackList];

        // Process each timestamp
        for (const timestamp of sortedTimestamps) {
            // Find all segments that intersect with this timestamp
            for (let trackIndex = 0; trackIndex < newTrackList.length; trackIndex++) {
                const track = newTrackList[trackIndex];
                
                for (let segmentIndex = 0; segmentIndex < track.length; segmentIndex++) {
                    const segment = track[segmentIndex];
                    
                    // Check if timestamp is within this segment
                    if (segment.start < timestamp && segment.start + segment.duration > timestamp) {
                        // Split this segment
                        let segmentTimeCut = timestamp - segment.start;
                        let lenKeyframes = segment.keyframes.length;
                        let keyFrameIndex = 0;
                        
                        for (let i = 1; i < lenKeyframes; i++) {
                            let checkKeyframe = segment.keyframes[i];
                            if (checkKeyframe.start > segmentTimeCut) {
                                break;
                            }
                            keyFrameIndex = i;
                        }

                        let interpKeyFrame = calculateProperties(segment, timestamp);

                        // Remove remaining keyframes from split segment
                        let leftSegmentKeyFrames = segment.keyframes.slice(0, keyFrameIndex + 1);
                        // Move remaining keyframes to new split segment
                        let rightSegmentKeyFrames = segment.keyframes.slice(keyFrameIndex + 1, lenKeyframes);

                        // Edit new keyframes to new offset
                        for (let i = 0; i < rightSegmentKeyFrames.length; i++) {
                            rightSegmentKeyFrames[i].start -= segmentTimeCut;
                        }

                        // Add interpolated keyframe at the end of the selected split segment
                        let newInterpKeyFrame = {
                            ...interpKeyFrame,
                            start: segmentTimeCut - 1 / props.projectFramerate
                        };
                        leftSegmentKeyFrames.push(newInterpKeyFrame);

                        // Create the two new segments
                        const leftSegment = {
                            ...segment,
                            duration: timestamp - segment.start,
                            keyframes: leftSegmentKeyFrames
                        };

                        const rightSegment = {
                            media: segment.media,
                            start: timestamp,
                            duration: segment.start + segment.duration - timestamp,
                            mediaStart: timestamp - segment.start + segment.mediaStart,
                            texture: segment.texture,
                            keyframes: [interpKeyFrame].concat(rightSegmentKeyFrames)
                        };

                        // Replace the original segment with the two new ones
                        newTrackList[trackIndex] = [
                            ...track.slice(0, segmentIndex),
                            leftSegment,
                            rightSegment,
                            ...track.slice(segmentIndex + 1)
                        ];

                        // Break out of the segment loop since we modified the track
                        break;
                    }
                }
            }
        }

        setTrackList(newTrackList);
    }

    const updateSegment = (id: SegmentID, newSegment: Segment) => {
        setTrackList([
            ...trackList.slice(0, id.track),
            [...trackList[id.track].slice(0, id.index), newSegment, ...trackList[id.track].slice(id.index + 1)],
            ...trackList.slice(id.track + 1)
        ]);
    }

    return (
        <PlaybackController
            {...props}
            canvasRef={canvasRef}
            mediaList={mediaList}
            setMediaList={setMediaList}
            trackList={trackList}
            setTrackList={setTrackList}
            addVideo={addVideo}
            deleteVideo={deleteVideo}
            deleteSelectedSegment={deleteSelectedSegment}
            renderer={renderer}
            dragAndDrop={dragAndDrop}
            selectedSegment={selectedSegment}
            setSelectedSegment={setSelectedSegment}
            updateSegment={updateSegment}
            splitVideo={split}
            splitAtMultiplePositions={splitAtMultiplePositions}
        />
    );
}

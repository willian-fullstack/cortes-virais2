import Editor from "../routes/editor";
import { Media, Project, Segment, SegmentID, Source, TextStyle } from "./types";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { WebGLRenderer } from "./webgl";
import { Route, BrowserRouter as Router, Routes, Navigate } from "react-router-dom";
import About from "../routes/about";
import ExportPage from "../routes/exportPage";
import Projects from "../routes/projects";

export default function PlaybackController(props: {
  setProjects: (projects: Project[]) => void;
  projects: Project[];
  projectUser: string;
  setProjectUser: (user: string) => void;
  canvasRef: HTMLCanvasElement;
  mediaList: Media[];
  setMediaList: (mediaList: Media[]) => void;
  trackList: Segment[][];
  setTrackList: (segments: Segment[][]) => void;
  addVideo: (file: File[]) => void;
  addText: (textContent: string, textStyle: TextStyle) => void;
  deleteVideo: (media: Media) => void;
  renderer: WebGLRenderer;
  dragAndDrop: (media: Media) => void;
  setSelectedSegment: (selected: SegmentID | null) => void;
  selectedSegment: SegmentID | null;
  updateSegment: (id: SegmentID, segment: Segment) => void;
  splitVideo: (timestamp: number) => void;
  splitAtMultiplePositions: (timestamps: number[]) => void;
  deleteSelectedSegment: () => void;
  projectWidth: number;
  projectHeight: number;
  projectFramerate: number;
  projectDuration: number;
  projectId: string;
  setProjectId: (id: string) => void;
  setProjectDuration: (duration: number) => void;
}) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isRecordingRef = useRef(false);
  const [currentTime, _setCurrentTime] = useState<number>(0);
  const trackListRef = useRef(props.trackList);
  const playbackStartTimeRef = useRef(0);
  const lastPlaybackTimeRef = useRef(0);
  const projectDurationRef = useRef(0);
  const mediaListRef = useRef<Media[]>([]);
  const isPlayingRef = useRef(false);
  const SKIP_THREASHOLD = 100;
  let recordedChunks: Array<any>;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  trackListRef.current = props.trackList;
  projectDurationRef.current = props.projectDuration;
  mediaListRef.current = props.mediaList;
  isPlayingRef.current = isPlaying;

  const setCurrentTime = useCallback((timestamp: number) => {
    lastPlaybackTimeRef.current = timestamp;
    playbackStartTimeRef.current = performance.now();
    _setCurrentTime(timestamp);
    if (!isPlayingRef.current) renderFrame(false);
  }, []);

  const renderFrame = useCallback(async (update: boolean) => {
    let curTime =
      performance.now() -
      playbackStartTimeRef.current +
      lastPlaybackTimeRef.current;
    if (!update) curTime = lastPlaybackTimeRef.current;
    if (curTime >= projectDurationRef.current)
      curTime = projectDurationRef.current;
    _setCurrentTime(curTime);

    for (const media of mediaListRef.current) {
      if (media && media.sources) {
        for (const source of media.sources) {
          source.inUse = false;
        }
      }
    }

    let segments: Segment[] = [];
    let elements: (HTMLVideoElement | HTMLImageElement | HTMLCanvasElement)[] = [];
    let needsSeek = false;

    for (let i = trackListRef.current.length - 1; i >= 0; i--) {
      for (let j = 0; j < trackListRef.current[i].length; j++) {
        const segment = trackListRef.current[i][j];
        if (
          curTime >= segment.start &&
          curTime < segment.start + segment.duration
        ) {
          if (segment.media && segment.media.sources) {
            let source = segment.media.sources.find(
              (source) => source.track === i
            ) as Source;
            if (source) {
              source.inUse = true;
              let mediaTime = curTime - segment.start + segment.mediaStart;
              if (
                Math.abs((source.element as HTMLVideoElement).currentTime * 1000 - mediaTime) >
                SKIP_THREASHOLD ||
                (source.element as HTMLVideoElement).paused
              )
                needsSeek = true;
              segments.push(segment);
              elements.push(source.element);
            }
          }
        }
      }
    }

    for (const media of mediaListRef.current) {
      if (media && media.sources) {
        for (const source of media.sources) {
          if (!source.inUse) {
            // Only call pause() on video elements, not images
            if (source.element instanceof HTMLVideoElement) {
              source.element.pause();
            }
            source.inUse = true;
          }
        }
      }
    }

    if (needsSeek) {
      if (isRecordingRef.current) {
        if (mediaRecorderRef.current != null) mediaRecorderRef.current.pause();
      }
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        // Only call pause() on video elements, not images or canvas
        if (elements[i] instanceof HTMLVideoElement) {
          (elements[i] as HTMLVideoElement).pause();
        }
        let mediaTime = (curTime - segment.start + segment.mediaStart) / 1000;

        // Only set currentTime and handle seeking for video elements
        if (elements[i] instanceof HTMLVideoElement && (elements[i] as HTMLVideoElement).currentTime !== mediaTime) {
          await new Promise<void>((resolve, reject) => {
            (elements[i] as HTMLVideoElement).onseeked = () => resolve();
            (elements[i] as HTMLVideoElement).currentTime = mediaTime;
          });
        }
      }
      try {
        await Promise.allSettled(elements.map((element) => {
          // Only call play() on video elements
          if (element instanceof HTMLVideoElement) {
            return element.play();
          }
          return Promise.resolve();
        }));
      } catch (error) { }
      lastPlaybackTimeRef.current = curTime;
      playbackStartTimeRef.current = performance.now();
      if (isRecordingRef.current) {
        if (mediaRecorderRef.current != null) mediaRecorderRef.current.resume();
      }
    }

    props.renderer.drawSegments(segments, elements, curTime);

    if (!isPlayingRef.current) {
      for (const element of elements) {
        if (element instanceof HTMLVideoElement) {
          element.pause();
        }
      }
      return;
    }

    if (curTime === projectDurationRef.current) {
      pause();
      if (isRecordingRef.current) {
        if (mediaRecorderRef.current != null) mediaRecorderRef.current.stop();
        isRecordingRef.current = false;
      }
      return;
    }

    (setTimeout(() => {
      renderFrame(true);
    }, 1 / props.projectFramerate) as unknown) as number;
  }, [props.renderer, props.projectFramerate]);

  useEffect(() => {
    if (!isPlayingRef.current) renderFrame(false);
  }, [props.trackList, renderFrame]);

  useEffect(() => {
    if (currentTime > props.projectDuration)
      setCurrentTime(props.projectDuration);
  }, [props.projectDuration, setCurrentTime]);

  const play = async () => {
    if (currentTime >= projectDurationRef.current) return;

    setIsPlaying(true);
    lastPlaybackTimeRef.current = currentTime;
    playbackStartTimeRef.current = performance.now();
    isPlayingRef.current = true;

    renderFrame(true);
  };

  const pause = () => {
    setIsPlaying(false);
  };

  const Render = async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
    recordedChunks = [];
    const stream = props.canvasRef.captureStream(props.projectFramerate);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      download(blob, "test.webm");
      isRecordingRef.current = false;
    };

    mediaRecorder.start();
    setCurrentTime(0);
    play();
  };

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // New function to export individual segments
  const exportSegment = async (segment: Segment, videoNumber: number) => {
    if (isRecordingRef.current) return;
    
    console.log(`Exportando vídeo ${videoNumber}...`);
    isRecordingRef.current = true;
    
    // Set up recording parameters for the segment
    const segmentStartTime = segment.start;
    const segmentEndTime = segment.start + segment.duration;
    const segmentDuration = segment.duration;
    
    console.log(`Segment: ${segmentStartTime}ms to ${segmentEndTime}ms (duration: ${segmentDuration}ms)`);
    
    recordedChunks = [];
    const stream = props.canvasRef.captureStream(props.projectFramerate);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      download(blob, `video_${videoNumber}.webm`);
      isRecordingRef.current = false;
      console.log(`Vídeo ${videoNumber} exportado com sucesso!`);
    };

    // Start recording
    mediaRecorder.start();
    
    // Set playback to segment start time
    setCurrentTime(segmentStartTime);
    
    // Create a custom render loop for the segment
    const renderSegmentFrame = async (startTime: number) => {
      const elapsed = performance.now() - startTime;
      const currentSegmentTime = segmentStartTime + elapsed;
      
      // Check if we've reached the end of the segment
      if (currentSegmentTime >= segmentEndTime) {
        mediaRecorder.stop();
        return;
      }
      
      // Render the current frame
      _setCurrentTime(currentSegmentTime);
      
      // Reset media sources usage
      for (const media of mediaListRef.current) {
        if (media && media.sources) {
          for (const source of media.sources) {
            source.inUse = false;
          }
        }
      }

      let segments: Segment[] = [];
      let elements: (HTMLVideoElement | HTMLImageElement | HTMLCanvasElement)[] = [];
      let needsSeek = false;

      // Process only segments that are active at the current time
      for (let i = trackListRef.current.length - 1; i >= 0; i--) {
        for (let j = 0; j < trackListRef.current[i].length; j++) {
          const currentSegment = trackListRef.current[i][j];
          if (
            currentSegmentTime >= currentSegment.start &&
            currentSegmentTime < currentSegment.start + currentSegment.duration
          ) {
            if (currentSegment.media && currentSegment.media.sources) {
              let source = currentSegment.media.sources.find(
                (source) => source.track === i
              );
              if (source) {
                source.inUse = true;
                let mediaTime = currentSegmentTime - currentSegment.start + currentSegment.mediaStart;
                
                if (source.element instanceof HTMLVideoElement) {
                  if (Math.abs(source.element.currentTime * 1000 - mediaTime) > SKIP_THREASHOLD) {
                    source.element.currentTime = mediaTime / 1000;
                    needsSeek = true;
                  }
                }
                
                segments.push(currentSegment);
                elements.push(source.element);
              }
            }
          }
        }
      }

      // Render the frame
      if (!needsSeek) {
        props.renderer.drawSegments(segments, elements, currentSegmentTime);
      }
      
      // Continue to next frame
      requestAnimationFrame(() => renderSegmentFrame(startTime));
    };
    
    // Start the segment rendering loop
    renderSegmentFrame(performance.now());
  };

  return (
    <Router>
      <Routes>
        <Route path="/export" element={
          <ExportPage
            Render={Render}
            setCurrentTime={setCurrentTime}
            trackList={props.trackList}
            projectDuration={props.projectDuration}
            currentTime={currentTime}
            isRecordingRef={isRecordingRef}
          />
        } />
        <Route path="/about" element={<About />} />
        <Route path="/projects" element={
          <Projects
            projectUser="user"
            projects={props.projects}
            setProjects={props.setProjects}
          />
        } />
        <Route path="/editor" element={
          <Editor
            {...props}
            playVideo={play}
            pauseVideo={pause}
            isPlaying={isPlaying}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            exportSegment={exportSegment}
          />
        } />
        <Route path="/" element={<Navigate to='/editor' replace />} />
      </Routes>
    </Router>
  );
}

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
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const trackListRef = useRef(props.trackList);
  const playbackStartTimeRef = useRef(0);
  const lastPlaybackTimeRef = useRef(0);
  const projectDurationRef = useRef(0);
  const mediaListRef = useRef<Media[]>([]);
  const isPlayingRef = useRef(false);
  const audioEnabledRef = useRef(true);
  const SKIP_THREASHOLD = 100;
  let recordedChunks: Array<any>;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  trackListRef.current = props.trackList;
  projectDurationRef.current = props.projectDuration;
  mediaListRef.current = props.mediaList;
  isPlayingRef.current = isPlaying;
  audioEnabledRef.current = audioEnabled;

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

        if (elements[i] instanceof HTMLVideoElement) {
          (elements[i] as HTMLVideoElement).pause();
        }
        let mediaTime = (curTime - segment.start + segment.mediaStart) / 1000;

        if (elements[i] instanceof HTMLVideoElement && (elements[i] as HTMLVideoElement).currentTime !== mediaTime) {
          await new Promise<void>((resolve, reject) => {
            (elements[i] as HTMLVideoElement).onseeked = () => resolve();
            (elements[i] as HTMLVideoElement).currentTime = mediaTime;
          });
        }
      }
      try {
        await Promise.allSettled(elements.map((element) => {
          if (element instanceof HTMLVideoElement) {
            element.muted = !audioEnabledRef.current;
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

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const Render = async () => {
    if (isRecordingRef.current) return;

    console.log("Starting full recording...");
    isRecordingRef.current = true;
    recordedChunks = [];

    setCurrentTime(0);
    await new Promise(resolve => setTimeout(resolve, 100));

    const videoStream = props.canvasRef.captureStream(30);
    console.log(`Full render canvas stream created with ${videoStream.getVideoTracks().length} video tracks`);
    
    const ctx = props.canvasRef.getContext('2d');
    const imageData = ctx?.getImageData(0, 0, props.canvasRef.width, props.canvasRef.height);
    const hasContent = imageData && Array.from(imageData.data).some(pixel => pixel !== 0);
    console.log(`Full render canvas has content: ${hasContent}, dimensions: ${props.canvasRef.width}x${props.canvasRef.height}`);
    
    const combinedStream = new MediaStream();
    
    const videoTracks = videoStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.error('No video tracks available from canvas for full render!');
      isRecordingRef.current = false;
      return;
    }
    
    videoTracks.forEach(track => {
      console.log(`Full render adding video track: ${track.id}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
      combinedStream.addTrack(track);
    });
    
    for (const media of mediaListRef.current) {
      if (media && media.sources) {
        for (const source of media.sources) {
          if (source.element instanceof HTMLVideoElement) {
            try {
              const audioVideo = document.createElement('video') as HTMLVideoElement;
              audioVideo.src = (source.element as HTMLVideoElement).src;
              audioVideo.muted = false;
              audioVideo.volume = 1.0;
              
              if (source.element instanceof HTMLVideoElement) {
                audioVideo.currentTime = source.element.currentTime;
              }
              
              await new Promise<void>((resolve) => {
                audioVideo.onloadedmetadata = () => {
                  if (source.element instanceof HTMLVideoElement) {
                    audioVideo.currentTime = source.element.currentTime;
                  }
                  resolve();
                };
              });
              
              const audioStream = (audioVideo as any).captureStream ? 
                (audioVideo as any).captureStream() : 
                null;
                
              if (audioStream) {
                const audioTracks = audioStream.getAudioTracks();
                audioTracks.forEach((track: MediaStreamTrack) => {
                  if (combinedStream.getAudioTracks().length === 0) {
                    combinedStream.addTrack(track);
                    console.log('Audio track added to full render');
                  }
                });
              } else {
                const audioContext = new AudioContext();
                const sourceNode = audioContext.createMediaElementSource(audioVideo);
                const destination = audioContext.createMediaStreamDestination();
                sourceNode.connect(destination);
                
                const audioStreamTracks = destination.stream.getAudioTracks();
                audioStreamTracks.forEach(track => {
                  if (combinedStream.getAudioTracks().length === 0) {
                    combinedStream.addTrack(track);
                    console.log('Audio track added to full render via Web Audio API');
                  }
                });
              }
            } catch (error) {
              console.warn('Could not capture audio from video element:', error);
            }
          }
        }
      }
    }
    
    console.log(`Full render combined stream has ${combinedStream.getVideoTracks().length} video tracks and ${combinedStream.getAudioTracks().length} audio tracks`);

    let mimeType = "video/webm";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
      mimeType = "video/webm;codecs=vp8";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    }
    
    console.log(`Using MIME type for full render: ${mimeType}`);

    const mediaRecorder = new MediaRecorder(combinedStream, { 
      mimeType: mimeType,
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log(`Full render data chunk received: ${event.data.size} bytes`);
      }
    };

    mediaRecorder.onstop = () => {
      console.log(`Full render recording stopped. Total chunks: ${recordedChunks.length}`);
      if (recordedChunks.length === 0) {
        console.error('No data chunks recorded for full render!');
        isRecordingRef.current = false;
        return;
      }
      
      const blob = new Blob(recordedChunks, { type: mimeType });
      console.log(`Full render blob created: ${blob.size} bytes, type: ${blob.type}`);
      
      if (blob.size === 0) {
        console.error('Full render blob is empty!');
        isRecordingRef.current = false;
        return;
      }
      
      download(blob, "test.webm");
      isRecordingRef.current = false;
    };

    mediaRecorder.start(100);
    console.log(`Full render MediaRecorder started with state: ${mediaRecorder.state}`);
    
    play();
  };

  const download = (blob: Blob, filename: string) => {
    console.log(`Starting download: ${filename}, blob size: ${blob.size} bytes`);
    
    if (blob.size === 0) {
      console.error('Cannot download empty blob');
      return;
    }
    
    try {
      const url = URL.createObjectURL(blob);
      console.log(`Blob URL created: ${url}`);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      
      // Aguardar um pouco antes de clicar para garantir que o link esteja pronto
      setTimeout(() => {
        a.click();
        document.body.removeChild(a);
        
        // Aumentar o tempo antes de revogar o URL para evitar ERR_ABORTED
        setTimeout(() => {
          URL.revokeObjectURL(url);
          console.log(`Blob URL revoked: ${url}`);
        }, 5000); // Aumentado de 1000ms para 5000ms
        
        console.log(`Download initiated for: ${filename}`);
      }, 100);
      
    } catch (error) {
      console.error('Error during download:', error);
    }
  };

  const exportSegment = async (segmentStartTime: number, segmentDuration: number, videoNumber: number) => {
    if (isRecordingRef.current) {
      console.log('Recording already in progress, skipping...');
      return;
    }

    console.log(`Starting segment export: ${segmentStartTime}ms for ${segmentDuration}ms`);
    
    // Limpar qualquer MediaRecorder anterior
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      } catch (error) {
        console.warn('Error cleaning up previous MediaRecorder:', error);
      }
    }
    
    isRecordingRef.current = true;
    recordedChunks = [];

    try {
      // Forçar a posição da agulha para o início do segmento
      setCurrentTime(segmentStartTime);
      
      // Aguardar que o setCurrentTime tenha efeito
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Aguardar que todos os vídeos sejam sincronizados na posição correta
      let syncAttempts = 0;
      const maxSyncAttempts = 10;
      
      while (syncAttempts < maxSyncAttempts) {
        await renderFrame(false);
        
        // Verificar se todos os vídeos estão na posição correta
        let allVideosSynced = true;
        for (const media of mediaListRef.current) {
          if (media && media.sources) {
            for (const source of media.sources) {
              if (source.element instanceof HTMLVideoElement) {
                const expectedTime = (segmentStartTime) / 1000;
                const currentVideoTime = source.element.currentTime;
                const timeDiff = Math.abs(currentVideoTime - expectedTime);
                
                if (timeDiff > 0.1) { // Tolerância de 100ms
                  allVideosSynced = false;
                  console.log(`Video not synced yet. Expected: ${expectedTime}s, Current: ${currentVideoTime}s, Diff: ${timeDiff}s`);
                  break;
                }
              }
            }
            if (!allVideosSynced) break;
          }
        }
        
        if (allVideosSynced) {
          console.log(`All videos synced after ${syncAttempts + 1} attempts`);
          break;
        }
        
        syncAttempts++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Aguardar mais um pouco para garantir estabilidade
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const gl = props.canvasRef.getContext('webgl');
      if (!gl) {
        console.error('WebGL context not available!');
        isRecordingRef.current = false;
        return;
      }
      
      let hasActiveSegments = false;
      for (let i = trackListRef.current.length - 1; i >= 0; i--) {
        for (let j = 0; j < trackListRef.current[i].length; j++) {
          const segment = trackListRef.current[i][j];
          if (segmentStartTime >= segment.start && segmentStartTime < segment.start + segment.duration) {
            hasActiveSegments = true;
            console.log(`Found active segment at time ${segmentStartTime}: track ${i}, segment ${j}`);
            break;
          }
        }
        if (hasActiveSegments) break;
      }
      
      if (!hasActiveSegments) {
        console.error(`No active segments found at time ${segmentStartTime}ms! Cannot export segment.`);
        isRecordingRef.current = false;
        return;
      }
      
      const videoStream = props.canvasRef.captureStream(30);
      console.log(`Segment canvas stream created with ${videoStream.getVideoTracks().length} video tracks`);
      
      const combinedStream = new MediaStream();
      
      const videoTracks = videoStream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.error('No video tracks available from canvas for segment export!');
        isRecordingRef.current = false;
        return;
      }
      
      videoTracks.forEach(track => {
        console.log(`Segment adding video track: ${track.id}`);
        combinedStream.addTrack(track);
      });
      
      for (const media of mediaListRef.current) {
        if (media && media.sources) {
          for (const source of media.sources) {
            if (source.element instanceof HTMLVideoElement && !source.element.muted) {
              try {
                const audioStream = (source.element as any).captureStream ? 
                  (source.element as any).captureStream() : null;
                  
                if (audioStream) {
                  const audioTracks = audioStream.getAudioTracks();
                  audioTracks.forEach((track: MediaStreamTrack) => {
                    if (combinedStream.getAudioTracks().length === 0) {
                      combinedStream.addTrack(track);
                      console.log('Audio track added to segment export');
                    }
                  });
                }
              } catch (error) {
                console.warn('Could not capture audio from video element:', error);
              }
            }
          }
        }
      }
      
      console.log(`Segment combined stream has ${combinedStream.getVideoTracks().length} video tracks and ${combinedStream.getAudioTracks().length} audio tracks`);

      let mimeType = "video/webm";
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        mimeType = "video/webm;codecs=vp8";
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeType = "video/mp4";
      }
      
      console.log(`Using MIME type for segment: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(combinedStream, { 
        mimeType: mimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
          console.log(`Segment data chunk received: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log(`Segment recording stopped. Total chunks: ${recordedChunks.length}`);
        if (recordedChunks.length === 0) {
          console.error('No data chunks recorded for segment!');
          isRecordingRef.current = false;
          return;
        }
        
        const blob = new Blob(recordedChunks, { type: mimeType });
        console.log(`Segment blob created: ${blob.size} bytes, type: ${blob.type}`);
        
        if (blob.size === 0) {
          console.error('Segment blob is empty!');
          isRecordingRef.current = false;
          return;
        }
        
        download(blob, `segment_${videoNumber}.webm`);
        isRecordingRef.current = false;
        // Limpar a referência após o download
        if (mediaRecorderRef.current === mediaRecorder) {
          mediaRecorderRef.current = null;
        }
        console.log(`Segment ${videoNumber} exported successfully!`);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error for segment:', event);
        isRecordingRef.current = false;
        // Limpar a referência em caso de erro
        if (mediaRecorderRef.current === mediaRecorder) {
          mediaRecorderRef.current = null;
        }
      };

      mediaRecorder.start(100);
      console.log(`Segment MediaRecorder started with state: ${mediaRecorder.state}`);
      
      // Iniciar a gravação sem chamar play() para evitar que a agulha volte
      setIsPlaying(true);
      isPlayingRef.current = true;
      // Manter a posição atual sem recalcular
      playbackStartTimeRef.current = performance.now();
      lastPlaybackTimeRef.current = segmentStartTime;
      
      // Iniciar o loop de renderização para a gravação
      renderFrame(true);
      
      setTimeout(() => {
        console.log(`Stopping segment recording after ${segmentDuration}ms`);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.stop();
          } catch (error) {
            console.error('Error stopping MediaRecorder:', error);
            isRecordingRef.current = false;
          }
        } else {
          console.warn('MediaRecorder is not in recording state when trying to stop');
          isRecordingRef.current = false;
        }
        pause();
      }, segmentDuration);
      
    } catch (error) {
      console.error('Error during segment export:', error);
      isRecordingRef.current = false;
    }
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
            audioEnabled={audioEnabled}
            toggleAudio={toggleAudio}
          />
        } />
        <Route path="/" element={<Navigate to='/editor' replace />} />
      </Routes>
    </Router>
  );
}

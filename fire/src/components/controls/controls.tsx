import { ChangeEvent } from "react";
import styles from "./controls.module.css";

export default function Controls(
    {
        playVideo,
        pauseVideo,
        isPlaying,
        currentTime,
        projectDuration,
        setCurrentTime,
        splitVideo,
        deleteSelectedSegment,
        setScaleFactor,
        scaleFactor,
        audioEnabled,
        toggleAudio
    }:
        {
            playVideo: any,
            pauseVideo: any,
            isPlaying: boolean,
            currentTime: number,
            projectDuration: number,
            splitVideo: any;
            setCurrentTime: (timestamp: number) => void,
            deleteSelectedSegment: any
            setScaleFactor: (scale: number) => void,
            scaleFactor: number,
            audioEnabled: boolean,
            toggleAudio: () => void
        }
) {
    const togglePlaying = () => {
        if (isPlaying) {
            pauseVideo();
        } else {
            playVideo();
        }
    };

    const increaseScale = () => {
        setScaleFactor(Math.min(1, scaleFactor * 1.2))
    }

    const decreaseScale = () => {
        setScaleFactor(Math.max(0.0001, scaleFactor * 0.8))
    }

    const onSeek = (event: ChangeEvent<HTMLInputElement>) => {
        setCurrentTime(+event.target.value * projectDuration);
    }

    const createSplit = () => {
        // Check if there are needles available
        if ((window as any).timelineActions?.getNeedles) {
            const needles = (window as any).timelineActions.getNeedles();
            if (needles && needles.length > 0) {
                // Cut at all needle positions
                if ((window as any).timelineActions?.cutAtNeedles) {
                    (window as any).timelineActions.cutAtNeedles();
                }
                return;
            }
        }
        
        // Fallback to single split at current time
        splitVideo(currentTime);
    };

    const duplicateNeedle = () => {
        if ((window as any).timelineActions?.duplicateNeedle) {
            (window as any).timelineActions.duplicateNeedle();
        }
    };

    const clearAllNeedles = () => {
        if ((window as any).timelineActions?.clearAllNeedles) {
            (window as any).timelineActions.clearAllNeedles();
        }
    };

    return (
        <div className={styles.container}>
            <button className={styles.button}>
                <span className="material-icons">skip_previous</span>
            </button>
            <button className={styles.button} onClick={togglePlaying} title={isPlaying? "Pause" : "Play"}>
                <span className="material-icons">
                    {isPlaying ? "pause" : "play_arrow"}
                </span>
            </button>
            <button className={styles.button}>
                <span className="material-icons">skip_next</span>
            </button>
            <input
                className={styles.trackbar}
                type="range"
                min="0"
                max="1"
                step={0.001}
                onChange={onSeek}
                value={projectDuration === 0 || !isFinite(currentTime / projectDuration) ? 0 : currentTime / projectDuration}
            ></input>
            <button className={styles.button} onClick={toggleAudio} title={audioEnabled ? "Desativar áudio" : "Ativar áudio"}>
                <span className="material-icons">
                    {audioEnabled ? "volume_up" : "volume_off"}
                </span>
            </button>
            <button className={styles.button} onClick={decreaseScale} title="Zoom out">
                <span className="material-icons">remove</span>
            </button>
            <button className={styles.button} onClick={increaseScale} title="Zoom In">
                <span className="material-icons">add</span>
            </button>
            <button className={styles.button} onClick={createSplit} title="Cortar (nas agulhas se disponíveis)">
                <span className="material-icons">content_cut</span>
            </button>
            <button className={styles.button} onClick={deleteSelectedSegment} title="Delete">
                <span className="material-icons">delete</span>
            </button>
            <button className={styles.button} onClick={duplicateNeedle} title="Duplicar Agulha">
                <span className="material-icons">add_location</span>
            </button>
            <button className={styles.button} onClick={clearAllNeedles} title="Limpar Agulhas">
                <span className="material-icons">clear_all</span>
            </button>
        </div>
    );
}

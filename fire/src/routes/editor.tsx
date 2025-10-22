import styles from "./editor.module.css";
import MediaPool from "../components/mediaPool/mediaPool";
import Controls from "../components/controls/controls";
import MediaPlayer from "../components/mediaPlayer/mediaPlayer";
import Actions from "../components/actions/actions";
import Timeline from "../components/timeline/timeline";
import { Media, Segment, SegmentID } from "../model/types";
import { WebGLRenderer } from "../model/webgl";
import Properties from "../components/elements/properties";
import React, { useState } from "react";
import { DragDropContext } from 'react-beautiful-dnd';

export default function Editor(props: {
  canvasRef: HTMLCanvasElement,
  mediaList: Media[],
  setMediaList: (mediaList: Media[]) => void,
  trackList: Segment[][],
  setTrackList: (segments: Segment[][]) => void,
  addVideo: (file: File[]) => void,
  deleteVideo: (media: Media) => void,
  playVideo: () => void,
  pauseVideo: () => void,
  projectWidth: number,
  projectHeight: number,
  renderer: WebGLRenderer,
  projectFramerate: number,
  projectDuration: number,
  isPlaying: boolean,
  currentTime: number,
  setCurrentTime: (timestamp: number) => void,
  dragAndDrop: (media: Media) => void,
  selectedSegment: SegmentID | null,
  setSelectedSegment: (selected: SegmentID | null) => void,
  updateSegment: (id: SegmentID, segment: Segment) => void,
  splitVideo: (timestamp: number) => void,
  splitAtMultiplePositions: (timestamps: number[]) => void,
  deleteSelectedSegment: () => void,
  projectId: string,
  setProjectId: (id: string) => void,
  projectUser: string,
  setProjectUser: (user:string) => void,
}) {
  const [scaleFactor, setScaleFactor] = useState<number>(0.1);
  const [needles, setNeedles] = useState<number[]>([]);

  const handleOnDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // for re-ordering files in the media pool
    if (source.droppableId === destination.droppableId) {
      const items = props.mediaList.slice();
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      props.setMediaList(items);
    }
    else {
      // Check if we're dragging an original media file or a segment
      if (result.source.index < props.mediaList.length) {
        // It's an original media file
        props.dragAndDrop(props.mediaList[result.source.index]);
      } else {
        // It's a segment - find the segment in trackList
        const segmentIndex = result.source.index - props.mediaList.length;
        let currentIndex = 0;
        let foundSegment = null;
        
        for (const track of props.trackList) {
          for (const segment of track) {
            if (currentIndex === segmentIndex) {
              foundSegment = segment;
              break;
            }
            currentIndex++;
          }
          if (foundSegment) break;
        }
        
        if (foundSegment) {
          // For segments, we use the media from the segment
          props.dragAndDrop(foundSegment.media);
        }
      }
      const items = props.mediaList.slice();
      props.setMediaList(items);
    }
  }

  const cutAtNeedles = () => {
    // Use the new splitAtMultiplePositions function instead of multiple splitVideo calls
    if (needles.length > 0) {
      props.splitAtMultiplePositions(needles);
      // Clear needles after cutting
      setNeedles([]);
    }
  };

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <div className={styles.container}>
        <MediaPool
          mediaList={props.mediaList}
          setMediaList={props.setMediaList}
          addVideo={props.addVideo}
          deleteVideo={props.deleteVideo}
          dragAndDrop={props.dragAndDrop}
          projectDuration={props.projectDuration}
          trackList={props.trackList}
        />
        <MediaPlayer
          canvasRef={props.canvasRef}
          projectWidth={props.projectWidth}
          projectHeight={props.projectHeight}
        />
        <Controls
          playVideo={props.playVideo}
          pauseVideo={props.pauseVideo}
          isPlaying={props.isPlaying}
          currentTime={props.currentTime}
          projectDuration={props.projectDuration}
          setCurrentTime={props.setCurrentTime}
          deleteSelectedSegment={props.deleteSelectedSegment}
          splitVideo={props.splitVideo}
          setScaleFactor={setScaleFactor}
          scaleFactor={scaleFactor}
        />
        <Properties
          trackList={props.trackList}
          selectedSegment={props.selectedSegment}
          currentTime={props.currentTime}
          setCurrentTime={props.setCurrentTime}
          updateSegment={props.updateSegment}
        />
        <Timeline
          trackList={props.trackList}
          projectDuration={props.projectDuration}
          selectedSegment={props.selectedSegment}
          setSelectedSegment={props.setSelectedSegment}
          currentTime={props.currentTime}
          setCurrentTime={props.setCurrentTime}
          updateSegment={props.updateSegment}
          scaleFactor={scaleFactor}
          setTrackList={props.setTrackList}
          needles={needles}
          setNeedles={setNeedles}
          onCutAtNeedles={cutAtNeedles}
        />
        <Actions
          projectId={props.projectId}
          projectUser={props.projectUser}
          mediaList={props.mediaList}
          trackList={props.trackList}
          setProjectUser={props.setProjectUser}
        />
      </div>
    </DragDropContext>
  );
}

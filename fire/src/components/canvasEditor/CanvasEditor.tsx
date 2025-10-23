import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './CanvasEditor.module.css';
import { Segment, SegmentID } from '../../model/types';
import { calculateProperties } from '../../utils/utils';

interface CanvasEditorProps {
  canvasRef: HTMLCanvasElement;
  projectWidth: number;
  projectHeight: number;
  trackList: Segment[][];
  selectedSegment: SegmentID | null;
  updateSegment: (id: SegmentID, segment: Segment) => void;
  currentTime: number;
}

interface DragState {
  isDragging: boolean;
  dragType: 'move' | 'scale' | 'rotate' | null;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialScaleX: number;
  initialScaleY: number;
  initialRotation: number;
}

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export default function CanvasEditor({
  canvasRef,
  projectWidth,
  projectHeight,
  trackList,
  selectedSegment,
  updateSegment,
  currentTime
}: CanvasEditorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialScaleX: 1,
    initialScaleY: 1,
    initialRotation: 0
  });
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const segment = selectedSegment ? trackList[selectedSegment.track][selectedSegment.index] : null;
  const currentProperties = segment ? calculateProperties(segment, currentTime) : null;

  // Update selection box when segment or properties change
  useEffect(() => {
    if (!segment || !currentProperties) {
      setSelectionBox(null);
      return;
    }

    const canvasRect = canvasRef.getBoundingClientRect();
    const scaleX = canvasRect.width / projectWidth;
    const scaleY = canvasRect.height / projectHeight;

    // Calculate element dimensions based on media type
    let elementWidth = projectWidth;
    let elementHeight = projectHeight;
    
    if (segment.media.sources[0]?.element) {
      const element = segment.media.sources[0].element;
      if (element instanceof HTMLVideoElement || element instanceof HTMLImageElement) {
        elementWidth = element.videoWidth || element.naturalWidth || projectWidth;
        elementHeight = element.videoHeight || element.naturalHeight || projectHeight;
      }
    }

    // Apply scaling
    const scaledWidth = elementWidth * (currentProperties.scaleX || 1) * scaleX;
    const scaledHeight = elementHeight * (currentProperties.scaleY || 1) * scaleY;

    // Calculate position (center-based)
    const centerX = (canvasRect.width / 2) + ((currentProperties.x || 0) * scaleX);
    const centerY = (canvasRect.height / 2) + ((currentProperties.y || 0) * scaleY);

    setSelectionBox({
      x: centerX - scaledWidth / 2,
      y: centerY - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
      rotation: currentProperties.rotation || 0
    });
  }, [segment, currentProperties, canvasRef, projectWidth, projectHeight]);

  const getMousePosition = useCallback((event: React.MouseEvent) => {
    const canvasRect = canvasRef.getBoundingClientRect();
    return {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top
    };
  }, [canvasRef]);

  const updateSegmentProperty = useCallback((property: string, value: number) => {
    if (!selectedSegment || !segment) return;

    // Find or create keyframe at current time
    let keyframeIndex = -1;
    for (let i = 0; i < segment.keyframes.length; i++) {
      if (segment.keyframes[i].start + segment.start === currentTime) {
        keyframeIndex = i;
        break;
      }
    }

    if (keyframeIndex === -1) {
      // Create new keyframe
      const newKeyframe = {
        start: currentTime - segment.start,
        [property]: value
      };
      
      // Find insertion position
      let insertPos = segment.keyframes.length;
      for (let i = 0; i < segment.keyframes.length; i++) {
        if (segment.keyframes[i].start + segment.start >= currentTime) {
          insertPos = i;
          break;
        }
      }

      const newKeyframes = [
        ...segment.keyframes.slice(0, insertPos),
        newKeyframe,
        ...segment.keyframes.slice(insertPos)
      ];

      updateSegment(selectedSegment, {
        ...segment,
        keyframes: newKeyframes
      });
    } else {
      // Update existing keyframe
      const updatedKeyframes = [...segment.keyframes];
      updatedKeyframes[keyframeIndex] = {
        ...updatedKeyframes[keyframeIndex],
        [property]: value
      };

      updateSegment(selectedSegment, {
        ...segment,
        keyframes: updatedKeyframes
      });
    }
  }, [selectedSegment, segment, currentTime, updateSegment]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!selectionBox || !currentProperties) return;

    const mousePos = getMousePosition(event);
    const { x, y, width, height } = selectionBox;

    // Check if clicking on resize handles
    const handleSize = 8;
    const handles = [
      { x: x - handleSize/2, y: y - handleSize/2, type: 'scale' }, // top-left
      { x: x + width - handleSize/2, y: y - handleSize/2, type: 'scale' }, // top-right
      { x: x - handleSize/2, y: y + height - handleSize/2, type: 'scale' }, // bottom-left
      { x: x + width - handleSize/2, y: y + height - handleSize/2, type: 'scale' }, // bottom-right
      { x: x + width/2 - handleSize/2, y: y - 20, type: 'rotate' }, // rotation handle
    ];

    let dragType: 'move' | 'scale' | 'rotate' | null = null;
    
    for (const handle of handles) {
      if (mousePos.x >= handle.x && mousePos.x <= handle.x + handleSize &&
          mousePos.y >= handle.y && mousePos.y <= handle.y + handleSize) {
        dragType = handle.type as 'scale' | 'rotate';
        break;
      }
    }

    // If not on a handle, check if inside selection box for moving
    if (!dragType) {
      if (mousePos.x >= x && mousePos.x <= x + width &&
          mousePos.y >= y && mousePos.y <= y + height) {
        dragType = 'move';
      }
    }

    if (dragType) {
      setDragState({
        isDragging: true,
        dragType,
        startX: mousePos.x,
        startY: mousePos.y,
        initialX: currentProperties.x || 0,
        initialY: currentProperties.y || 0,
        initialScaleX: currentProperties.scaleX || 1,
        initialScaleY: currentProperties.scaleY || 1,
        initialRotation: currentProperties.rotation || 0
      });
    }
  }, [selectionBox, currentProperties, getMousePosition]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!dragState.isDragging || !currentProperties) return;

    const mousePos = getMousePosition(event);
    const deltaX = mousePos.x - dragState.startX;
    const deltaY = mousePos.y - dragState.startY;

    const canvasRect = canvasRef.getBoundingClientRect();
    const scaleX = canvasRect.width / projectWidth;
    const scaleY = canvasRect.height / projectHeight;

    switch (dragState.dragType) {
      case 'move':
        updateSegmentProperty('x', dragState.initialX + deltaX / scaleX);
        updateSegmentProperty('y', dragState.initialY + deltaY / scaleY);
        break;
      
      case 'scale':
        // Calculate scale based on distance from center
        if (selectionBox) {
          const centerX = selectionBox.x + selectionBox.width / 2;
          const centerY = selectionBox.y + selectionBox.height / 2;
          
          const initialDistance = Math.sqrt(
            Math.pow(dragState.startX - centerX, 2) + 
            Math.pow(dragState.startY - centerY, 2)
          );
          
          const currentDistance = Math.sqrt(
            Math.pow(mousePos.x - centerX, 2) + 
            Math.pow(mousePos.y - centerY, 2)
          );
          
          if (initialDistance > 0) {
            const scaleFactor = currentDistance / initialDistance;
            // Maintain aspect ratio by using the same scale for both X and Y
            const newScale = Math.max(0.1, dragState.initialScaleX * scaleFactor);
            updateSegmentProperty('scaleX', newScale);
            updateSegmentProperty('scaleY', newScale);
          }
        }
        break;
      
      case 'rotate':
        if (selectionBox) {
          const centerX = selectionBox.x + selectionBox.width / 2;
          const centerY = selectionBox.y + selectionBox.height / 2;
          const angle = Math.atan2(mousePos.y - centerY, mousePos.x - centerX) * 180 / Math.PI;
          updateSegmentProperty('rotation', angle);
        }
        break;
    }
  }, [dragState, currentProperties, getMousePosition, canvasRef, projectWidth, projectHeight, updateSegmentProperty, selectionBox]);

  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false, dragType: null }));
  }, []);

  // Position overlay to match canvas
  useEffect(() => {
    if (!overlayRef.current) return;

    const canvasRect = canvasRef.getBoundingClientRect();
    const overlay = overlayRef.current;
    
    overlay.style.position = 'absolute';
    overlay.style.left = `${canvasRect.left}px`;
    overlay.style.top = `${canvasRect.top}px`;
    overlay.style.width = `${canvasRect.width}px`;
    overlay.style.height = `${canvasRect.height}px`;
    overlay.style.pointerEvents = selectedSegment ? 'auto' : 'none';
  }, [canvasRef, selectedSegment]);

  return (
    <div
      ref={overlayRef}
      className={styles.canvasOverlay}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {selectionBox && selectedSegment && (
        <div
          className={styles.selectionBox}
          style={{
            left: `${selectionBox.x}px`,
            top: `${selectionBox.y}px`,
            width: `${selectionBox.width}px`,
            height: `${selectionBox.height}px`,
            transform: `rotate(${selectionBox.rotation}deg)`,
          }}
        >
          {/* Resize handles */}
          <div className={`${styles.handle} ${styles.topLeft}`} />
          <div className={`${styles.handle} ${styles.topRight}`} />
          <div className={`${styles.handle} ${styles.bottomLeft}`} />
          <div className={`${styles.handle} ${styles.bottomRight}`} />
          
          {/* Rotation handle */}
          <div className={`${styles.handle} ${styles.rotateHandle}`}>
            <div className={styles.rotateLine} />
          </div>
        </div>
      )}
    </div>
  );
}
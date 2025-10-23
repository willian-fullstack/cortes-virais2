import styles from "./properties.module.css";
import { useEffect, useState } from "react";
import { Segment, SegmentID } from "../../model/types";
import { calculateProperties } from "../../utils/utils";

export default function Properties({
  trackList,
  selectedSegment,
  updateSegment,
  currentTime,
  setCurrentTime,
}: {
  currentTime: number;
  trackList: Segment[][];
  selectedSegment: SegmentID | null;
  updateSegment: (id: SegmentID, segment: Segment) => void;
  setCurrentTime: (timestamp: number) => void;
}) {
  const segment = !selectedSegment ? null : trackList[selectedSegment.track][selectedSegment.index];
  const currKeyframe = calculateProperties(segment, currentTime);

  // maintain state for keyframe buttons
  const [posState, setPositionState] = useState<boolean>(false);
  const [cropState, setCropState] = useState<boolean>(false);
  const [scaleState, setScaleState] = useState<boolean>(false);
  const [rotationState, setRotationState] = useState<boolean>(false);
  const [opacityState, setOpacityState] = useState<boolean>(false);
  const [proportionalScale, setProportionalScale] = useState<boolean>(true);

  const checkKeyframeExists = (): number | false => {
    if (!segment) return false;

    for (let i = 0; i < segment.keyframes.length; i++) {
      if (segment.keyframes[i].start + segment.start === currentTime) {
        return i; // return index of keyframe if it exists
      }
    }
    return false;
  };

  useEffect(() => {
    const checkPropState = (property: string): boolean => {
      let currKeyframeIndex = checkKeyframeExists();
      if (currKeyframeIndex === false) return false;
      if (!segment) return false;

      if (property === "position") {
        if (
          segment.keyframes[currKeyframeIndex].x !== undefined ||
          segment.keyframes[currKeyframeIndex].y !== undefined
        )
          return true;
      } else if (property === "scale") {
        if (
          segment.keyframes[currKeyframeIndex].scaleX !== undefined ||
          segment.keyframes[currKeyframeIndex].scaleY !== undefined
        )
          return true;
      } else if (property === "crop") {
        if (
          segment.keyframes[currKeyframeIndex].trimBottom !== undefined ||
          segment.keyframes[currKeyframeIndex].trimTop !== undefined ||
          segment.keyframes[currKeyframeIndex].trimLeft !== undefined ||
          segment.keyframes[currKeyframeIndex].trimRight !== undefined
        )
          return true;
      } else if (property === "rotation") {
        if (segment.keyframes[currKeyframeIndex].rotation !== undefined)
          return true;
      } else if (property === "opacity") {
        if (segment.keyframes[currKeyframeIndex].opacity !== undefined)
          return true;
      }
      return false;
    };

    setPositionState(checkPropState("position"));
    setCropState(checkPropState("crop"));
    setScaleState(checkPropState("scale"));
    setRotationState(checkPropState("rotation"));
    setOpacityState(checkPropState("opacity"));
  }, [selectedSegment, currentTime]);

  const _updateSegment = (args: any, property?: "position" | "scale" | "crop", isButtonPressed?: boolean) => {
    if (!segment || !selectedSegment) return false;

    let insertPos = null;
    for (let i = 0; i < segment.keyframes.length; i++) {
      if (segment.keyframes[i].start + segment.start >= currentTime) {
        insertPos = i;
        break;
      }
    }

    if (insertPos === null) insertPos = segment.keyframes.length;

    let currKeyframeIndex = checkKeyframeExists();

    if (segment.keyframes.length === 1 && isButtonPressed === undefined) {
      currKeyframeIndex = 0;
    }

    if(segment.keyframes.length > 1 && property === "position")setPositionState(true);
    else if(segment.keyframes.length > 1 && property === "scale")setScaleState(true);
    else if(segment.keyframes.length > 1 && property === "crop")setCropState(true);

    if (currKeyframeIndex !== false) {
      let updatedKeyframe = {
        ...segment.keyframes[currKeyframeIndex],
        ...args,
      };

      let toDelete = true;
      for (const [key, value] of Object.entries(updatedKeyframe)) {
        if (key !== "start" && value !== undefined) {
          toDelete = false;
          break;
        }
      }

      if (toDelete) {
        // if user has unset all properties for current keyframe.
        updateSegment(selectedSegment, {
          ...segment,
          keyframes: [
            ...segment.keyframes.slice(0, currKeyframeIndex),
            ...segment.keyframes.slice(currKeyframeIndex + 1),
          ],
        });
      } else {
        updateSegment(selectedSegment, {
          ...segment,
          keyframes: [
            ...segment.keyframes.slice(0, currKeyframeIndex),
            updatedKeyframe,
            ...segment.keyframes.slice(currKeyframeIndex + 1),
          ],
        });
      }
    } else {
      // If no keyframe exists at currentTime
      updateSegment(selectedSegment, {
        ...segment,
        keyframes: [
          ...segment.keyframes.slice(0, insertPos),
          {
            start: currentTime - segment.start,
            x: args.x,
            y: args.y,
            scaleX: args.scaleX,
            scaleY: args.scaleY,
            trimLeft: args.trimLeft,
            trimRight: args.trimRight,
            trimTop: args.trimTop,
            trimBottom: args.trimBottom,
            rotation: args.rotation,
            opacity: args.opacity,
          },
          ...segment.keyframes.slice(insertPos),
        ],
      });
    }
  };

  const findNextSetKeyframe = (property: "position" | "scale" | "crop" | "rotation" | "opacity") => {
    if (!segment) return null;

    for (let i = 0; i < segment.keyframes.length; i++) {
      //@ts-ignore
      if (segment.start + segment.keyframes[i].start > currentTime) {
        if (property === "position") {
          if (
            segment.keyframes[i].x !== undefined ||
            segment.keyframes[i].y !== undefined
          )
            return i;
        } else if (property === "scale") {
          if (
            segment.keyframes[i].scaleX !== undefined ||
            segment.keyframes[i].scaleY !== undefined
          )
            return i;
        } else if (property === "crop") {
          if (
            segment.keyframes[i].trimBottom !== undefined ||
            segment.keyframes[i].trimTop !== undefined ||
            segment.keyframes[i].trimLeft !== undefined ||
            segment.keyframes[i].trimRight !== undefined
          )
            return i;
        } else if (property === "rotation") {
          if (segment.keyframes[i].rotation !== undefined)
            return i;
        } else if (property === "opacity") {
          if (segment.keyframes[i].opacity !== undefined)
            return i;
        } else if (property === "rotation") {
          if (segment.keyframes[i].rotation !== undefined)
            return i;
        } else if (property === "opacity") {
          if (segment.keyframes[i].opacity !== undefined)
            return i;
        }
      }
    }
    return null;
  };

  const findPrevSetKeyframe = (property: "position" | "scale" | "crop" | "rotation" | "opacity") => {
    if (!segment) return null;

    for (let i = segment.keyframes.length - 1; i >= 0; i--) {
      //@ts-ignore
      if (segment.start + segment.keyframes[i].start < currentTime) {
        if (property === "position") {
          if (
            segment.keyframes[i].x !== undefined ||
            segment.keyframes[i].y !== undefined
          )
            return i;
        } else if (property === "scale") {
          if (
            segment.keyframes[i].scaleX !== undefined ||
            segment.keyframes[i].scaleY !== undefined
          )
            return i;
        } else if (property === "crop") {
          if (
            segment.keyframes[i].trimBottom !== undefined ||
            segment.keyframes[i].trimTop !== undefined ||
            segment.keyframes[i].trimLeft !== undefined ||
            segment.keyframes[i].trimRight !== undefined
          )
            return i;
        }
      }
    }
    return null; // if no previous keyframe exists with the given property set
  };

  return (
    <fieldset className={`${styles.container} ${selectedSegment ? styles.slideIn : ""}`} disabled={selectedSegment === null}>
      <h2 className={styles.title}>Effects</h2>
      <label className={styles.tags}>
        Position
        <button
          className={styles.keyframeNext}
          onClick={() => {
            if (!segment) return;

            let nextKeyframeIndex = findNextSetKeyframe("position");
            setCurrentTime(
              nextKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[nextKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_right</span>
        </button>
        <button
          className={styles.keyframeBtn}
          onClick={(event) => {
            event.stopPropagation();
            if (currentTime === 0) return;
            if (!posState) {
              _updateSegment({ x: currKeyframe.x, y: currKeyframe.y }, undefined, true);
            } else {
              _updateSegment({ x: undefined, y: undefined }, undefined, true);
            }
            setPositionState(!posState);
          }}
        >
          <span
            className="material-icons"
            style={{ color: posState ? "red" : "rgb(102, 102, 102)" }}
          >
            circle
          </span>
        </button>
        <button
          className={styles.keyframePrev}
          onClick={() => {
            if (!segment) return;

            let prevKeyframeIndex = findPrevSetKeyframe("position");
            setCurrentTime(
              prevKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[prevKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_left</span>
        </button>
      </label>
      <span className={styles.effectBox}>
        <label className={styles.tag}>X </label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ x: (currKeyframe.x ?? 0) - 10 }, "position")}
            onMouseDown={(e) => {
              e.preventDefault();
              let startX = e.clientX;
              let startValue = currKeyframe.x ?? 0;
              let isDragging = false;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging && Math.abs(e.clientX - startX) > 3) {
                  isDragging = true;
                }
                if (isDragging) {
                  const deltaX = e.clientX - startX;
                  const newValue = startValue - deltaX;
                  _updateSegment({ x: Math.round(newValue) }, "position");
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >-</button>
          <input
            name="X"
            className={styles.inputTag}
            type="number"
            step="10"
            onChange={event => _updateSegment({ x: +event.target.value }, "position")}
            value={isFinite(currKeyframe.x) ? currKeyframe.x : 0}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ x: (currKeyframe.x ?? 0) + 10 }, "position")}
            onMouseDown={(e) => {
              e.preventDefault();
              let startX = e.clientX;
              let startValue = currKeyframe.x ?? 0;
              let isDragging = false;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging && Math.abs(e.clientX - startX) > 3) {
                  isDragging = true;
                }
                if (isDragging) {
                  const deltaX = e.clientX - startX;
                  const newValue = startValue + deltaX;
                  _updateSegment({ x: Math.round(newValue) }, "position");
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >+</button>
        </div>
      </span>
      <span className={styles.effectBox}>
        <label className={styles.tag}>Y </label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ y: (currKeyframe.y ?? 0) - 10 }, "position")}
            onMouseDown={(e) => {
              e.preventDefault();
              let startY = e.clientY;
              let startValue = currKeyframe.y ?? 0;
              let isDragging = false;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging && Math.abs(e.clientY - startY) > 3) {
                  isDragging = true;
                }
                if (isDragging) {
                  const deltaY = e.clientY - startY;
                  const newValue = startValue + deltaY;
                  _updateSegment({ y: Math.round(newValue) }, "position");
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >-</button>
          <input
            name="Y"
            className={styles.inputTag}
            type="number"
            step="10"
            onChange={event => _updateSegment({ y: +event.target.value }, "position")}
            value={isFinite(currKeyframe.y) ? currKeyframe.y : 0}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ y: (currKeyframe.y ?? 0) + 10 }, "position")}
            onMouseDown={(e) => {
              e.preventDefault();
              let startY = e.clientY;
              let startValue = currKeyframe.y ?? 0;
              let isDragging = false;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging && Math.abs(e.clientY - startY) > 3) {
                  isDragging = true;
                }
                if (isDragging) {
                  const deltaY = e.clientY - startY;
                  const newValue = startValue - deltaY;
                  _updateSegment({ y: Math.round(newValue) }, "position");
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >+</button>
        </div>
      </span>

      <label className={styles.tags}>
        Scale
        <button
          className={styles.keyframeNext}
          onClick={() => {
            if (!segment) return;

            let nextKeyframeIndex = findNextSetKeyframe("scale");
            setCurrentTime(
              nextKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[nextKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_right</span>
        </button>
        <button
          className={styles.keyframeBtn}
          onClick={(event) => {
            event.stopPropagation();
            if (currentTime === 0) return;
            if (!scaleState) {
              setScaleState(!scaleState);
              _updateSegment({
                scaleX: currKeyframe.scaleX,
                scaleY: currKeyframe.scaleY,
              }, undefined, true);
            } else {
              setScaleState(!scaleState);
              _updateSegment({ scaleX: undefined, scaleY: undefined }, undefined, true);
            }

          }}
        >
          <span
            className="material-icons"
            style={{ color: scaleState ? "red" : "rgb(102, 102, 102)" }}
          >
            circle
          </span>
        </button>
        <button
          className={styles.keyframePrev}
          onClick={() => {
            if (!segment) return;

            let prevKeyframeIndex = findPrevSetKeyframe("scale");
            setCurrentTime(
              prevKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[prevKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_left</span>
        </button>
        <button
          className={styles.inputBtn}
          onClick={() => setProportionalScale(!proportionalScale)}
          style={{ 
            backgroundColor: proportionalScale ? "#4CAF50" : "#666",
            marginLeft: "10px",
            fontSize: "12px"
          }}
        >
          🔗
        </button>
      </label>
      <span className={styles.effectBox}>
        <label className={styles.tag}>X </label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => {
              const newValue = Math.max(+((currKeyframe.scaleX ?? 1) - 0.1).toFixed(2), 0);
              if (proportionalScale) {
                _updateSegment({ scaleX: newValue, scaleY: newValue }, "scale");
              } else {
                _updateSegment({ scaleX: newValue }, "scale");
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              let startX = e.clientX;
              let startValueX = currKeyframe.scaleX ?? 1;
              let startValueY = currKeyframe.scaleY ?? 1;
              let isDragging = false;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging && Math.abs(e.clientX - startX) > 3) {
                  isDragging = true;
                }
                if (isDragging) {
                  const deltaX = (e.clientX - startX) * 0.01;
                  const newValueX = Math.max(startValueX - deltaX, 0);
                  if (proportionalScale) {
                    _updateSegment({ 
                      scaleX: Math.round(newValueX * 100) / 100, 
                      scaleY: Math.round(newValueX * 100) / 100 
                    }, "scale");
                  } else {
                    _updateSegment({ scaleX: Math.round(newValueX * 100) / 100 }, "scale");
                  }
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >-</button>
          <input
            name="height"
            className={styles.inputTag}
            type="number"
            step="0.1"
            min="0.0"
            onChange={(event) => _updateSegment({ scaleX: +event.target.value }, "scale")}
            value={isFinite(currKeyframe.scaleX) ? currKeyframe.scaleX : 1}
          />
          <button
            className={styles.inputBtn}
            onClick={() => {
              const newValue = +((currKeyframe.scaleX ?? 1) + 0.1).toFixed(2);
              if (proportionalScale) {
                _updateSegment({ scaleX: newValue, scaleY: newValue }, "scale");
              } else {
                _updateSegment({ scaleX: newValue }, "scale");
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              let startX = e.clientX;
              let startValueX = currKeyframe.scaleX ?? 1;
              let startValueY = currKeyframe.scaleY ?? 1;
              let isDragging = false;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging && Math.abs(e.clientX - startX) > 3) {
                  isDragging = true;
                }
                if (isDragging) {
                  const deltaX = (e.clientX - startX) * 0.01;
                  const newValueX = Math.max(startValueX + deltaX, 0);
                  if (proportionalScale) {
                    _updateSegment({ 
                      scaleX: Math.round(newValueX * 100) / 100, 
                      scaleY: Math.round(newValueX * 100) / 100 
                    }, "scale");
                  } else {
                    _updateSegment({ scaleX: Math.round(newValueX * 100) / 100 }, "scale");
                  }
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >+</button>
        </div>
      </span>
      <span className={styles.effectBox}>
        <label className={styles.tag}>Y </label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ scaleY: Math.max(+((currKeyframe.scaleY ?? 0) - 0.1).toFixed(2), 0) }, "scale")}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startValueY = currKeyframe.scaleY ?? 1;
              let isDragging = false;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging && Math.abs(e.clientX - startX) > 3) {
                  isDragging = true;
                }
                if (isDragging) {
                  const deltaX = (e.clientX - startX) * 0.01;
                  const newValueY = Math.max(startValueY - deltaX, 0);
                  if (proportionalScale) {
                    _updateSegment({ 
                      scaleX: Math.round(newValueY * 100) / 100, 
                      scaleY: Math.round(newValueY * 100) / 100 
                    }, "scale");
                  } else {
                    _updateSegment({ scaleY: Math.round(newValueY * 100) / 100 }, "scale");
                  }
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >-</button>
          <input
            name="width"
            className={styles.inputTag}
            type="number"
            step="0.1"
            min="0.0"
            onChange={event => _updateSegment({ scaleY: +event.target.value }, "scale")}
            value={isFinite(currKeyframe.scaleY) ? currKeyframe.scaleY : 1}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ scaleY: +((currKeyframe.scaleY ?? 0) + 0.1).toFixed(2) }, "scale")}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startValueY = currKeyframe.scaleY ?? 1;
              let isDragging = false;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging && Math.abs(e.clientX - startX) > 3) {
                  isDragging = true;
                }
                if (isDragging) {
                  const deltaX = (e.clientX - startX) * 0.01;
                  const newValueY = Math.max(startValueY + deltaX, 0);
                  if (proportionalScale) {
                    _updateSegment({ 
                      scaleX: Math.round(newValueY * 100) / 100, 
                      scaleY: Math.round(newValueY * 100) / 100 
                    }, "scale");
                  } else {
                    _updateSegment({ scaleY: Math.round(newValueY * 100) / 100 }, "scale");
                  }
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >+</button>
        </div>
      </span>

      <label className={styles.tags}>
        Crop
        <button
          className={styles.keyframeNext}
          onClick={() => {
            if (!segment) return;

            let nextKeyframeIndex = findNextSetKeyframe("crop");
            setCurrentTime(
              nextKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[nextKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_right</span>
        </button>
        <button
          className={styles.keyframeBtn}
          onClick={(event) => {
            event.stopPropagation();
            if (currentTime === 0) return;

            if (!cropState) {
              _updateSegment({
                trimLeft: currKeyframe.trimLeft,
                trimRight: currKeyframe.trimRight,
                trimTop: currKeyframe.trimTop,
                trimBottom: currKeyframe.trimBottom,
              }, undefined, true);
            } else {
              _updateSegment({
                trimLeft: undefined,
                trimRight: undefined,
                trimTop: undefined,
                trimBottom: undefined,
              }, undefined, true);
            }
            setCropState(!cropState);
          }}
        >
          <span
            className="material-icons"
            style={{ color: cropState ? "red" : "rgb(102, 102, 102)" }}
          >
            circle
          </span>
        </button>
        <button
          className={styles.keyframePrev}
          onClick={() => {
            if (!segment) return;

            let prevKeyframeIndex = findPrevSetKeyframe("crop");
            setCurrentTime(
              prevKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[prevKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_left</span>
        </button>
      </label>
      <span className={styles.effectBox}>
        <label className={styles.tag}>Left</label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ trimLeft: Math.max(+((currKeyframe.trimLeft ?? 0) - 0.1).toFixed(2), 0) }, "crop")}
            onMouseDown={(e) => {
              e.preventDefault();
              const startValue = currKeyframe.trimLeft ?? 0;
              let isDragging = true;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging) return;
                const deltaX = e.movementX;
                const newValue = Math.max(0, Math.min(1, startValue - deltaX * 0.01));
                _updateSegment({ trimLeft: +newValue.toFixed(2) }, "crop");
              };
              
              const handleMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >-</button>
          <input
            name="Left"
            className={styles.inputTag}
            type="number"
            step="0.1"
            min="0"
            max="1.0"
            onChange={(event) => _updateSegment({ trimLeft: +event.target.value },"crop")}
            value={isFinite(currKeyframe.trimLeft) ? currKeyframe.trimLeft : 0}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ trimLeft: Math.min(+((currKeyframe.trimLeft ?? 0) + 0.1).toFixed(2), 1) }, "crop")}
            onMouseDown={(e) => {
              e.preventDefault();
              const startValue = currKeyframe.trimLeft ?? 0;
              let isDragging = true;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging) return;
                const deltaX = e.movementX;
                const newValue = Math.max(0, Math.min(1, startValue + deltaX * 0.01));
                _updateSegment({ trimLeft: +newValue.toFixed(2) }, "crop");
              };
              
              const handleMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >+</button>
        </div>
      </span>
      <span className={styles.effectBox}>
        <label className={styles.tag}>Right</label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ trimRight: Math.max(+((currKeyframe.trimRight ?? 0) - 0.1).toFixed(2), 0) }, "crop")}
          >-</button>
          <input
            name="Right"
            className={styles.inputTag}
            type="number"
            step="0.1"
            min="0"
            max="1.0"
            onChange={event => _updateSegment({ trimRight: +event.target.value }, "crop")}
            value={isFinite(currKeyframe.trimRight) ? currKeyframe.trimRight : 0}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ trimRight: Math.min(+((currKeyframe.trimRight ?? 0) + 0.1).toFixed(2), 1) }, "crop")}
          >+</button>
        </div>
      </span>
      <span className={styles.effectBox}>
        <label className={styles.tag}>Top</label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ trimTop: Math.max(+((currKeyframe.trimTop ?? 0) - 0.1).toFixed(2), 0) }, "crop")}
          >-</button>
          <input
            name="Top"
            className={styles.inputTag}
            type="number"
            step="0.1"
            min="0"
            max="1.0"
            onChange={event => _updateSegment({ trimTop: +event.target.value })}
            value={isFinite(currKeyframe.trimTop) ? currKeyframe.trimTop : 0}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ trimTop: Math.min(+((currKeyframe.trimTop ?? 0) + 0.1).toFixed(2), 1) }, "crop")}
          >+</button>
        </div>
      </span>
      <span className={styles.effectBox}>
        <label className={styles.tag}>Bottom</label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ trimBottom: Math.max(+((currKeyframe.trimBottom ?? 0) - 0.1).toFixed(2), 0) }, "crop")}
          >-</button>
          <input
            name="Bottom"
            className={styles.inputTag}
            type="number"
            step="0.1"
            min="0"
            max="1.0"
            onChange={event => _updateSegment({ trimBottom: +event.target.value })}
            value={isFinite(currKeyframe.trimBottom) ? currKeyframe.trimBottom : 0}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ trimBottom: Math.min(+((currKeyframe.trimBottom ?? 0) + 0.1).toFixed(2), 1) }, "crop")}
          >+</button>
        </div>
      </span>
      
      {/* Rotation Controls */}
      <label className={styles.tags}>
        Rotation
        <button
          className={styles.keyframeNext}
          onClick={() => {
            if (!segment) return;

            let nextKeyframeIndex = findNextSetKeyframe("rotation");
            setCurrentTime(
              nextKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[nextKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_right</span>
        </button>
        <button
          className={styles.keyframeBtn}
          onClick={(event) => {
            event.stopPropagation();
            if (currentTime === 0) return;
            if (!rotationState) {
              _updateSegment({ rotation: currKeyframe.rotation ?? 0 }, undefined, true);
            } else {
              _updateSegment({ rotation: undefined }, undefined, true);
            }
            setRotationState(!rotationState);
          }}
        >
          <span
            className="material-icons"
            style={{ color: rotationState ? "red" : "rgb(102, 102, 102)" }}
          >
            circle
          </span>
        </button>
        <button
          className={styles.keyframePrev}
          onClick={() => {
            if (!segment) return;

            let prevKeyframeIndex = findPrevSetKeyframe("rotation");
            setCurrentTime(
              prevKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[prevKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_left</span>
        </button>
      </label>
      <span className={styles.effectBox}>
        <label className={styles.tag}>Angle</label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ rotation: (currKeyframe.rotation ?? 0) - 15 }, "rotation")}
          >-</button>
          <input
            name="Rotation"
            className={styles.inputTag}
            type="number"
            step="15"
            onChange={event => _updateSegment({ rotation: +event.target.value }, "rotation")}
            value={isFinite(currKeyframe.rotation) ? currKeyframe.rotation : 0}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ rotation: (currKeyframe.rotation ?? 0) + 15 }, "rotation")}
          >+</button>
        </div>
      </span>

      {/* Opacity Controls */}
      <label className={styles.tags}>
        Opacity
        <button
          className={styles.keyframeNext}
          onClick={() => {
            if (!segment) return;

            let nextKeyframeIndex = findNextSetKeyframe("opacity");
            setCurrentTime(
              nextKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[nextKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_right</span>
        </button>
        <button
          className={styles.keyframeBtn}
          onClick={(event) => {
            event.stopPropagation();
            if (currentTime === 0) return;
            if (!opacityState) {
              _updateSegment({ opacity: currKeyframe.opacity ?? 1 }, undefined, true);
            } else {
              _updateSegment({ opacity: undefined }, undefined, true);
            }
            setOpacityState(!opacityState);
          }}
        >
          <span
            className="material-icons"
            style={{ color: opacityState ? "red" : "rgb(102, 102, 102)" }}
          >
            circle
          </span>
        </button>
        <button
          className={styles.keyframePrev}
          onClick={() => {
            if (!segment) return;

            let prevKeyframeIndex = findPrevSetKeyframe("opacity");
            setCurrentTime(
              prevKeyframeIndex == null
                ? currentTime
                : segment.start + segment.keyframes[prevKeyframeIndex].start
            );
          }}
        >
          <span className="material-icons">keyboard_arrow_left</span>
        </button>
      </label>
      <span className={styles.effectBox}>
        <label className={styles.tag}>Alpha</label>
        <div className={styles.inputTagBox}>
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ opacity: Math.max(+((currKeyframe.opacity ?? 1) - 0.1).toFixed(2), 0) }, "opacity")}
          >-</button>
          <input
            name="Opacity"
            className={styles.inputTag}
            type="number"
            step="0.1"
            min="0"
            max="1"
            onChange={event => _updateSegment({ opacity: +event.target.value }, "opacity")}
            value={isFinite(currKeyframe.opacity) ? currKeyframe.opacity : 1}
          />
          <button
            className={styles.inputBtn}
            onClick={() => _updateSegment({ opacity: Math.min(+((currKeyframe.opacity ?? 1) + 0.1).toFixed(2), 1) }, "opacity")}
          >+</button>
        </div>
      </span>

      {/* Text Editing Section */}
      {segment && segment.media.type === 'text' && (
        <>
          <span className={styles.tags}>
            Text Content
            <div className={styles.inputContainer}>
              <textarea
                className={styles.textArea}
                value={segment.media.textContent || ''}
                onChange={(event) => {
                  const updatedMedia = {
                    ...segment.media,
                    textContent: event.target.value
                  };
                  const updatedSegment = { ...segment, media: updatedMedia };
                  regenerateTextCanvas(updatedSegment);
                  updateSegment(selectedSegment!, updatedSegment);
                }}
                placeholder="Digite o texto aqui..."
                rows={3}
              />
            </div>
          </span>

          {/* Text Style Section */}
          {segment && segment.media.type === 'text' && segment.media.textStyle && (
            <>
              <span className={styles.tags}>
                Font Size
                <div className={styles.inputContainer}>
                  <button
                    className={styles.inputBtn}
                    onClick={() => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        fontSize: Math.max(segment.media.textStyle!.fontSize - 2, 8)
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  >-</button>
                  <input
                    className={styles.inputTag}
                    type="number"
                    min="8"
                    max="200"
                    value={segment.media.textStyle.fontSize}
                    onChange={(event) => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        fontSize: parseInt(event.target.value) || 16
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  />
                  <button
                    className={styles.inputBtn}
                    onClick={() => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        fontSize: Math.min(segment.media.textStyle!.fontSize + 2, 200)
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  >+</button>
                </div>
              </span>

              <span className={styles.tags}>
                Text Color
                <div className={styles.inputContainer}>
                  <input
                    className={styles.colorInput}
                    type="color"
                    value={segment.media.textStyle.color}
                    onChange={(event) => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        color: event.target.value
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  />
                </div>
              </span>

              <span className={styles.tags}>
                Font Family
                <div className={styles.inputContainer}>
                  <select
                    className={styles.selectInput}
                    value={segment.media.textStyle.fontFamily}
                    onChange={(event) => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        fontFamily: event.target.value
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Impact">Impact</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                  </select>
                </div>
              </span>

              {/* Text Border Section */}
              <span className={styles.tags}>
                Text Border Width
                <div className={styles.inputContainer}>
                  <button
                    className={styles.inputBtn}
                    onClick={() => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        borderWidth: Math.max((segment.media.textStyle!.borderWidth || 0) - 1, 0)
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  >-</button>
                  <input
                    className={styles.inputTag}
                    type="number"
                    min="0"
                    max="20"
                    value={segment.media.textStyle.borderWidth || 0}
                    onChange={(event) => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        borderWidth: parseInt(event.target.value) || 0
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  />
                  <button
                    className={styles.inputBtn}
                    onClick={() => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        borderWidth: Math.min((segment.media.textStyle!.borderWidth || 0) + 1, 20)
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  >+</button>
                </div>
              </span>

              <span className={styles.tags}>
                Text Border Color
                <div className={styles.inputContainer}>
                  <input
                    className={styles.colorInput}
                    type="color"
                    value={segment.media.textStyle.borderColor || '#000000'}
                    onChange={(event) => {
                      const updatedTextStyle = {
                        ...segment.media.textStyle!,
                        borderColor: event.target.value
                      };
                      const updatedMedia = {
                        ...segment.media,
                        textStyle: updatedTextStyle
                      };
                      const updatedSegment = { ...segment, media: updatedMedia };
                      regenerateTextCanvas(updatedSegment);
                      updateSegment(selectedSegment!, updatedSegment);
                    }}
                  />
                </div>
              </span>
            </>
          )}
        </>
      )}
    </fieldset>
  );
}

// Function to regenerate text canvas
const regenerateTextCanvas = (segment: Segment) => {
  if (segment.media.type !== 'text' || !segment.media.textContent || !segment.media.textStyle) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;
  
  // Set canvas size
  canvas.width = 400;
  canvas.height = 200;
  
  // Apply text style
  ctx.font = `${segment.media.textStyle.fontSize}px ${segment.media.textStyle.fontFamily}`;
  ctx.fillStyle = segment.media.textStyle.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Fill background if specified
  if (segment.media.textStyle.backgroundColor && segment.media.textStyle.backgroundColor !== 'transparent') {
    ctx.fillStyle = segment.media.textStyle.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = segment.media.textStyle.color;
  }
  
  // Add border if specified (draw border first, then text)
  if (segment.media.textStyle.borderWidth && segment.media.textStyle.borderWidth > 0) {
    ctx.strokeStyle = segment.media.textStyle.borderColor || '#000000';
    ctx.lineWidth = segment.media.textStyle.borderWidth;
    ctx.strokeText(segment.media.textContent, canvas.width / 2, canvas.height / 2);
  }
  
  // Draw text (fill text on top of border)
  ctx.fillText(segment.media.textContent, canvas.width / 2, canvas.height / 2);
  
  // Update the element in the media sources
  if (segment.media.sources[0]) {
    segment.media.sources[0].element = canvas;
  }
  
  // Update thumbnail
  segment.media.thumbnail = canvas.toDataURL();
};

import styles from "./mediaPlayer.module.css";
import { useEffect, useRef, useState } from "react";

export default function MediaPlayer({
  canvasRef,
  projectWidth,
  projectHeight,
}: {
  canvasRef: HTMLCanvasElement;
  projectWidth: number;
  projectHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSizes = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    
    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(updateSizes, 100); // Small delay to ensure orientation change is complete
    });
    
    return () => {
      window.removeEventListener('resize', updateSizes);
      window.removeEventListener('orientationchange', updateSizes);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef || !ref.current) return;

    canvasRef.classList.add(styles.canvas);
    
    // Calculate the aspect ratio
    const aspectRatio = projectWidth / projectHeight;
    
    let canvasWidth, canvasHeight;
    
    if (containerSize.width > 0 && containerSize.height > 0) {
      // Responsive margins based on screen size - using state instead of window.innerWidth
      const isSmallScreen = screenSize.width <= 768;
      const isMobileScreen = screenSize.width <= 480;
      
      let widthMargin, heightMargin;
      
      if (isMobileScreen) {
        widthMargin = 16; // Even smaller margins for mobile
        heightMargin = 40;
      } else if (isSmallScreen) {
        widthMargin = 24; // Medium margins for tablets
        heightMargin = 60;
      } else {
        widthMargin = 60; // Original margins for desktop
        heightMargin = 120;
      }
      
      // Calculate available space
      const availableWidth = containerSize.width - widthMargin;
      const availableHeight = containerSize.height - heightMargin;
      
      // Calculate dimensions that fit within available space while maintaining aspect ratio
      if (availableWidth / aspectRatio <= availableHeight) {
        // Width is the limiting factor
        canvasWidth = Math.max(availableWidth, 0);
        canvasHeight = canvasWidth / aspectRatio;
      } else {
        // Height is the limiting factor
        canvasHeight = Math.max(availableHeight, 0);
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      // Apply responsive minimum size constraints
      const minSize = isMobileScreen ? 120 : isSmallScreen ? 150 : 180;
      
      if (canvasWidth < minSize && canvasHeight < minSize) {
        if (aspectRatio > 1) {
          // Landscape orientation
          canvasWidth = minSize;
          canvasHeight = minSize / aspectRatio;
        } else {
          // Portrait orientation
          canvasHeight = minSize;
          canvasWidth = minSize * aspectRatio;
        }
      }
      
      // Ensure we don't exceed container bounds even with minimum size
      if (canvasWidth > availableWidth) {
        canvasWidth = availableWidth;
        canvasHeight = canvasWidth / aspectRatio;
      }
      
      if (canvasHeight > availableHeight) {
        canvasHeight = availableHeight;
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      // Set canvas dimensions
      canvasRef.style.width = `${Math.max(canvasWidth, 0)}px`;
      canvasRef.style.height = `${Math.max(canvasHeight, 0)}px`;
      
      // Force canvas to maintain aspect ratio
      canvasRef.style.aspectRatio = `${aspectRatio}`;
      
      // Ensure canvas doesn't overflow
      canvasRef.style.maxWidth = '100%';
      canvasRef.style.maxHeight = '100%';
      canvasRef.style.objectFit = 'contain';
    }
    
    if (!ref.current.contains(canvasRef)) {
      ref.current.appendChild(canvasRef);
    }
  }, [canvasRef, projectWidth, projectHeight, containerSize, screenSize]);

  return (
    <div ref={ref} className={styles.container}>
      {/* Canvas will be appended here */}
    </div>
  );
}

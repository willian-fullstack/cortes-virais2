import React from 'react';
import styles from './CanvasSize.module.css';

export type CanvasSizeType = 'mobile' | 'tablet' | 'desktop';

interface CanvasSizeProps {
  selectedSize: CanvasSizeType;
  onSizeChange: (size: CanvasSizeType) => void;
}

const CANVAS_SIZES = {
  mobile: { width: 360, height: 640, label: 'Celular' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  desktop: { width: 1920, height: 1080, label: 'PC' }
};

export default function CanvasSize({ selectedSize, onSizeChange }: CanvasSizeProps) {
  return (
    <div className={styles.container}>
      <div className={styles.sizeSelector}>
        <button
          className={`${styles.sizeButton} ${selectedSize === 'mobile' ? styles.active : ''}`}
          onClick={() => onSizeChange('mobile')}
          title={`${CANVAS_SIZES.mobile.label} (${CANVAS_SIZES.mobile.width}x${CANVAS_SIZES.mobile.height})`}
        >
          <span className="material-icons">smartphone</span>
        </button>
        
        <button
          className={`${styles.sizeButton} ${selectedSize === 'tablet' ? styles.active : ''}`}
          onClick={() => onSizeChange('tablet')}
          title={`${CANVAS_SIZES.tablet.label} (${CANVAS_SIZES.tablet.width}x${CANVAS_SIZES.tablet.height})`}
        >
          <span className="material-icons">tablet</span>
        </button>
        
        <button
          className={`${styles.sizeButton} ${selectedSize === 'desktop' ? styles.active : ''}`}
          onClick={() => onSizeChange('desktop')}
          title={`${CANVAS_SIZES.desktop.label} (${CANVAS_SIZES.desktop.width}x${CANVAS_SIZES.desktop.height})`}
        >
          <span className="material-icons">desktop_windows</span>
        </button>
      </div>
      
      <div className={styles.sizeInfo}>
        <span className={styles.sizeLabel}>
          {CANVAS_SIZES[selectedSize].label}: {CANVAS_SIZES[selectedSize].width} x {CANVAS_SIZES[selectedSize].height}
        </span>
      </div>
    </div>
  );
}

export { CANVAS_SIZES };
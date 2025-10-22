import React, { useState } from 'react';
import styles from './MassCutModal.module.css';

interface MassCutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (numberOfCuts: number, cutDuration: number) => void;
  onPreview: (numberOfCuts: number, cutDuration: number) => void;
  projectDuration: number;
}

export default function MassCutModal({ isOpen, onClose, onApply, onPreview, projectDuration }: MassCutModalProps) {
  const [numberOfCuts, setNumberOfCuts] = useState(5);
  const [cutDuration, setCutDuration] = useState(10);

  if (!isOpen) return null;

  const handleNumberOfCutsChange = (value: number) => {
    setNumberOfCuts(value);
    onPreview(value, cutDuration);
  };

  const handleCutDurationChange = (value: number) => {
    setCutDuration(value);
    onPreview(numberOfCuts, value);
  };

  const handleApply = () => {
    onApply(numberOfCuts, cutDuration);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = numberOfCuts * cutDuration;
  const previewCuts = Array.from({ length: numberOfCuts }, (_, i) => (i + 1) * cutDuration);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Cortes em Massa</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.inputGroup}>
            <label htmlFor="numberOfCuts">Número de Cortes:</label>
            <input
              id="numberOfCuts"
              type="number"
              min="1"
              max="50"
              value={numberOfCuts}
              onChange={(e) => handleNumberOfCutsChange(Math.max(1, parseInt(e.target.value) || 1))}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="cutDuration">Duração de cada Corte (segundos):</label>
            <input
              id="cutDuration"
              type="number"
              min="0.1"
              step="0.1"
              value={cutDuration}
              onChange={(e) => handleCutDurationChange(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className={styles.input}
            />
          </div>

          <div className={styles.preview}>
            <h3>Preview dos Cortes:</h3>
            <div className={styles.timeline}>
              <div className={styles.timelineBar}>
                {previewCuts.map((cutTime, index) => (
                  <div
                    key={index}
                    className={styles.cutMarker}
                    style={{
                      left: `${(cutTime / projectDuration) * 100}%`
                    }}
                    title={`Corte ${index + 1}: ${formatTime(cutTime)}`}
                  />
                ))}
              </div>
              <div className={styles.timeLabels}>
                <span>0:00</span>
                <span>{formatTime(projectDuration)}</span>
              </div>
            </div>
            <p className={styles.info}>
              Total de {numberOfCuts} cortes, cada um com {cutDuration}s
              {totalDuration > projectDuration && (
                <span className={styles.warning}>
                  ⚠️ Duração total ({formatTime(totalDuration)}) excede a duração do projeto ({formatTime(projectDuration)})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.applyButton} onClick={handleApply}>
            Aplicar Cortes
          </button>
        </div>
      </div>
    </div>
  );
}
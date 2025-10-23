import styles from "./mediaPool.module.css";
import React, { useState } from 'react';
import { Media, Segment } from "../../model/types";
import { Droppable, Draggable } from 'react-beautiful-dnd';

const options = {
    types: [
        {
            accept: {
                'video/*': ['.mp4', '.mov', '.wmv', '.avi', '.flv'],
                'image/*': ['.jpg', '.png', '.gif', '.jpeg']
            }
        },
    ],
    multiple: true,
    excludeAcceptAllOption: true
};

export default function MediaPool(props: {
    mediaList: Media[];
    setMediaList: (mediaList: Media[]) => void;
    addVideo: (files: File[]) => void;
    addText: (textContent: string, textStyle: any) => void;
    deleteVideo: (media: Media) => void;
    dragAndDrop: (media: Media) => void;
    projectDuration: number;
    trackList: Segment[][];
    setCurrentTime: (timestamp: number) => void;
}) {
    const [status, setStatus] = useState<string>('');
    const [draggedOn, setDraggedOn] = useState<String>("");

    const renderMediaItem = (item: Media, index: number, provided?: any) => (
        <li className={`${styles.card}`}
            ref={provided?.innerRef} 
            {...provided?.draggableProps} 
            {...provided?.dragHandleProps}
        >
            <img className={styles.img} src={item.thumbnail} alt={item.file.name} />
            <p className={styles.cardCaption}>{item.file.name}</p>
            <button className={styles.button} onClick={() => props.deleteVideo(item)}>
                <span className="material-icons">delete</span>
            </button>
        </li>
    );

    // Função para calcular o número do vídeo resultante baseado nos intervalos de tempo
    const calculateVideoNumber = (trackIndex: number, segmentIndex: number) => {
        // Encontrar todos os pontos de corte únicos na timeline
        const cutPoints = new Set<number>();
        
        // Coletar todos os pontos de início e fim dos segmentos
        props.trackList.forEach(track => {
            track.forEach(segment => {
                cutPoints.add(segment.start);
                cutPoints.add(segment.start + segment.duration);
            });
        });
        
        // Converter para array ordenado e criar intervalos
        const sortedCutPoints = Array.from(cutPoints).sort((a, b) => a - b);
        
        // Encontrar o segmento atual
        const currentSegment = props.trackList[trackIndex][segmentIndex];
        
        // Encontrar em qual intervalo de tempo este segmento está
        for (let i = 0; i < sortedCutPoints.length - 1; i++) {
            const intervalStart = sortedCutPoints[i];
            const intervalEnd = sortedCutPoints[i + 1];
            
            // Verificar se o segmento atual está neste intervalo
            if (currentSegment.start >= intervalStart && currentSegment.start < intervalEnd) {
                return i + 1; // Retorna o número do vídeo (1-indexed)
            }
        }
        
        return 1; // Fallback
    };

    // Função para verificar se um segmento já foi renderizado neste intervalo
    const isFirstSegmentInInterval = (trackIndex: number, segmentIndex: number) => {
        const currentSegment = props.trackList[trackIndex][segmentIndex];
        const videoNumber = calculateVideoNumber(trackIndex, segmentIndex);
        
        // Verificar se existe algum segmento anterior no mesmo intervalo de tempo
        for (let t = 0; t < props.trackList.length; t++) {
            for (let s = 0; s < props.trackList[t].length; s++) {
                // Se chegamos no segmento atual, pare
                if (t === trackIndex && s === segmentIndex) {
                    return true; // É o primeiro neste intervalo
                }
                
                // Se encontrou outro segmento no mesmo intervalo, não é o primeiro
                if (calculateVideoNumber(t, s) === videoNumber) {
                    return false;
                }
            }
        }
        
        return true;
    };

    const renderSegmentItem = (segment: Segment, trackIndex: number, segmentIndex: number, globalIndex: number, provided?: any) => {
        const videoNumber = calculateVideoNumber(trackIndex, segmentIndex);
        
        // Debug: log segment duration
        console.log(`Vídeo ${videoNumber}: duration = ${segment.duration}ms (${(segment.duration / 1000).toFixed(2)}s)`);
        
        return (
            <li className={`${styles.card} ${styles.segmentCard}`}
                ref={provided?.innerRef} 
                {...provided?.draggableProps} 
                {...provided?.dragHandleProps}
                onClick={() => {
                    // Navegar para o início do segmento na timeline
                    props.setCurrentTime(segment.start);
                }}
            >
                <img className={styles.img} src={segment.media.thumbnail} alt={`Vídeo ${videoNumber}`} />
                <p className={styles.cardCaption}>
                    Vídeo {videoNumber}
                    <br />
                    <small>{(segment.duration / 1000).toFixed(2)}s</small>
                </p>
                <button className={styles.button} onClick={(e) => {
                    e.stopPropagation(); // Evitar que o clique no botão acione o onClick do li
                    // Aqui podemos implementar a lógica para deletar um segmento específico
                    console.log(`Deletar vídeo ${videoNumber}`);
                }}>
                    <span className="material-icons">delete</span>
                </button>
            </li>
        );
    };

    const listItems = props.mediaList
        .filter((item: Media) => item && item.file) // Filtrar elementos undefined ou sem file
        .map((item: Media, index: number) => {
            return (
                <Draggable key={item.file.name} draggableId={item.file.name} index={index}>
                    {(provided) => renderMediaItem(item, index, provided)}
                </Draggable>
            );
        });

    // Criar lista de segmentos de todos os tracks
    const segmentItems: React.JSX.Element[] = [];
    let globalSegmentIndex = listItems.length; // Começar após os arquivos originais filtrados

    props.trackList.forEach((track, trackIndex) => {
        track.forEach((segment, segmentIndex) => {
            // Só adicionar se for o primeiro segmento neste intervalo de tempo
            if (isFirstSegmentInInterval(trackIndex, segmentIndex)) {
                segmentItems.push(
                    <Draggable 
                        key={`segment-${trackIndex}-${segmentIndex}`} 
                        draggableId={`segment-${trackIndex}-${segmentIndex}`} 
                        index={globalSegmentIndex}
                    >
                        {(provided) => renderSegmentItem(segment, trackIndex, segmentIndex, globalSegmentIndex, provided)}
                    </Draggable>
                );
                globalSegmentIndex++;
            }
        });
    });

    // Combinar arquivos originais e segmentos
    const allItems = [...listItems, ...segmentItems];

    const onClick = async () => {
        try {
            const files: File[] = [];
            //@ts-ignore
            const Handle = await window.showOpenFilePicker(options);
            setStatus('Loading...');
            for (const entry of Handle) {
                let file = await entry.getFile();
                files.push(file);
            }
            await props.addVideo(files);
            setStatus('');
        } catch (error) {
            console.log(error);
        }
    }

    const onDrag = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggedOn("");
        if (!e.dataTransfer) return;
        const files: File[] = [];

        for (const item of Object.values(e.dataTransfer.items)) {
            const file = item.getAsFile();

            if (file !== null && (file.type.includes('video/') || file.type.includes('image/'))) files.push(file);
            else alert(`Could not upload file: ${file?.name}. Only upload videos or images.`);
        }
        await props.addVideo(files);
        setStatus('');
    }

    return (
        <div
            onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); setDraggedOn('draggedOn'); }}
            onDragEnter={(e) => { e.stopPropagation(); e.preventDefault(); setDraggedOn('draggedOn'); }}
            onDragLeave={(e) => { e.stopPropagation(); e.preventDefault(); setDraggedOn(""); }}
            onDrop={onDrag}
            className={`${styles.container} ${draggedOn}`}
        >
            <div className={styles.hbox}>
                <h2 className={styles.title}>Project Files</h2>
                <div className={styles.buttonGroup}>
                    <button
                        className={styles.addFiles}
                        onClick={onClick}
                        title="Add files"
                        >
                        <span className="material-icons md-36">add</span>
                    </button>
                    <button
                        className={styles.addText}
                        onClick={() => {
                            const textStyle = {
                                fontSize: 24,
                                fontFamily: 'Arial',
                                color: '#ffffff',
                                borderColor: '#000000',
                                borderWidth: 0,
                                backgroundColor: 'transparent'
                            };
                            props.addText('Novo Texto', textStyle);
                        }}
                        title="Add text"
                        >
                        <span className="material-icons md-36">text_fields</span>
                    </button>
                </div>
            </div>
            <div className={styles.mediaList}>
                    <Droppable 
                        droppableId="card" 
                        mode="virtual"
                        renderClone={(provided, snapshot, rubric) => {
                            const sourceIndex = rubric.source.index;
                            const filteredMediaList = props.mediaList.filter((item: Media) => item && item.file);
                            
                            if (sourceIndex < filteredMediaList.length) {
                                // É um arquivo original
                                return renderMediaItem(filteredMediaList[sourceIndex], sourceIndex, provided);
                            } else {
                                // É um segmento - precisamos encontrar qual
                                let segmentIndex = sourceIndex - filteredMediaList.length;
                                let currentIndex = 0;
                                
                                for (let trackIndex = 0; trackIndex < props.trackList.length; trackIndex++) {
                                    for (let segIndex = 0; segIndex < props.trackList[trackIndex].length; segIndex++) {
                                        if (isFirstSegmentInInterval(trackIndex, segIndex)) {
                                            if (currentIndex === segmentIndex) {
                                                return renderSegmentItem(
                                                    props.trackList[trackIndex][segIndex], 
                                                    trackIndex, 
                                                    segIndex, 
                                                    sourceIndex, 
                                                    provided
                                                );
                                            }
                                            currentIndex++;
                                        }
                                    }
                                }
                                return null;
                            }
                        }}
                    >
                        {
                            (provided) => (
                                <ul className="card" {...provided.droppableProps} ref={provided.innerRef}>
                                    {allItems}
                                </ul>
                        )}
                    </Droppable>
            </div>

            <p className={styles.loader}>{status}</p>
        </div>
    )
}
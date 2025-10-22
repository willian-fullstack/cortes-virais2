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
    deleteVideo: (media: Media) => void;
    dragAndDrop: (media: Media) => void;
    projectDuration: number;
    trackList: Segment[][];
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

    const renderSegmentItem = (segment: Segment, trackIndex: number, segmentIndex: number, globalIndex: number, provided?: any) => {
        // Debug: log segment duration
        console.log(`Segmento ${trackIndex + 1}-${segmentIndex + 1}: duration = ${segment.duration}ms (${(segment.duration / 1000).toFixed(2)}s)`);
        
        return (
            <li className={`${styles.card} ${styles.segmentCard}`}
                ref={provided?.innerRef} 
                {...provided?.draggableProps} 
                {...provided?.dragHandleProps}
            >
                <img className={styles.img} src={segment.media.thumbnail} alt={`Segmento ${trackIndex}-${segmentIndex}`} />
                <p className={styles.cardCaption}>
                    Segmento {trackIndex + 1}-{segmentIndex + 1}
                    <br />
                    <small>{(segment.duration / 1000).toFixed(2)}s</small>
                </p>
                <button className={styles.button} onClick={() => {
                    // Aqui podemos implementar a lógica para deletar um segmento específico
                    console.log(`Deletar segmento ${trackIndex}-${segmentIndex}`);
                }}>
                    <span className="material-icons">delete</span>
                </button>
            </li>
        );
    };

    const listItems = props.mediaList.map((item: Media, index: number) => {
        return (
            <Draggable key={item.file.name} draggableId={item.file.name} index={index}>
                {(provided) => renderMediaItem(item, index, provided)}
            </Draggable>
        );
    });

    // Criar lista de segmentos de todos os tracks
    const segmentItems: React.JSX.Element[] = [];
    let globalSegmentIndex = props.mediaList.length; // Começar após os arquivos originais

    props.trackList.forEach((track, trackIndex) => {
        track.forEach((segment, segmentIndex) => {
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
                <button
                    className={styles.addFiles}
                    onClick={onClick}
                    title="Add files"
                    >
                    <span className="material-icons md-36">add</span>
                </button>
            </div>
            <div className={styles.mediaList}>
                    <Droppable 
                        droppableId="card" 
                        mode="virtual"
                        renderClone={(provided, snapshot, rubric) => {
                            const sourceIndex = rubric.source.index;
                            if (sourceIndex < props.mediaList.length) {
                                // É um arquivo original
                                return renderMediaItem(props.mediaList[sourceIndex], sourceIndex, provided);
                            } else {
                                // É um segmento - precisamos encontrar qual
                                let segmentIndex = sourceIndex - props.mediaList.length;
                                let currentIndex = 0;
                                
                                for (let trackIndex = 0; trackIndex < props.trackList.length; trackIndex++) {
                                    for (let segIndex = 0; segIndex < props.trackList[trackIndex].length; segIndex++) {
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
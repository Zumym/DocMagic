// Annotation types for the image annotation canvas

export type AnnotationType = 'highlight' | 'arrow' | 'text';

export interface BaseAnnotation {
  id: string; // unique identifier
  type: AnnotationType;
  createdAt: number;
  updatedAt: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  shape: 'rect' | 'ellipse';
  x: number; // top-left X (0-1)
  y: number; // top-left Y (0-1)
  width: number; // (0-1)
  height: number; // (0-1)
  color: string; // e.g. '#FFD600'
  opacity: number; // 0-1
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startX: number; // (0-1)
  startY: number; // (0-1)
  endX: number;   // (0-1)
  endY: number;   // (0-1)
  color: string;
  thickness: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number; // anchor X (0-1)
  y: number; // anchor Y (0-1)
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string; // text color
  background: 'white' | 'black';
  align: 'above' | 'below' | 'left' | 'right';
  width?: number; // optional, for bounding box
  height?: number;
}

export type Annotation = HighlightAnnotation | ArrowAnnotation | TextAnnotation; 
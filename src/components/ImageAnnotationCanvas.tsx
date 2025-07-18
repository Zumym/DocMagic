import React, { useState, useRef } from 'react';
import { UploadedImage } from '../types';
import { Annotation, TextAnnotation, ArrowAnnotation } from '../types/annotations';

const TOOL_OPTIONS = [
  { type: 'highlight', label: 'Highlight' },
  { type: 'arrow', label: 'Arrow' },
  { type: 'text', label: 'Text' },
  { type: 'rectangle', label: 'Rectangle' },
] as const;

type ToolType = typeof TOOL_OPTIONS[number]['type'] | null;

interface ImageAnnotationToolbarProps {
  selectedTool: ToolType;
  setSelectedTool: (tool: ToolType) => void;
}

const ImageAnnotationToolbar: React.FC<ImageAnnotationToolbarProps> = ({ selectedTool, setSelectedTool }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 20,
      background: 'rgba(255,255,255,0.92)',
      borderRadius: '16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      padding: '16px 8px',
      alignItems: 'center',
      minWidth: 90,
      marginRight: 24, // gap between toolbar and image
    }}
  >
    {TOOL_OPTIONS.map((tool) => (
      <button
        key={tool.type}
        style={{
          width: 74,
          height: 36,
          borderRadius: 8,
          border: selectedTool === tool.type ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          background: selectedTool === tool.type ? '#e0e7ff' : 'white',
          color: '#374151',
          fontWeight: 500,
          fontSize: 15,
          cursor: 'pointer',
          outline: 'none',
          boxShadow: selectedTool === tool.type ? '0 0 0 2px #3b82f633' : undefined,
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onClick={() => setSelectedTool(tool.type)}
        title={tool.label}
      >
        {tool.label}
      </button>
    ))}
  </div>
);

interface ImageAnnotationCanvasProps {
  image: UploadedImage;
  annotations: Annotation[];
  onChange: (newAnnotations: Annotation[]) => void;
}

const ASPECT_RATIO = 16 / 9;
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = CANVAS_WIDTH / ASPECT_RATIO;

const DEFAULT_TEXT_WIDTH = 180;
const DEFAULT_TEXT_HEIGHT = 48;

const ImageAnnotationCanvas: React.FC<ImageAnnotationCanvasProps> = ({ image, annotations, onChange }) => {
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  // Arrow creation state
  const [arrowDraft, setArrowDraft] = useState<null | { startX: number; startY: number; endX: number; endY: number }>(null);

  // Add text annotation on image click
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (selectedTool !== 'text') return;
    // Only add if not clicking on an annotation
    if ((e.target as HTMLElement).dataset.annotation) return;
    // If an annotation is selected, just deselect it
    if (selectedId) {
      setSelectedId(null);
      return;
    }
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newAnnotation: TextAnnotation & { borderColor: string } = {
      id: `text_${Date.now()}`,
      type: 'text',
      x: x,
      y: y,
      width: DEFAULT_TEXT_WIDTH,
      height: DEFAULT_TEXT_HEIGHT,
      text: 'Edit me',
      fontSize: 16,
      fontFamily: 'Inter, sans-serif',
      color: '#222222', // text color
      background: 'white',
      align: 'below',
      borderColor: '#3b82f6', // custom field for border
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onChange([...annotations, newAnnotation]);
    setSelectedId(newAnnotation.id);
  };

  // Drag logic
  const handleDragStart = (e: React.MouseEvent, id: string) => {
    setSelectedId(id);
    const annotation = annotations.find(a => a.id === id) as TextAnnotation & { borderColor?: string };
    dragOffset.current = {
      x: e.clientX - annotation.x,
      y: e.clientY - annotation.y,
    };
    window.addEventListener('mousemove', handleDragging as any);
    window.addEventListener('mouseup', handleDragEnd as any);
  };
  const handleDragging = (e: MouseEvent) => {
    if (!selectedId || !dragOffset.current) return;
    onChange(
      annotations.map(a =>
        a.id === selectedId && a.type === 'text'
          ? { ...a, x: e.clientX - dragOffset.current!.x, y: e.clientY - dragOffset.current!.y }
          : a
      )
    );
  };
  const handleDragEnd = () => {
    dragOffset.current = null;
    window.removeEventListener('mousemove', handleDragging as any);
    window.removeEventListener('mouseup', handleDragEnd as any);
  };

  // Resize logic
  const handleResize = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const annotation = annotations.find(a => a.id === id) as TextAnnotation & { borderColor?: string };
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = annotation.width || DEFAULT_TEXT_WIDTH;
    const startHeight = annotation.height || DEFAULT_TEXT_HEIGHT;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + (moveEvent.clientX - startX));
      const newHeight = Math.max(24, startHeight + (moveEvent.clientY - startY));
      onChange(
        annotations.map(a =>
          a.id === id && a.type === 'text'
            ? { ...a, width: newWidth, height: newHeight }
            : a
        )
      );
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Edit text
  const handleTextChange = (id: string, value: string) => {
    onChange(
      annotations.map(a =>
        a.id === id && a.type === 'text'
          ? { ...a, text: value }
          : a
      )
    );
  };

  // Color change
  const handleColorChange = (id: string, color: string, field: 'color' | 'borderColor') => {
    onChange(
      annotations.map(a =>
        a.id === id && a.type === 'text'
          ? { ...a, [field]: color }
          : a
      )
    );
  };

  // Arrow tool: handle mouse events for creating arrows
  const handleArrowMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (selectedTool !== 'arrow') return;
    // Only start arrow if not clicking on an annotation (including arrows)
    let target = e.target as HTMLElement;
    // Traverse up in case of SVG elements
    while (target && target !== e.currentTarget) {
      if (target.dataset && target.dataset.annotation) return;
      target = target.parentElement as HTMLElement;
    }
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setArrowDraft({ startX: x, startY: y, endX: x, endY: y });
  };
  const handleArrowMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!arrowDraft) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setArrowDraft({ ...arrowDraft, endX: x, endY: y });
  };
  const handleArrowMouseUp = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!arrowDraft) return;
    // Only create if the arrow is not a point
    if (arrowDraft.startX !== arrowDraft.endX || arrowDraft.startY !== arrowDraft.endY) {
      const newArrow: ArrowAnnotation = {
        id: `arrow_${Date.now()}`,
        type: 'arrow',
        startX: arrowDraft.startX,
        startY: arrowDraft.startY,
        endX: arrowDraft.endX,
        endY: arrowDraft.endY,
        color: '#3b82f6',
        thickness: 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onChange([...annotations, newArrow]);
      setSelectedId(newArrow.id);
    }
    setArrowDraft(null);
  };

  // Arrow handle drag logic
  const handleArrowHandleDrag = (e: React.MouseEvent, id: string, which: 'start' | 'end') => {
    e.stopPropagation();
    setSelectedId(id);
    // Get the SVG element for coordinate calculation
    const svg = (e.target as SVGCircleElement).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const onMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.clientX - rect.left;
      const y = moveEvent.clientY - rect.top;
      onChange(
        annotations.map(a =>
          a.id === id && a.type === 'arrow'
            ? which === 'start'
              ? { ...a, startX: x, startY: y }
              : { ...a, endX: x, endY: y }
            : a
        )
      );
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Improved background click handler for deselection
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // If clicking on the background (not on an annotation), always deselect
    setSelectedId(null);
    // Only create a new annotation if a tool is active and no annotation is selected
    if (selectedTool === 'text') {
      handleImageClick(e);
    }
    // (Arrow creation is handled by mouse down/move/up logic)
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: CANVAS_WIDTH + 120, // 120px for toolbar + gap
        height: CANVAS_HEIGHT,
        margin: '0 auto',
        background: 'transparent',
        borderRadius: 12,
        boxShadow: 'none',
        overflow: 'visible',
        position: 'relative',
      }}
    >
      <ImageAnnotationToolbar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
      <div
        style={{
          position: 'relative',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          borderRadius: 12,
          overflow: 'hidden',
          background: '#f3f4f6',
          boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
        }}
        onClick={handleBackgroundClick}
        onMouseDown={handleArrowMouseDown}
        onMouseMove={arrowDraft ? handleArrowMouseMove : undefined}
        onMouseUp={arrowDraft ? handleArrowMouseUp : undefined}
      >
        <img
          src={image.url}
          alt={image.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
        {/* Render text annotations */}
        {annotations.filter(a => a.type === 'text').map(a => {
          const ta = a as TextAnnotation & { borderColor?: string };
          return (
            <div
              key={ta.id}
              data-annotation
              style={{
                position: 'absolute',
                left: ta.x,
                top: ta.y,
                width: ta.width,
                height: ta.height,
                border: `2px solid ${ta.borderColor || '#3b82f6'}`,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.95)',
                color: ta.color,
                fontSize: ta.fontSize,
                fontWeight: 500,
                boxShadow: selectedId === ta.id ? '0 2px 8px #3b82f655' : undefined,
                cursor: 'move',
                zIndex: selectedId === ta.id ? 2 : 1,
                display: 'flex',
                alignItems: 'center',
                userSelect: 'none',
              }}
              onMouseDown={e => { e.stopPropagation(); handleDragStart(e, ta.id); }}
              onClick={e => { e.stopPropagation(); setSelectedId(ta.id); }}
            >
              <textarea
                value={ta.text}
                onChange={e => handleTextChange(ta.id, e.target.value)}
                style={{
                  width: (ta.width || DEFAULT_TEXT_WIDTH) - 32,
                  height: (ta.height || DEFAULT_TEXT_HEIGHT) - 12,
                  border: 'none',
                  background: 'transparent',
                  color: ta.color,
                  fontSize: ta.fontSize,
                  fontWeight: 500,
                  outline: 'none',
                  padding: 6,
                  marginRight: 4,
                  resize: 'none',
                  overflow: 'auto',
                  fontFamily: ta.fontFamily,
                }}
                onClick={e => e.stopPropagation()}
                onFocus={e => e.stopPropagation()}
                rows={2}
              />
              {/* Delete button */}
              {selectedId === ta.id && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onChange(annotations.filter(a => a.id !== ta.id));
                    setSelectedId(null);
                  }}
                  style={{
                    position: 'absolute',
                    left: -28,
                    top: -16,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: 16,
                    cursor: 'pointer',
                    zIndex: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 4px #ef444455',
                  }}
                  title="Delete annotation"
                >
                  ×
                </button>
              )}
              {/* Resize handle */}
              {selectedId === ta.id && (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: '#e5e7eb',
                    borderRadius: 4,
                    border: '1px solid #94a3b8',
                    cursor: 'nwse-resize',
                    position: 'absolute',
                    right: 2,
                    bottom: 2,
                    zIndex: 3,
                  }}
                  onMouseDown={e => { e.stopPropagation(); handleResize(e, ta.id); }}
                />
              )}
              {/* Color pickers */}
              {selectedId === ta.id && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: 0,
                    marginLeft: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: 4,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <label style={{ fontSize: 12, color: '#64748b' }}>
                    Text
                    <input
                      type="color"
                      value={ta.color}
                      onChange={e => handleColorChange(ta.id, e.target.value, 'color')}
                      style={{ marginLeft: 4 }}
                      onClick={e => e.stopPropagation()}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: '#64748b' }}>
                    Border
                    <input
                      type="color"
                      value={ta.borderColor || '#3b82f6'}
                      onChange={e => handleColorChange(ta.id, e.target.value, 'borderColor')}
                      style={{ marginLeft: 4 }}
                      onClick={e => e.stopPropagation()}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
        {/* Render arrow annotations */}
        <svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'auto',
          }}
        >
          {/* Draft arrow while dragging */}
          {arrowDraft && (
            <ArrowSVG
              startX={arrowDraft.startX}
              startY={arrowDraft.startY}
              endX={arrowDraft.endX}
              endY={arrowDraft.endY}
              color="#3b82f6"
              thickness={3}
              isDraft
            />
          )}
          {/* Render saved arrows */}
          {annotations.filter(a => a.type === 'arrow').map(a => {
            const aa = a as ArrowAnnotation;
            // Calculate midpoint for delete button
            const midX = (aa.startX + aa.endX) / 2;
            const midY = (aa.startY + aa.endY) / 2 - 24; // 24px above midpoint
            return (
              <g key={aa.id}>
                {/* Larger invisible line for easier selection */}
                <line
                  x1={aa.startX}
                  y1={aa.startY}
                  x2={aa.endX}
                  y2={aa.endY}
                  stroke="rgba(0,0,0,0)"
                  strokeWidth={24}
                  style={{ cursor: 'pointer' }}
                  data-annotation
                  onClick={e => { e.stopPropagation(); setArrowDraft(null); setSelectedId(aa.id); }}
                />
                <ArrowSVG
                  startX={aa.startX}
                  startY={aa.startY}
                  endX={aa.endX}
                  endY={aa.endY}
                  color={aa.color}
                  thickness={aa.thickness}
                  isSelected={selectedId === aa.id}
                  onClick={e => { e.stopPropagation(); setArrowDraft(null); setSelectedId(aa.id); }}
                  data-annotation={true}
                  withBorder
                />
                {/* Delete button for arrow */}
                {selectedId === aa.id && (
                  <foreignObject
                    x={midX - 12}
                    y={midY - 12}
                    width={24}
                    height={24}
                    style={{ overflow: 'visible' }}
                  >
                    <button
                      onMouseDown={e => { e.stopPropagation(); setArrowDraft(null); }}
                      onClick={e => {
                        e.stopPropagation();
                        setArrowDraft(null);
                        onChange(annotations.filter(a => a.id !== aa.id));
                        setSelectedId(null);
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: 16,
                        cursor: 'pointer',
                        zIndex: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 4px #ef444455',
                      }}
                      title="Delete arrow"
                    >
                      ×
                    </button>
                  </foreignObject>
                )}
                {/* Handles for editing arrow ends */}
                {selectedId === aa.id && (
                  <>
                    <circle
                      cx={aa.startX}
                      cy={aa.startY}
                      r={8}
                      fill="#fff"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onMouseDown={e => handleArrowHandleDrag(e, aa.id, 'start')}
                    />
                    <circle
                      cx={aa.endX}
                      cy={aa.endY}
                      r={8}
                      fill="#fff"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onMouseDown={e => handleArrowHandleDrag(e, aa.id, 'end')}
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// Helper component to render an arrow as SVG line with arrowhead
const ArrowSVG: React.FC<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  thickness: number;
  isDraft?: boolean;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent<SVGGElement, MouseEvent>) => void;
  withBorder?: boolean;
}> = ({ startX, startY, endX, endY, color, thickness, isDraft, isSelected, onClick, withBorder }) => {
  // Arrowhead size
  const arrowHeadLength = 18;
  const arrowHeadAngle = Math.PI / 7;
  // Calculate angle
  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx);
  // Calculate the point where the line should end (before the arrowhead)
  const lineEndX = endX - arrowHeadLength * Math.cos(angle);
  const lineEndY = endY - arrowHeadLength * Math.sin(angle);
  // Arrowhead points
  const arrowX1 = endX - arrowHeadLength * Math.cos(angle - arrowHeadAngle);
  const arrowY1 = endY - arrowHeadLength * Math.sin(angle - arrowHeadAngle);
  const arrowX2 = endX - arrowHeadLength * Math.cos(angle + arrowHeadAngle);
  const arrowY2 = endY - arrowHeadLength * Math.sin(angle + arrowHeadAngle);
  return (
    <g style={{ pointerEvents: isDraft ? 'none' : 'auto' }} onClick={onClick}>
      {/* Black border line */}
      {withBorder && (
        <line
          x1={startX}
          y1={startY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#000"
          strokeWidth={thickness + 4}
          opacity={isDraft ? 0.3 : 0.7}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Main colored line */}
      <line
        x1={startX}
        y1={startY}
        x2={lineEndX}
        y2={lineEndY}
        stroke={color}
        strokeWidth={thickness}
        markerEnd={isDraft ? undefined : 'url(#arrowhead)'}
        opacity={isDraft ? 0.5 : 1}
        style={{ cursor: isSelected ? 'pointer' : 'default' }}
      />
      {/* Black border arrowhead */}
      {withBorder && (
        <polygon
          points={`${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
          fill="#000"
          opacity={isDraft ? 0.3 : 0.7}
        />
      )}
      {/* Main colored arrowhead */}
      <polygon
        points={`${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
        fill={color}
        opacity={isDraft ? 0.5 : 1}
      />
    </g>
  );
};

export default ImageAnnotationCanvas; 
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Type, 
  ArrowRight, 
  ArrowDown, 
  ArrowLeft, 
  ArrowUp, 
  Highlighter, 
  MessageSquare, 
  Undo, 
  Redo, 
  Save,
  Trash2,
  Eye,
  EyeOff,
  Move,
  RotateCw,
  Palette
} from 'lucide-react';
import { UploadedImage, Annotation } from '../types';

interface ImageEditorProps {
  image: UploadedImage;
  onAnnotationUpdate: (imageId: string, annotations: Annotation[]) => void;
  onSave: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ image, onAnnotationUpdate, onSave }) => {
  const [selectedTool, setSelectedTool] = useState<'text' | 'arrow' | 'highlight' | 'callout'>('text');
  const [annotations, setAnnotations] = useState<Annotation[]>(image.annotations);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [textProperties, setTextProperties] = useState({
    fontSize: 16,
    fontColor: '#000000',
    backgroundColor: '#ffffff',
    borderColor: '#3b82f6'
  });

  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[][]>([]);

  useEffect(() => {
    setAnnotations(image.annotations);
  }, [image.annotations]);

  useEffect(() => {
    onAnnotationUpdate(image.id, annotations);
  }, [annotations, image.id, onAnnotationUpdate]);

  const saveToHistory = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), [...annotations]]);
    setRedoStack([]);
  }, [annotations]);

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, [...annotations]]);
      setAnnotations(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, [...annotations]]);
      setAnnotations(nextState);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    // Check if clicking on existing annotation
    const clickedAnnotation = annotations.find(ann => {
      if (ann.type === 'highlight') {
        return x >= ann.x && x <= ann.x + (ann.width || 0) &&
               y >= ann.y && y <= ann.y + (ann.height || 0);
      } else {
        return Math.abs(x - ann.x) < 50 && Math.abs(y - ann.y) < 30;
      }
    });

    if (clickedAnnotation) {
      setSelectedAnnotation(clickedAnnotation.id);
      setIsDragging(true);
      setDragStart({ x: x - clickedAnnotation.x, y: y - clickedAnnotation.y });
      return;
    }

    // Create new annotation
    saveToHistory();
    setIsDrawing(true);
    setSelectedAnnotation(null);

    const newAnnotation: Annotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: selectedTool,
      x,
      y,
      width: selectedTool === 'highlight' ? 100 : undefined,
      height: selectedTool === 'highlight' ? 30 : undefined,
      text: selectedTool === 'text' ? 'Nuevo texto' : selectedTool === 'callout' ? 'Nueva nota' : '',
      fontSize: textProperties.fontSize,
      fontColor: textProperties.fontColor,
      backgroundColor: textProperties.backgroundColor,
      borderColor: textProperties.borderColor,
      arrowDirection: selectedTool === 'arrow' ? 'right' : undefined,
      zIndex: annotations.length
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotation(newAnnotation.id);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (isDragging && selectedAnnotation && dragStart) {
      // Move existing annotation
      setAnnotations(prev => prev.map(ann => 
        ann.id === selectedAnnotation 
          ? { ...ann, x: x - dragStart.x, y: y - dragStart.y }
          : ann
      ));
    } else if (isDrawing && selectedAnnotation && selectedTool === 'highlight') {
      // Resize highlight while drawing
      setAnnotations(prev => prev.map(ann => 
        ann.id === selectedAnnotation 
          ? { 
              ...ann, 
              width: Math.abs(x - ann.x),
              height: Math.abs(y - ann.y)
            }
          : ann
      ));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    setIsDragging(false);
    setDragStart(null);
  };

  const handleDeleteAnnotation = (id: string) => {
    saveToHistory();
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    setSelectedAnnotation(null);
  };

  const handleAnnotationTextChange = (id: string, newText: string) => {
    setAnnotations(prev => 
      prev.map(ann => 
        ann.id === id ? { ...ann, text: newText } : ann
      )
    );
  };

  const handleArrowDirectionChange = (id: string, direction: 'up' | 'down' | 'left' | 'right') => {
    saveToHistory();
    setAnnotations(prev => 
      prev.map(ann => 
        ann.id === id ? { ...ann, arrowDirection: direction } : ann
      )
    );
  };

  const updateAnnotationStyle = (id: string, updates: Partial<Annotation>) => {
    saveToHistory();
    setAnnotations(prev => 
      prev.map(ann => 
        ann.id === id ? { ...ann, ...updates } : ann
      )
    );
  };

  const renderAnnotation = (annotation: Annotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    const style: React.CSSProperties = {
      position: 'absolute',
      left: annotation.x * scaleX,
      top: annotation.y * scaleY,
      fontSize: annotation.fontSize * scaleX,
      color: annotation.fontColor,
      zIndex: annotation.zIndex + 10,
      cursor: 'move',
      userSelect: 'none'
    };

    const isSelected = selectedAnnotation === annotation.id;

    switch (annotation.type) {
      case 'text':
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              backgroundColor: annotation.backgroundColor,
              border: `2px solid ${isSelected ? '#3b82f6' : annotation.borderColor}`,
              padding: '4px 8px',
              borderRadius: '4px',
              minWidth: '60px',
              boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation.id);
            }}
          >
            {isSelected ? (
              <input
                type="text"
                value={annotation.text}
                onChange={(e) => handleAnnotationTextChange(annotation.id, e.target.value)}
                className="bg-transparent border-none outline-none w-full"
                style={{ color: annotation.fontColor, fontSize: 'inherit' }}
                autoFocus
                onBlur={() => setSelectedAnnotation(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedAnnotation(null);
                  }
                }}
              />
            ) : (
              <span>{annotation.text || 'Texto'}</span>
            )}
          </div>
        );

      case 'highlight':
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              width: (annotation.width || 0) * scaleX,
              height: (annotation.height || 0) * scaleY,
              backgroundColor: `${annotation.backgroundColor}60`,
              border: `2px solid ${isSelected ? '#3b82f6' : annotation.borderColor}`,
              borderRadius: '4px',
              boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation.id);
            }}
          />
        );

      case 'arrow':
        const arrowIcons = {
          right: ArrowRight,
          left: ArrowLeft,
          up: ArrowUp,
          down: ArrowDown
        };
        const ArrowIcon = arrowIcons[annotation.arrowDirection || 'right'];
        
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              color: isSelected ? '#3b82f6' : annotation.fontColor,
              fontSize: (annotation.fontSize + 8) * scaleX,
              filter: isSelected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation.id);
            }}
          >
            <ArrowIcon />
          </div>
        );

      case 'callout':
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              backgroundColor: annotation.backgroundColor,
              border: `2px solid ${isSelected ? '#3b82f6' : annotation.borderColor}`,
              borderRadius: '8px',
              padding: '8px 12px',
              maxWidth: '200px',
              boxShadow: isSelected 
                ? '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(59, 130, 246, 0.3)' 
                : '0 4px 12px rgba(0, 0, 0, 0.15)',
              minWidth: '100px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation.id);
            }}
          >
            {isSelected ? (
              <textarea
                value={annotation.text}
                onChange={(e) => handleAnnotationTextChange(annotation.id, e.target.value)}
                className="w-full resize-none border-none outline-none bg-transparent"
                rows={2}
                style={{ fontSize: 'inherit', color: annotation.fontColor }}
                autoFocus
                onBlur={() => setSelectedAnnotation(null)}
              />
            ) : (
              <p style={{ fontSize: 'inherit', color: annotation.fontColor, margin: 0 }}>
                {annotation.text || 'Nueva nota'}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const selectedAnnotationData = annotations.find(ann => ann.id === selectedAnnotation);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="w-80 bg-white shadow-lg p-4 space-y-6 overflow-y-auto">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Herramientas de Anotación</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { tool: 'text', icon: Type, label: 'Texto' },
              { tool: 'arrow', icon: ArrowRight, label: 'Flecha' },
              { tool: 'highlight', icon: Highlighter, label: 'Resaltar' },
              { tool: 'callout', icon: MessageSquare, label: 'Nota' }
            ].map(({ tool, icon: Icon, label }) => (
              <button
                key={tool}
                onClick={() => setSelectedTool(tool as any)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedTool === tool
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs block">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Propiedades de Texto</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tamaño de Fuente</label>
              <input
                type="range"
                min="12"
                max="32"
                value={textProperties.fontSize}
                onChange={(e) => setTextProperties(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{textProperties.fontSize}px</span>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Color de Texto</label>
              <input
                type="color"
                value={textProperties.fontColor}
                onChange={(e) => setTextProperties(prev => ({ ...prev, fontColor: e.target.value }))}
                className="w-full h-8 rounded border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Color de Fondo</label>
              <input
                type="color"
                value={textProperties.backgroundColor}
                onChange={(e) => setTextProperties(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-full h-8 rounded border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Color de Borde</label>
              <input
                type="color"
                value={textProperties.borderColor}
                onChange={(e) => setTextProperties(prev => ({ ...prev, borderColor: e.target.value }))}
                className="w-full h-8 rounded border border-gray-300"
              />
            </div>
          </div>
        </div>

        {selectedAnnotationData && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Anotación Seleccionada</h4>
            <div className="space-y-3">
              {selectedAnnotationData.type === 'arrow' && (
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Dirección de Flecha</label>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { dir: 'up', icon: ArrowUp, label: 'Arriba' },
                      { dir: 'down', icon: ArrowDown, label: 'Abajo' },
                      { dir: 'left', icon: ArrowLeft, label: 'Izquierda' },
                      { dir: 'right', icon: ArrowRight, label: 'Derecha' }
                    ].map(({ dir, icon: Icon, label }) => (
                      <button
                        key={dir}
                        onClick={() => handleArrowDirectionChange(selectedAnnotationData.id, dir as any)}
                        className={`p-2 rounded border text-xs ${
                          selectedAnnotationData.arrowDirection === dir
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto mb-1" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Color</label>
                <input
                  type="color"
                  value={selectedAnnotationData.fontColor}
                  onChange={(e) => updateAnnotationStyle(selectedAnnotationData.id, { fontColor: e.target.value })}
                  className="w-full h-8 rounded border border-gray-300"
                />
              </div>
              
              {(selectedAnnotationData.type === 'text' || selectedAnnotationData.type === 'callout') && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fondo</label>
                  <input
                    type="color"
                    value={selectedAnnotationData.backgroundColor || '#ffffff'}
                    onChange={(e) => updateAnnotationStyle(selectedAnnotationData.id, { backgroundColor: e.target.value })}
                    className="w-full h-8 rounded border border-gray-300"
                  />
                </div>
              )}
              
              <button
                onClick={() => handleDeleteAnnotation(selectedAnnotationData.id)}
                className="w-full flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </button>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Acciones</h4>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                <Undo className="w-4 h-4 mr-1" />
                Deshacer
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                <Redo className="w-4 h-4 mr-1" />
                Rehacer
              </button>
            </div>
            <button
              onClick={onSave}
              className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-1" />
              Guardar Cambios
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Consejos:</strong></p>
          <p>• Haz clic para crear nuevas anotaciones</p>
          <p>• Arrastra para mover anotaciones existentes</p>
          <p>• Haz clic en una anotación para editarla</p>
          <p>• Usa las herramientas de la izquierda para diferentes tipos</p>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{image.name}</h3>
            <div className="text-sm text-gray-600">
              {annotations.length} anotación{annotations.length !== 1 ? 'es' : ''}
            </div>
          </div>
          
          <div ref={containerRef} className="relative inline-block">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={image.width}
                height={image.height}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="border border-gray-300 cursor-crosshair max-w-full h-auto"
                style={{
                  backgroundImage: `url(${image.url})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            </div>
            
            {/* Render annotations */}
            {annotations.map(renderAnnotation)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
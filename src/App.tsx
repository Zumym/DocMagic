import React, { useState, useCallback, useEffect } from 'react';
import { BookOpen, Upload, Edit, Save, FolderOpen } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ImageAnnotationCanvas from './components/ImageAnnotationCanvas';
import { UploadedImage, Project } from './types';
import ChatWithAI from './components/ChatWithAI';

function App() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'chat' | 'edit'>('upload');
  const [project, setProject] = useState<Project>({
    id: 'project_1',
    name: 'New Documentation Project',
    description: 'Manual annotation project',
    images: [],
    steps: [],
    template: {
      id: 'default',
      name: 'Default Template',
      format: 'html',
      styling: {
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14
      }
    },
    lastModified: new Date()
  });

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleImagesUpload = useCallback((newImages: UploadedImage[]) => {
    setProject(prev => ({
      ...prev,
      images: [...prev.images, ...newImages],
      lastModified: new Date()
    }));
  }, []);

  const handleRemoveImage = useCallback((imageId: string) => {
    setProject(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId),
      lastModified: new Date()
    }));
  }, []);

  const handleAnnotationUpdate = useCallback((imageId: string, annotations: any[]) => {
    setProject(prev => ({
      ...prev,
      images: prev.images.map(img => 
        img.id === imageId 
          ? { ...img, annotations }
          : img
      ),
      lastModified: new Date()
    }));
  }, []);

  const handleSaveProject = () => {
    const projectData = JSON.stringify(project, null, 2);
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_project.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowSaveDialog(false);
  };

  // Endpoint para enviar imágenes
  const N8N_IMAGE_ENDPOINT = 'https://aaron2003.app.n8n.cloud/webhook-test/51852b95-ca76-4caf-9022-67c4ba832b60';

  // Función para convertir un archivo a base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const [uploadingToN8N, setUploadingToN8N] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadNext = async () => {
    setUploadingToN8N(true);
    setUploadError(null);
    try {
      // Convertir todas las imágenes a base64
      const imagesWithBase64 = await Promise.all(
        project.images.map(async (img) => ({
          id: img.id,
          name: img.name,
          width: img.width,
          height: img.height,
          url: await fileToBase64(img.file)
        }))
      );
      // Enviar al endpoint
      const res = await fetch(N8N_IMAGE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesWithBase64 })
      });
      if (!res.ok) throw new Error('Error al enviar imágenes a n8n');
      setCurrentStep('chat');
    } catch (err: any) {
      setUploadError('No se pudieron enviar las imágenes a n8n. Intenta de nuevo.');
    } finally {
      setUploadingToN8N(false);
    }
  };

  useEffect(() => {
    if (currentStep !== 'edit' || !selectedImageId) return;

    const interval = setInterval(() => {
      fetch(`/.netlify/functions/annotations?imageId=${selectedImageId}`)
        .then(res => res.json())
        .then(data => {
          if (data.annotations && data.annotations.length > 0) {
            setProject(prev => ({
              ...prev,
              images: prev.images.map(img =>
                img.id === selectedImageId
                  ? { ...img, annotations: data.annotations }
                  : img
              ),
              lastModified: new Date()
            }));
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [currentStep, selectedImageId]);

  const renderStepNavigation = () => {
    const steps = [
      { id: 'upload', label: 'Upload Images', icon: Upload },
      { id: 'chat', label: 'Chat', icon: Edit },
      { id: 'edit', label: 'Edit & Annotate', icon: Edit }
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : isCompleted
                    ? 'border-green-500 bg-green-50 text-green-600'
                    : 'border-gray-300 text-gray-500 hover:border-gray-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {step.label}
              </button>
              {index < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-300" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <>
            <FileUpload
              onImagesUpload={handleImagesUpload}
              uploadedImages={project.images}
              onRemoveImage={handleRemoveImage}
            />
            {uploadError && (
              <div className="text-red-600 mt-2 text-center">{uploadError}</div>
            )}
            {project.images.length > 0 && (
              <div className="flex justify-end mt-6">
                <button
                  className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold disabled:opacity-50"
                  onClick={handleUploadNext}
                  disabled={uploadingToN8N}
                >
                  {uploadingToN8N ? 'Enviando imágenes...' : 'Siguiente'}
                </button>
              </div>
            )}
          </>
        );
      case 'chat':
        return (
          <>
            {project.images.length > 0 ? (
              <ChatWithAI
                images={project.images}
                selectedImageId={selectedImageId}
                setSelectedImageId={setSelectedImageId}
                onApplyAnnotations={handleAnnotationUpdate}
              />
            ) : (
              <div className="text-center text-gray-500">Sube imágenes para usar el chat.</div>
            )}
            <div className="flex justify-end mt-6">
              <button
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold disabled:opacity-50"
                onClick={() => setCurrentStep('edit')}
                disabled={project.images.length === 0}
              >
                Siguiente
              </button>
            </div>
          </>
        );
      case 'edit':
        return (
          <div className="space-y-6">
            {project.images.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Image to Edit</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {project.images.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageId(image.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedImageId === image.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-700 truncate">{image.name}</p>
                      <p className="text-xs text-gray-500">
                        {image.annotations.length} annotations
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedImageId && (
              <ImageAnnotationCanvas
                image={project.images.find(img => img.id === selectedImageId)!}
                annotations={project.images.find(img => img.id === selectedImageId)!.annotations}
                onChange={(newAnnotations) => {
                  setProject(prev => ({
                    ...prev,
                    images: prev.images.map(img =>
                      img.id === selectedImageId
                        ? { ...img, annotations: newAnnotations }
                        : img
                    ),
                    lastModified: new Date()
                  }));
                }}
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Manual Generator</h1>
                <p className="text-sm text-gray-500">Manual annotation tool</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Project
              </button>
              <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                <FolderOpen className="w-4 h-4 mr-2" />
                Load Project
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderStepNavigation()}
        {renderCurrentStep()}
      </main>
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Save Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => setProject(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={project.description}
                  onChange={(e) => setProject(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

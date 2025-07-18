import React, { useState } from 'react';
import { UploadedImage, Annotation } from '../types';

interface ChatWithAIProps {
  images: UploadedImage[];
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  onApplyAnnotations: (imageId: string, annotations: Annotation[]) => void;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  annotations?: Annotation[];
}

const N8N_ENDPOINT = 'https://aaron2003.app.n8n.cloud/webhook-test/5c086d2d-c2e0-4c4a-8487-df3d0e08fdd6';

const ChatWithAI: React.FC<ChatWithAIProps> = ({ images, selectedImageId, setSelectedImageId, onApplyAnnotations }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingAnnotations, setPendingAnnotations] = useState<Annotation[] | null>(null);

  const handleSend = async () => {
    if (!input.trim() || !selectedImageId) return;
    const userMsg: ChatMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(N8N_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, imageId: selectedImageId })
      });
      const data = await res.json();
      const aiMsg: ChatMessage = { sender: 'ai', text: data.reply, annotations: data.annotations };
      setMessages(prev => [...prev, aiMsg]);
      if (data.annotations && Array.isArray(data.annotations)) {
        setPendingAnnotations(data.annotations);
      } else {
        setPendingAnnotations(null);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Error al contactar la IA.' }]);
      setPendingAnnotations(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (pendingAnnotations && selectedImageId) {
      onApplyAnnotations(selectedImageId, [
        ...images.find(img => img.id === selectedImageId)?.annotations || [],
        ...pendingAnnotations
      ]);
      setPendingAnnotations(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Chat</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Selecciona una imagen para conversar:</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedImageId || ''}
          onChange={e => setSelectedImageId(e.target.value)}
        >
          <option value="" disabled>Selecciona una imagen</option>
          {images.map(img => (
            <option key={img.id} value={img.id}>{img.name}</option>
          ))}
        </select>
      </div>
      <div className="h-64 overflow-y-auto border rounded p-3 mb-4 bg-gray-50">
        {messages.length === 0 && <div className="text-gray-400">No hay mensajes aún.</div>}
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-3 py-2 rounded-lg max-w-xs ${msg.sender === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-200 text-gray-800'}`}>
              {msg.text}
              {msg.annotations && (
                <div className="mt-2 text-xs text-gray-500">({msg.annotations.length} sugerencias de anotación)</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          type="text"
          placeholder="Escribe tu mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={loading || !selectedImageId}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={handleSend}
          disabled={loading || !input.trim() || !selectedImageId}
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
      {pendingAnnotations && (
        <div className="mt-4 flex justify-end">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={handleApply}
          >
            Aplicar sugerencias ({pendingAnnotations.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatWithAI; 
// Configuración centralizada de n8n endpoints

export const N8N_CONFIG = {
  // Endpoint para envío de imágenes
  IMAGE_UPLOAD_ENDPOINT: 'https://aaron2003.app.n8n.cloud/webhook-test/51852b95-ca76-4caf-9022-67c4ba832b60',
  
  // Endpoint para chat con IA
  CHAT_ENDPOINT: 'https://aaron2003.app.n8n.cloud/webhook-test/5c086d2d-c2e0-4c4a-8487-df3d0e08fdd6',
  
  // Configuración de timeouts
  TIMEOUT: 30000, // 30 segundos
  
  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  }
};

// Función helper para hacer requests a n8n
export const sendToN8N = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: N8N_CONFIG.DEFAULT_HEADERS,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending to n8n:', error);
    throw error;
  }
};
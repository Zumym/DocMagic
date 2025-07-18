# Configuración de n8n para Manual Generator

## Flujo 1: Procesamiento de Imágenes

### Nodos requeridos:
1. **Webhook** 
   - URL: `/webhook-test/51852b95-ca76-4caf-9022-67c4ba832b60`
   - Método: POST
   - Respuesta: JSON

2. **Code Node - Procesar Imágenes**
```javascript
// Extraer imágenes del webhook
const images = $input.first().json.images;

// Procesar cada imagen (ejemplo: análisis básico)
const processedImages = images.map(img => ({
  id: img.id,
  name: img.name,
  dimensions: `${img.width}x${img.height}`,
  processed: true,
  timestamp: new Date().toISOString()
}));

return [{ json: { processedImages } }];
```

3. **HTTP Request - Responder a la App**
   - URL: `{{$node["Webhook"].json["callback_url"]}}` (si lo implementas)
   - Método: POST
   - Body: Resultado del procesamiento

## Flujo 2: Chat con IA

### Nodos requeridos:
1. **Webhook**
   - URL: `/webhook-test/5c086d2d-c2e0-4c4a-8487-df3d0e08fdd6`
   - Método: POST

2. **OpenAI Node** (o similar)
   - Prompt: "Analiza esta consulta sobre anotación de imágenes: {{$json.message}}"
   - Modelo: gpt-3.5-turbo o gpt-4

3. **Code Node - Generar Anotaciones**
```javascript
const userMessage = $input.first().json.message;
const imageId = $input.first().json.imageId;
const aiResponse = $input.first().json.choices[0].message.content;

// Generar anotaciones basadas en la respuesta de IA
const annotations = [];

// Ejemplo: si la IA menciona "botón", crear anotación
if (aiResponse.toLowerCase().includes('botón')) {
  annotations.push({
    id: `annotation_${Date.now()}`,
    type: 'text',
    x: Math.random() * 800 + 100,
    y: Math.random() * 400 + 100,
    text: 'Botón identificado por IA',
    fontSize: 16,
    fontFamily: 'Inter, sans-serif',
    color: '#3b82f6',
    background: 'white',
    align: 'below',
    borderColor: '#3b82f6',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

return [{
  json: {
    reply: aiResponse,
    annotations: annotations
  }
}];
```

## Variables de Entorno

Si quieres cambiar los endpoints, actualiza estas variables:

```javascript
// En src/App.tsx
const N8N_IMAGE_ENDPOINT = 'https://tu-instancia.n8n.cloud/webhook-test/tu-webhook-id';

// En src/components/ChatWithAI.tsx  
const N8N_ENDPOINT = 'https://tu-instancia.n8n.cloud/webhook-test/tu-webhook-id';
```

## Ejemplo de Flujo Completo

1. **Usuario sube imágenes** → App envía a n8n
2. **n8n procesa imágenes** → Análisis con IA/OCR
3. **Usuario hace pregunta en chat** → n8n responde con sugerencias
4. **n8n genera anotaciones** → App las muestra en el canvas
5. **Usuario edita anotaciones** → Se guardan localmente

## Testing

Para probar los webhooks:
```bash
curl -X POST https://aaron2003.app.n8n.cloud/webhook-test/5c086d2d-c2e0-4c4a-8487-df3d0e08fdd6 \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué puedo anotar?", "imageId": "test123"}'
```
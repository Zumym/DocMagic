// In-memory storage for annotations (in production, use a database)
let annotations = [];

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const path = event.path;
  const method = event.httpMethod;

  try {
    if (method === 'POST' && path.includes('/annotations')) {
      const { imageId, annotations: imageAnnotations } = JSON.parse(event.body);
      
      if (!imageId || !imageAnnotations) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing imageId or annotations' }),
        };
      }

      // Store or update annotations for this image
      const existingIndex = annotations.findIndex(item => item.imageId === imageId);
      
      if (existingIndex !== -1) {
        annotations[existingIndex] = { imageId, annotations: imageAnnotations, timestamp: new Date() };
      } else {
        annotations.push({ imageId, annotations: imageAnnotations, timestamp: new Date() });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Annotations saved successfully' }),
      };
    }

    if (method === 'GET' && path.includes('/annotations')) {
      const imageId = event.queryStringParameters?.imageId;
      
      if (imageId) {
        const imageAnnotations = annotations.find(item => item.imageId === imageId);
        if (imageAnnotations) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(imageAnnotations),
          };
        } else {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Annotations not found for this image' }),
          };
        }
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(annotations),
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
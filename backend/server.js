const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// In-memory storage for annotations (in production, use a database)
let annotations = [];

// Routes
app.post('/api/annotations', (req, res) => {
  try {
    const { imageId, annotations: imageAnnotations } = req.body;
    
    if (!imageId || !imageAnnotations) {
      return res.status(400).json({ error: 'Missing imageId or annotations' });
    }

    // Store or update annotations for this image
    const existingIndex = annotations.findIndex(item => item.imageId === imageId);
    
    if (existingIndex !== -1) {
      annotations[existingIndex] = { imageId, annotations: imageAnnotations, timestamp: new Date() };
    } else {
      annotations.push({ imageId, annotations: imageAnnotations, timestamp: new Date() });
    }

    res.json({ success: true, message: 'Annotations saved successfully' });
  } catch (error) {
    console.error('Error saving annotations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/annotations', (req, res) => {
  try {
    const { imageId } = req.query;
    
    if (imageId) {
      const imageAnnotations = annotations.find(item => item.imageId === imageId);
      if (imageAnnotations) {
        res.json(imageAnnotations);
      } else {
        res.status(404).json({ error: 'Annotations not found for this image' });
      }
    } else {
      res.json(annotations);
    }
  } catch (error) {
    console.error('Error retrieving annotations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// In-memory storage for annotations (keyed by imageId)
let annotationsStore = {};

// Endpoint to receive annotation results from n8n
app.post('/api/annotations', (req, res) => {
  const { annotations } = req.body;
  if (!Array.isArray(annotations)) {
    return res.status(400).json({ error: 'Invalid format: annotations array required.' });
  }
  // Store annotations by imageId
  annotations.forEach(imageAnn => {
    if (imageAnn.imageId && Array.isArray(imageAnn.annotations)) {
      annotationsStore[imageAnn.imageId] = imageAnn.annotations;
    }
  });
  res.json({ status: 'ok', stored: Object.keys(annotationsStore).length });
});

// Endpoint to get annotations for a given imageId (or all)
app.get('/api/annotations', (req, res) => {
  const { imageId } = req.query;
  if (imageId) {
    return res.json({ annotations: annotationsStore[imageId] || [] });
  }
  // Return all
  res.json({ annotations: annotationsStore });
});

app.listen(PORT, () => {
  console.log(`Annotation backend listening on port ${PORT}`);
}); 
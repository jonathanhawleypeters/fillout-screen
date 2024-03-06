const express = require('express');
const { fetchSubmissions } = require('./src/fillout-api');
const { valid } = require('./src/filter-helpers');
const { payload } = require('./src/response-payload');

const port = process.env.PORT || 10000;

const app = express();

app.get('/:formId/filteredResponses', async (req, res) => {
  if (req.query.filters) {
    const filters = JSON.parse(req.query.filters);

    if (!Array.isArray(filters)) {
      res.status(400).json({ message: "Malformed Request: filters must be an array" });
      return;
    }

    if (filters.find(filter => !valid(filter))) {
      res.status(400).json({ message: "Malformed Request: invalid filter" });
      return;
    }
  }

  try {
    const submissions = await fetchSubmissions(req, res);

    res.json(payload(req, submissions));
  } catch (error) {
    res.status(500).json({ message: error.message });

    console.error('Error fetching responses:', error);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

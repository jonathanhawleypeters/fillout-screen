const express = require('express');
const fetch = require('node-fetch');

const port = process.env.PORT || 10000;

const apiKey = 'sk_prod_TfMbARhdgues5AuIosvvdAC9WsA5kXiZlW8HZPaRDlIbCpSpLsXBeZO7dCVZQwHAY3P4VSBPiiC33poZ1tdUj2ljOzdTCCOSpUZ_3912';

const app = express();

const paramsFromRequest = (req) => {
  const { afterDate, beforeDate, status, includeEditLink, sort } = req.query;
  return new URLSearchParams({
    ...(beforeDate ? { beforeDate } : {}),
    ...(afterDate ? { afterDate } : {}),
    ...(status ? { status } : {}),
    ...(includeEditLink ? { includeEditLink } : {}),
    ...(sort ? { sort } : {})
  });
}

const apiRequest = (req, offset) => {
  const formId = req.params.formId;

  const queryParams = paramsFromRequest(req);

  if (Number.isInteger(offset)) {
    queryParams.set("offset", offset);
  }
  
  return fetch(`https://api.fillout.com/v1/api/forms/${formId}/submissions${queryParams.size > 0 ? `?${queryParams}` : ''}`, {
    headers: {
        Authorization: `Bearer ${apiKey}`
    },
  });
}

const fetchResponses = async (req, res) => {
  const response = await apiRequest(req);

  const data = await response.json();

  const { totalResponses, responses } = data;

  const allResponses = [responses];
  let offset = 150;

  while (offset < totalResponses) {
    const response = await apiRequest(req, offset);
    const data = await response.json();
    allResponses.push(data.responses);

    offset += 150;
  }
  
  return allResponses.flat();
};

const filterFunctions = {
  equals: (a, b) => a === b,
  does_not_equal: (a, b) => a !== b,
  greater_than: (a, b) => a > b,
  less_than: (a, b) => a < b, 
};

const valid = (filter) => {
  return typeof filter.id === 'string' &&
    Boolean(filterFunctions[filter.condition]) &&
    (typeof filter.value === 'string' || typeof filter.value === 'number')
}

const payload = (req, data) => {
  const { filters = "[]", limit = 150, offset = 0 } = req.query;
  const parsedFilters = JSON.parse(filters);
  const parsedLimit = parseInt(limit);
  const parsedOffset = parseInt(offset);

  const filteredResponses = (Array.isArray(parsedFilters) && parsedFilters.length)
    ? data.filter(response => {
      if (!Array.isArray(response.questions)) return true;

      return parsedFilters.every(filter => {
        if (!valid(filter)) return true;

        const { id, condition, value } = filter;
        const field = response.questions.find((question) => question?.id === id);

        if (!field) return false;

        const fieldValue = field.value;

        if (fieldValue === undefined || fieldValue === null) return false;

        return filterFunctions[condition](fieldValue, value);
      });
    })
    : data;

  return {
    responses: filteredResponses.slice(parsedOffset, parsedOffset + limit),
    totalResponses: filteredResponses.length,
    pageCount: Math.ceil(filteredResponses.length / parsedLimit)
  }
}

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

  if (!req.method === "GET") {
    req.status(405).json({ message: "Method Not Allowed"});
    return;
  }

  try {
    const allResponses = await fetchResponses(req, res);

    res.json(payload(req, allResponses));
  } catch (error) {
    res.status(500).json({ message: error.message });

    console.error('Error fetching responses:', error);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

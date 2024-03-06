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
  const formId = req.formId;

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

const fetchResponses = async (req) => {
    try {
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
    } catch (error) {
        console.error('Error fetching responses:', error);
    }
};

const filterFunctions = {
  equals: (a, b) => a === b,
  does_not_equal: (a, b) => a !== b,
  greater_than: (a, b) => a > b,
  less_than: (a, b) => a < b, 
};

const payload = (req, data) => {
    const { filters = "[]", limit = 150, offset = 0 } = req.query;
    const parsedFilters = JSON.parse(filters);
    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    console.log(JSON.stringify(data, null, 2), parsedFilters, parsedLimit, parsedOffset, "query", req.query);

    const filteredResponses = filters.length ? data.filter(response => {
      return parsedFilters.every(filter => {
        const { id, condition, value } = filter;
        const { value: fieldValue } = response.questions.find(({ id: fieldId }) => fieldId === id);
        if (fieldValue === undefined) return true;

        return filterFunctions[condition](fieldValue, value);
      });
    }) : data;

    console.log("filtered responses", JSON.stringify(filteredResponses, null, 2))

    return {
      responses: filteredResponses.slice(parsedOffset, parsedOffset + limit),
      totalResponses: filteredResponses.length,
      pageCount: Math.ceil(filteredResponses.length / parsedLimit)
    }
}

app.get('/:formId/filteredResponses', async (req, res) => {
    const allResponses = await fetchResponses(req);
    
    res.json(payload(req, allResponses));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const fetch = require('node-fetch');
const apiKey = process.env.FILLOUT_API_KEY;

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

const fetchSubmissions = async (req) => {
  const response = await apiRequest(req);

  const data = await response.json();

  const { totalResponses, responses } = data;

  const allResponses = [responses];
  let offset = 150;

  // in the real world, we'd want to filter these responses
  // and check if we can satisfy the offset + limit
  // for this exercise, I don't want to mix querying and filtering
  // also, in a real implementation, we might cache responses
  // briefly to conserve requests for paginated calls to this API
  // but that gets complex fast
  while (offset < totalResponses) {
    const response = await apiRequest(req, offset);
    const data = await response.json();
    allResponses.push(data.responses);

    offset += 150;
  }
  
  return allResponses.flat();
};

module.exports = { fetchSubmissions };

const { filterFunctions } = require('./filter-helpers');

const queryParameters = ({ filters = "[]", limit = 150, offset = 0 } /* req.query */ ) => {
  return {
    filters: JSON.parse(filters),
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
}

const filteredSubmissions = (submissions, filters) => {
  return filters.length
    ? submissions.filter(submission => {
        if (!Array.isArray(submission.questions)) return false;

        return filters.every(filter => {
          const { id, condition, value } = filter;

          const field = submission.questions
            .find((question) => question?.id === id);

          if (!field) return false;
          
          if (field.value === undefined || field.value === null) return false;

          return filterFunctions[condition](field.value, value);
        });
      })
    : submissions;
}

const payload = (req, submissions) => {
  const { filters, limit, offset } = queryParameters(req.query);

  const filteredResponses = filteredSubmissions(submissions, filters);

  return {
    responses: filteredResponses.slice(offset, offset + limit),
    totalResponses: filteredResponses.length,
    pageCount: Math.ceil(filteredResponses.length / limit)
  }
}

module.exports = { payload };



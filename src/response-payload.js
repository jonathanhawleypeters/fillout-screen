const { filterFunctions } = require('./filter-helpers');

const queryParameters = ({ filters = "[]", limit = 150, offset = 0 } /* req.query */ ) => {
  return {
    filters: JSON.parse(filters),
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
}

const match = (question, filter) => {
  if (!question || question.value === undefined || question.value === null) return false;
  return filterFunctions[filter.condition](question.value, filter.value);
};

const questionsMatch = (submission, filters) => {
  if (!Array.isArray(submission.questions)) return false;
  return filters.every(filter => {
    const question = submission.questions.find(q => q?.id === filter.id);
    return match(question, filter);
  });
};

const filteredSubmissions = (submissions, filters) => {
  if (!filters.length) return submissions;
  return submissions.filter(submission => questionsMatch(submission, filters));
};

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



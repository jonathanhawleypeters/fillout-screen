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

module.exports = { filterFunctions, valid };


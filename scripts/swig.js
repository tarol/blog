const swig = require("swig-templates");
var _ = require("lodash");

function useFilter(swig, filter) {
  if (filter === undefined) {
    return Object.keys(_).forEach(function(action) {
      if (lodashHas(action)) useFilter(swig, action);
    });
  }

  if (Array.isArray(filter)) {
    return filter.forEach(function(f) {
      useFilter(swig, f);
    });
  }

  if (lodashHas(filter)) swig.setFilter(filter, _[filter]);
  else throw new Error(filter + " is not a lodash function");
}

function lodashHas(functionName) {
  return _[functionName] && typeof _[functionName] === "function";
}

useFilter(swig);

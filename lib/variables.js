(function() {
  var name, variables;

  variables = {
    ERP_CLIENT: "sorter",
    ERP_LOGIN: "sorter",
    ERP_PASSWORD: "sorter"
  };

  (function() {
    var results;
    results = [];
    for (name in variables) {
      if (process.env[name] != null) {
        results.push(variables[name] = process.env[name]);
      }
    }
    return results;
  })();

  module.exports = variables;

}).call(this);

(function() {
  var colors;

  colors = require("colors");

  global.logDebug = process.env.tom_log_debug !== "0";

  global.logInfo = process.env.tom_log_info !== "0";

  global.logWarn = process.env.tom_log_warn !== "0";

  global.logError = process.env.tom_log_error !== "0";

  ({
    error: function(tag, ...remaining) {
      var options;
      options = remaining.join(' ');
      return console.error(tag, options);
    },
    warn: function(tag, ...remaining) {
      var options;
      options = remaining.join(' ');
      return console.error(tag, options);
    },
    info: function(tag, ...remaining) {
      var options;
      options = remaining.join(' ');
      return console.error(tag, options);
    },
    debug: function(tag, ...remaining) {
      var options;
      options = remaining.join(' ');
      return console.error(tag, options);
    }
  });

  global.debug = function(tag, ...remaining) {
    var options;
    if (global.logDebug === true) {
      options = remaining.join(' ');
      return console.log(colors.gray((new Date()).toISOString().substring(0, 19)), colors.blue('debug'), colors.gray(tag), options);
    }
  };

  global.info = function(tag, ...remaining) {
    var options;
    if (global.logInfo === true) {
      options = remaining.join(' ');
      return console.log(colors.gray((new Date()).toISOString().substring(0, 19)), colors.green('info'), colors.gray(tag), options);
    }
  };

  global.warn = function(tag, ...remaining) {
    var options;
    if (global.logWarn === true) {
      options = remaining.join(' ');
      return console.log(colors.gray((new Date()).toISOString().substring(0, 19)), colors.yellow('warning'), colors.gray(tag), options);
    }
  };

  global.error = function(tag, ...remaining) {
    var options;
    if (global.logError === true) {
      options = remaining.join(' ');
      return console.log(colors.gray((new Date()).toISOString().substring(0, 19)), colors.red('error'), colors.gray(tag), options);
    }
  };

}).call(this);

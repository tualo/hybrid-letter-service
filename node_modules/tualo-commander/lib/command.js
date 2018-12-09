(function() {
  var Command;

  module.exports = Command = (function() {
    class Command {
      static help() {
        return "    ";
      }

      action(program, options) {
        return console.log(options);
      }

    };

    Command.commandArgs = [];

    Command.options = [];

    return Command;

  }).call(this);

}).call(this);

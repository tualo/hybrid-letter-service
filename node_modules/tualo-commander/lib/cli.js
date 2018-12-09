(function() {
  var Cli, path, program;

  path = require('path');

  program = require('commander');

  module.exports = Cli = class Cli {
    constructor() {
      this.cmdPath = path.resolve(process.mainModule.filename, '..', '..', 'lib', 'commands');
      this.pck = {
        version: 'none'
      };
      try {
        this.pck = require(path.join(process.mainModule.filename, '..', '..', 'package.json'));
      } catch (error) {
        this.pck = {
          version: 'none'
        };
      }
      this.cmdFileExtension = '.js';
    }

    //set the pathname where to find the commands
    commands(pathName) {
      return this.cmdPath = pathName;
    }

    //set the file extension, defaults to js
    extension(ext) {
      return this.cmdFileExtension = ext;
    }

    //set the module package
    package(pck) {
      return this.pck = pck;
    }

    main(cmdName) {
      var c, cmd, cmdL, command, commandList, commands, i, j, len, len1, name, op, opts;
      commandList = require('./reqall')(this.cmdPath, this.cmdFileExtension);
      commands = [];
      (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = commandList.length; i < len; i++) {
          name = commandList[i];
          if (name !== 'command.js') {
            results.push(commands.push(require(path.join(this.cmdPath, path.basename(name)))));
          }
        }
        return results;
      }).call(this);
      program.version(this.pck.version);
      if (cmdName != null) {
        cmd = null;
        for (i = 0, len = commands.length; i < len; i++) {
          command = commands[i];
          if (command.commandName === cmdName) {
            cmd = command;
          }
        }
        if (cmd != null) {
          (function() {
            var j, len1, ref, results;
            ref = cmd.options;
            results = [];
            for (j = 0, len1 = ref.length; j < len1; j++) {
              op = ref[j];
              results.push(program.option(op.parameter, op.description));
            }
            return results;
          })();
          opts = [];
          (function() {
            var j, len1, ref, results;
            ref = cmd.commandArgs;
            results = [];
            for (j = 0, len1 = ref.length; j < len1; j++) {
              op = ref[j];
              results.push(opts.push('<' + op + '>'));
            }
            return results;
          })();
          if (opts.length === 0) {
            c = new cmd();
            program.parse(process.argv);
            return c.action(program);
          } else {
            program.arguments(opts.join(' ')).action(function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
              var arg, index, j, len1, ref;
              arg = {};
              index = 0;
              ref = cmd.commandArgs;
              for (j = 0, len1 = ref.length; j < len1; j++) {
                name = ref[j];
                if (index === 0) {
                  arg[name] = a0;
                }
                if (index === 1) {
                  arg[name] = a1;
                }
                if (index === 2) {
                  arg[name] = a2;
                }
                if (index === 3) {
                  arg[name] = a3;
                }
                if (index === 4) {
                  arg[name] = a4;
                }
                if (index === 5) {
                  arg[name] = a5;
                }
                if (index === 6) {
                  arg[name] = a6;
                }
                if (index === 7) {
                  arg[name] = a7;
                }
                if (index === 8) {
                  arg[name] = a8;
                }
                if (index === 9) {
                  arg[name] = a9;
                }
                if (index === 10) {
                  arg[name] = a10;
                }
                if (index === 11) {
                  arg[name] = a11;
                }
                if (index === 12) {
                  arg[name] = a12;
                }
                if (index === 13) {
                  arg[name] = a13;
                }
                if (index === 14) {
                  arg[name] = a14;
                }
                if (index === 15) {
                  arg[name] = a15;
                }
                index++;
              }
              c = new cmd();
              return c.action(program, arg);
            });
            program.on('--help', function() {
              console.log(cmd.help());
              return console.log("");
            });
            return program.parse(process.argv);
          }
        }
      } else {
        for (j = 0, len1 = commands.length; j < len1; j++) {
          command = commands[j];
          opts = [];
          (function() {
            var k, len2, ref, results;
            ref = command.commandArgs;
            results = [];
            for (k = 0, len2 = ref.length; k < len2; k++) {
              op = ref[k];
              results.push(opts.push('<' + op + '>'));
            }
            return results;
          })();
          cmdL = [command.commandName].concat(opts);
          program.command(cmdL.join(' '), command.commandShortDescription);
        }
        return program.parse(process.argv);
      }
    }

  };

}).call(this);

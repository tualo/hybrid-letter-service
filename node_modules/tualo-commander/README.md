# tualo-commander
[![Build Status](https://secure.travis-ci.org/tualo/tualo-commander.png)](http://travis-ci.org/tualo/tualo-commander)
[![endorse](https://api.coderwall.com/thomashoffmann1979/endorsecount.png)](https://coderwall.com/thomashoffmann1979)

tualo-commander is a generic git style command line library.

## Usage

The snippets below show how it works:

Create a file `mycommand` in `./bin`
```
#!/usr/bin/env node
Cli = require('../lib/main').Cli;
cli = new Cli();
cli.commands(__dirname+'/commands');
cli.extension('.js');
cli.main();
```

Create a file `mycommand-sample` in `./bin`
```
#!/usr/bin/env node
path = require('path');
Cli = require('../lib/main').Cli;
cli = new Cli();
cli.commands(path.join(__dirname,'..','lib','commands'));
cli.extension('.js');
cli.main('sample');
```

Create a file `sample.js` in `./lib/commands`
```

Command = require('../../lib/main').Command;

// sample command
Sample = function(){

}

Sample.commandName = 'sample';
Sample.commandArgs = ['my','command','list'];
Sample.options = [
  {
    parameter: "-d,--debug",
    description: "enable debug mode"
  }
];

Sample.commandShortDescription = 'my command description';

Sample.help = function() {
  return "put your help text here";
};

Sample.prototype.action = function(opts, args){
  // do your command stuff here
}


module.exports = Sample;
```

Now you can use:
```
mycommand help
mycommand help sample
mycommand sample
```

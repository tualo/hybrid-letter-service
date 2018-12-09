
Command = require('../../lib/main').Command;

// sample command
Sample = function(){

}

Sample.commandName = 'sample';
Sample.commandArgs = ['my','command','list'];
Sample.options = [
  {
    parameter: "-d, --debug",
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

#!/usr/bin/env node
Cli = require('../lib/main').Cli;
cli = new Cli();
cli.commands(__dirname+'/commands');
cli.extension('.js');
cli.main('sample');

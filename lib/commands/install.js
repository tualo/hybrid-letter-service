(function() {
  var Command, Install, fs, path, spawn;

  ({Command} = require('tualo-commander'));

  path = require('path');

  fs = require('fs');

  spawn = require('child_process').spawn;

  module.exports = Install = (function() {
    class Install extends Command {
      static help() {
        return "";
      }

      resetTimeoutTimer() {
        this.stopTimeoutTimer();
        return this.timeout_timer = setTimeout(this.close.bind(this), this.timeout);
      }

      stopTimeoutTimer() {
        if (this.timeout_timer) {
          clearTimeout(this.timeout_timer);
        }
        return this.timeout_timer = setTimeout(this.close.bind(this), this.timeout);
      }

      action(options, args) {
        var servicefiledata;
        if (args.jobpath) {
          servicefiledata = "[Unit]\nDescription=Hybrid Letter Service\nAfter=network.target\n[Service]\nRestart=always\nExecStart={cmd}\nUser=root\nStandardOutput=syslog\nStandardError=syslog\nSyslogIdentifier=hls\nEnvironment=NODE_ENV=production\n\n[Install]\nWantedBy=multi-user.target";
          servicefiledata = servicefiledata.replace('{cmd}', path.resolve(__dirname, '..', '..', 'bin', 'hls-httpserver') + ' ' + args.port + ' ' + args.jobpath);
          console.log(servicefiledata);
          fs.writeFileSync('/etc/systemd/system/hls.service', servicefiledata);
          console.log('Now run:');
          console.log('systemctl daemon-reload');
          return console.log('systemctl enable bbs');
        }
      }

    };

    Install.commandName = 'install';

    Install.commandArgs = ['port', 'jobpath'];

    Install.commandShortDescription = 'install the systemd service';

    Install.options = [];

    return Install;

  }).call(this);

}).call(this);

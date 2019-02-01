(function() {
  var Command, GenerateOMR, fs, glob, os, path;

  ({Command} = require('tualo-commander'));

  path = require('path');

  fs = require('fs');

  os = require('os');

  glob = require('glob');

  module.exports = GenerateOMR = (function() {
    class GenerateOMR extends Command {
      static help() {
        return "";
      }

      action(options, args) {
        var code, i, j, lines, me, results, txt;
        me = this;
        if (args.path) {
          results = [];
          for (i = j = 0; j <= 31; i = ++j) {
            //console.log 'here', "1"+("00000" + i.toString(2) ).slice(-5)+"1"
            code = "1" + ("00000" + i.toString(2)).slice(-5) + "1";
            lines = me.setOMR(code);
            txt = '%!' + "\n";
            txt += '<<' + "\n";
            txt += '    /PageSize [595 842]' + "\n";
            txt += '    /EndPage {' + "\n";
            txt += '        exch pop 2 lt {' + "\n";
            txt += '            gsave' + "\n";
            txt += lines;
            txt += '            grestore' + "\n";
            txt += '            true' + "\n";
            txt += '        } { false } ifelse' + "\n";
            txt += '    }bind' + "\n";
            txt += '>>setpagedevice' + "\n";
            results.push(fs.writeFileSync(path.join(args.path, code + '.ps'), txt));
          }
          return results;
        }
      }

      toPT(mm) {
        return (mm / 25.4) * 72;
      }

      setOMR(omr) {
        var i, j, l, len, p, sp, txt, x, y_start, ys;
        txt = "";
        ys = 4.23;
        l = 6;
        x = 4;
        y_start = 297 - 250;
        p = omr.split("");
        for (j = 0, len = p.length; j < len; j++) {
          i = p[j];
          if (i === "1") {
            //doc.lineWidth( @toPT(0.4))
            //doc.moveTo( @toPT(x), @toPT(y_start) ).lineTo( @toPT(x+l), @toPT(y_start) ).stroke()
            sp = '             ';
            txt += sp + "newpath" + "\n";
            txt += sp + this.toPT(x) + " " + (this.toPT(297) - this.toPT(y_start)) + " moveto" + "\n";
            txt += sp + this.toPT(x + l) + " " + (this.toPT(297) - this.toPT(y_start)) + " lineto" + "\n";
            txt += sp + this.toPT(0.4) + " setlinewidth" + "\n";
            txt += sp + "stroke" + "\n";
          }
          y_start += ys;
        }
        return txt;
      }

    };

    GenerateOMR.commandName = 'generateomr';

    GenerateOMR.commandArgs = ['path'];

    GenerateOMR.commandShortDescription = 'running the bbs machine controll service';

    GenerateOMR.options = [];

    return GenerateOMR;

  }).call(this);

}).call(this);

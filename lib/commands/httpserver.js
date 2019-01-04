(function() {
  var Command, HttpServer, PDFDocument, app, bbs, colorprinter, fs, glob, grayprinter, http, mkdirp, os, parseString, path, spawn;

  ({Command} = require('tualo-commander'));

  path = require('path');

  fs = require('fs');

  os = require('os');

  glob = require('glob');

  mkdirp = require('mkdirp');

  ({spawn} = require('child_process'));

  PDFDocument = require('pdfkit');

  app = require('express')();

  http = require('http').Server(app);

  bbs = require('../main');

  parseString = require('xml2js').parseString;

  grayprinter = '';

  colorprinter = '';

  module.exports = HttpServer = (function() {
    class HttpServer extends Command {
      static help() {
        return "";
      }

      action(options, args) {
        var me;
        me = this;
        if (args.port) {
          this.args = args;
          this.prnNumber = 10000;
          this.tempdir = path.join(os.tmpdir(), 'hls');
          //'/Users/thomashoffmann/Desktop/hybrid-test'
          mkdirp(this.tempdir, function(err) {
            if (err) {
              console.error(err);
            }
            return fs.copyFileSync(path.resolve(path.join('.', 'images', 'blank.png')), path.join(me.tempdir, 'blank.png'));
          });
          this.openExpressServer();
          return mkdirp(path.resolve(path.join('.', 'config')), function(err) {
            if (err) {
              console.error(err);
            }
            return me.sequencesStore = me.readSequences();
          });
        }
      }

      openExpressServer() {
        var bodyParser, express;
        express = require('express');
        bodyParser = require('body-parser');
        app = express();
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
          extended: true
        }));
        app.use('/hls/app', express.static(path.join('.', 'www', 'app')));
        app.use('/app', express.static(path.join('.', 'www', 'app')));
        app.use('/hls/preview', express.static(this.tempdir));
        app.get('/hls/', (req, res) => {
          var result;
          result = {
            success: true
          };
          return res.send(JSON.stringify(result));
        });
        app.get('/hls/hybrid/list', (req, res) => {
          var prms, result;
          result = {
            success: true
          };
          return prms = this.globJobFiles().then(function(data) {
            result.data = data;
            return res.send(JSON.stringify(result));
          }).catch(function(data) {
            result.success = false;
            result.msg = "Fehler beim Lesen der Aufträge";
            return res.send(JSON.stringify(result));
          });
        });
        app.get('/hls/hybrid/preview', (req, res) => {
          var me, prms, result;
          me = this;
          result = {
            success: true
          };
          return prms = me.globJobFiles().then(function(data) {
            var prms2;
            return prms2 = me.processJobFilesPNGPages(data).then(function(data) {
              result.data = me.processJobFilesPNGList(data);
              return res.send(JSON.stringify(result));
            }).catch(function(data) {
              result.success = false;
              result.msg = "Fehler beim Vorbereiten der Aufträge";
              return res.send(JSON.stringify(result));
            });
          }).catch(function(data) {
            result.success = false;
            result.msg = "Fehler beim Vorbereiten der Aufträge";
            return res.send(JSON.stringify(result));
          });
        });
        app.post('/hls/hybrid/print', (req, res) => {
          var file, files, fn, index, j, len, me, params, printerName, result, results, running;
          me = this;
          result = {
            success: true
          };
          files = JSON.parse(req.body.files);
          running = Array(files.length).fill(1);
          results = [];
          for (index = j = 0, len = files.length; j < len; index = ++j) {
            file = files[index];
            printerName = 'vario';
            if (file.indexOf('color')) {
              printerName = 'color';
            }
            params = [];
            params.push('-J' + file);
            params.push('-o');
            params.push('sides=two-sided-long-edge');
            params.push('-o');
            params.push('Duplex=DuplexNoTumble');
            params.push('-P');
            params.push(printerName);
            params.push(path.join(me.tempdir, file));
            fn = function(index) {
              var prms;
              return prms = me.runcommand('lpr', params).then(function(data, opt) {
                result.success = true;
                result.msg = "Gedruckt";
                result.data = data;
                running[index] = 0;
                if (running.reduce(me._sum, 0) === 0) {
                  return res.send(JSON.stringify(result));
                }
              }).catch(function(data) {
                result.success = false;
                result.data = data;
                running[index] = 0;
                result.msg = "Fehler beim Drucken (" + printerName + ")";
                if (running.reduce(me._sum, 0) === 0) {
                  return res.send(JSON.stringify(result));
                }
              });
            };
            results.push(fn(index));
          }
          return results;
        });
        app.get('/hls/hybrid/pdfpages', (req, res) => {
          var me, prms, result;
          me = this;
          result = {
            success: true
          };
          return prms = me.globJobFiles().then(function(data) {
            var prms2;
            data = me.processJobFilesPNGList(data);
            return prms2 = me.processCreatePDF(data).then(function(data) {
              console.log(data);
              result.data = data;
              return res.send(JSON.stringify(result));
            }).catch(function(data) {
              result.success = false;
              result.msg = "Fehler beim Vorbereiten der Aufträge";
              return res.send(JSON.stringify(result));
            });
          }).catch(function(data) {
            result.success = false;
            result.msg = "Fehler beim Vorbereiten der Aufträge";
            return res.send(JSON.stringify(result));
          });
        });
        return app.listen(this.args.port, '0.0.0.0');
      }

      runcommand(cmd, param, opt) {
        return new Promise(function(resolve, reject) {
          var e, errorText, hasError, outputText, prg;
          try {
            prg = spawn(cmd, param);
            hasError = false;
            errorText = "";
            outputText = "";
            prg.stdout.on('data', function(data) {
              return outputText += data.toString() + "\n";
            });
            prg.stderr.on('data', function(data) {
              errorText += data.toString() + "\n";
              return hasError = true;
            });
            return prg.on('close', function(code) {
              if (hasError) {
                console.error("ERROR", errorText);
                return reject(errorText, opt);
              } else {
                return resolve(outputText, opt);
              }
            });
          } catch (error) {
            e = error;
            console.error('X', e);
            return reject(e, opt);
          }
        });
      }

      _sum(pv, cv) {
        return pv + cv;
      }

      // start converting parallel
      // running keeps the state of all still running proceses
      processJobFilesPNGPages(liste) {
        var me;
        me = this;
        return new Promise(function(resolve, reject) {
          var listFN, running;
          running = Array(liste.length).fill(1);
          listFN = function(index) {
            var device, dirname, filename, item, prms;
            if (index < liste.length) {
              item = liste[index];
              filename = path.basename(item.file).replace('.xml', '.pdf');
              dirname = path.dirname(item.file);
              device = 'pngalpha';
              if (item.color === 'Schwarz/Weiß') {
                device = 'pnggray';
              }
              prms = me.printablePages(dirname, filename, device).then(function(data) {
                running[index] = 0;
                if (running.reduce(me._sum, 0) === 0) {
                  return resolve(liste);
                }
              }).catch(function(data) {
                return reject(data);
              });
              return listFN(index + 1);
            } else {

            }
          };
          return listFN(0);
        });
      }

      printablePages(dirname, filename, device) {
        var me;
        me = this;
        return new Promise(function(resolve, reject) {
          var params, prms;
          params = [];
          params.push('-q');
          params.push('-dNOPAUSE');
          params.push('-dBATCH');
          params.push('-sDEVICE=' + device);
          params.push('-r600');
          params.push('-sOutputFile=' + path.join(me.tempdir, filename) + '%05d.png');
          params.push(path.join(dirname, filename));
          return prms = me.runcommand('gs', params).then(function(data) {
            console.log('data', data);
            return resolve(data);
          }).catch(function(data) {
            return reject(data);
          });
        });
      }

      processJobFilesPNGList(liste) {
        var baseitem, dirname, filename, item, j, l, len, len1, len2, list, m, me, n, p, pngliste, q, seq, sequence, sequenceNum;
        me = this;
        list = [];
        n = 0;
        sequence = 0;
        for (j = 0, len = liste.length; j < len; j++) {
          item = liste[j];
          filename = path.basename(item.file, '.xml');
          dirname = path.dirname(item.file);
          pngliste = glob.sync(path.join(me.tempdir, filename) + '*.png');
          p = 0;
          for (m = 0, len1 = pngliste.length; m < len1; m++) {
            l = pngliste[m];
            baseitem = JSON.parse(JSON.stringify(item, null, 1));
            baseitem.num = n++;
            baseitem.id = baseitem.num;
            baseitem.image = l;
            baseitem.preview = path.join('../preview', path.basename(l));
            baseitem.newletter = p === 0;
            baseitem.lastpage = false;
            baseitem.sequence = sequence;
            baseitem.printpage = true;
            baseitem.omr = '---';
            baseitem.pagenum = p;
            list.push(baseitem);
            p += 1;
            sequence += 1;
            if (item.layout === "Einseitig") {
              //leerseite einfügen
              baseitem = JSON.parse(JSON.stringify(item, null, 1));
              baseitem.num = n++;
              baseitem.id = baseitem.num;
              baseitem.image = path.join(me.tempdir, 'blank.png');
              baseitem.preview = path.join('../preview', 'blank.png');
              baseitem.newletter = p === 0;
              baseitem.lastpage = false;
              baseitem.sequence = sequence;
              baseitem.printpage = true;
              baseitem.omr = '---';
              baseitem.pagenum = p;
              list.push(baseitem);
              p += 1;
              sequence += 1;
            }
            if (list[list.length - 1].pagenum % 2 === 0) {
              // letzte seite ungerade, eine leere einfügen
              baseitem = JSON.parse(JSON.stringify(list[list.length - 1], null, 1));
              baseitem.num = n++;
              baseitem.id = baseitem.num;
              baseitem.image = path.join(me.tempdir, 'blank.png');
              baseitem.preview = path.join('../preview', 'blank.png');
              baseitem.newletter = p === 0;
              baseitem.lastpage = false;
              baseitem.sequence = sequence;
              baseitem.printpage = true;
              baseitem.omr = '---';
              baseitem.pagenum = p;
              list.push(baseitem);
              p += 1;
              sequence += 1;
            }
            if (sequence !== 0) {
              if (list[sequence - 1]) {
                list[sequence - 1].lastpage = true;
                if (list[sequence - 1].pagenum % 2 === 1) {
                  // frontseite zur letzten erklären
                  list[sequence - 2].lastpage = true;
                }
              }
            }
          }
        }
        sequenceNum = 0;
        for (q = 0, len2 = list.length; q < len2; q++) {
          item = list[q];
          if (typeof me.sequencesStore[item.color + '|' + item.envelope] === 'undefined') {
            me.sequencesStore[item.color + '|' + item.envelope] = 0;
          }
          sequenceNum = me.sequencesStore[item.color + '|' + item.envelope];
          if (item.pagenum % 2 === 0) {
            seq = sequenceNum.toString(2).substr(-3); //;//.split("").reverse().join("")
            sequenceNum += 1;
            while (seq.length < 3) {
              seq = '0' + seq;
            }
            seq = '1' + 'x' + seq + 'p1';
            if (item.lastpage) {
              seq = seq.replace('x', '1');
            } else {
              seq = seq.replace('x', '0');
            }
            if ((seq.split("1").length - 1) % 2 === 1) {
              seq = seq.replace('p', '1');
            } else {
              seq = seq.replace('p', '0');
            }
            item.omr = seq;
          }
          me.sequencesStore[item.color + '|' + item.envelope] = sequenceNum;
        }
        me.storeSequences();
        return list;
      }

      processCreatePDF(range) {
        var me, res;
        me = this;
        res = [];
        return new Promise(function(resolve, reject) {
          var cl, farbe_c4, farbe_c4_txt, farbe_dlang, farbe_dlang_txt, j, len, prms, record, sw, sw_c4, sw_c4_txt, sw_dlang, sw_dlang_txt;
          farbe_dlang = [];
          farbe_c4 = [];
          sw_dlang = [];
          sw_c4 = [];
          farbe_dlang_txt = {
            count: 0,
            env: "C6/DIN Lang",
            col: "Farbdruck"
          };
          farbe_c4_txt = {
            count: 0,
            env: "C4",
            col: "Farbdruck"
          };
          sw_dlang_txt = {
            count: 0,
            env: "C6/DIN Lang",
            col: "Schwarz/ Weiß"
          };
          sw_c4_txt = {
            count: 0,
            env: "C4",
            col: "Schwarz/ Weiß"
          };
          for (j = 0, len = range.length; j < len; j++) {
            record = range[j];
            if (record.color === 'Schwarz/Weiß' && record.envelope === 'DIN C6/5 (22,9cm x 11,4cm)') {
              sw_dlang.push(record);
              sw_dlang_txt.count += 1;
            }
            if (record.color === 'Schwarz/Weiß' && record.envelope !== 'DIN C6/5 (22,9cm x 11,4cm)') {
              sw_c4.push(record);
              sw_c4_txt.count += 1;
            }
            if (record.color !== 'Schwarz/Weiß' && record.envelope === 'DIN C6/5 (22,9cm x 11,4cm)') {
              farbe_dlang.push(record);
              farbe_dlang_txt.count += 1;
            }
            if (record.color !== 'Schwarz/Weiß' && record.envelope !== 'DIN C6/5 (22,9cm x 11,4cm)') {
              farbe_c4.push(record);
              farbe_c4_txt.count += 1;
            }
          }
          sw = [];
          cl = [];
          if (sw_dlang.length > 0) {
            sw.push(sw_dlang_txt);
            sw = sw.concat(sw_dlang);
          }
          if (sw_c4.length > 0) {
            sw.push(sw_c4_txt);
            sw = sw.concat(sw_c4);
          }
          if (farbe_dlang.length > 0) {
            cl.push(farbe_dlang_txt);
            cl = cl.concat(farbe_dlang);
          }
          if (farbe_c4.length > 0) {
            cl.push(farbe_c4_txt);
            cl = cl.concat(farbe_c4);
          }
          return prms = me.createPRNDATA(sw, false).then(function(name) {
            var prms2;
            if (name !== null) {
              res.push({
                name: name
              });
            }
            return prms2 = me.createPRNDATA(cl, true).then(function(name) {
              if (name !== null) {
                res.push({
                  name: name
                });
              }
              return resolve(res);
            }).catch(function(data) {
              return reject(false);
            });
          }).catch(function(data) {
            return reject(false);
          });
        });
      }

      createPRNDATA(range, color) {
        var me;
        me = this;
        return new Promise((resolve, reject) => {
          var doc, j, len, name, pageopt, pdfopt, record;
          this.prnNumber += 1;
          name = 'job-hybrid-highres-bw-' + this.prnNumber + '.pdf';
          if (color) {
            name = 'job-hybrid-highres-color-' + this.prnNumber + '.pdf';
          }
          pdfopt = {
            size: 'a4',
            layout: 'portrait',
            margin: 0,
            compress: false,
            autoFirstPage: false
          };
          if (range.length === 0) {
            return resolve(null);
          } else {
            doc = new PDFDocument(pdfopt);
            doc.pipe(fs.createWriteStream(path.join(me.tempdir, name)));
            doc.on('end', function() {
              console.log('end', color);
              return resolve(name);
            });
            pageopt = {
              size: 'a4',
              margin: 0
            };
            for (j = 0, len = range.length; j < len; j++) {
              record = range[j];
              doc.addPage(pageopt);
              if (typeof record.preview === 'undefined') {
                doc.fillColor('black').fontSize(25).text(record.env, 100, 100).text(record.col, 100, 150).text('Seiten: ' + record.count, 100, 200).text('Blatt: ' + (record.count / 2), 100, 250);
                doc.addPage(pageopt); // empty second page
              } else {
                if (record.image !== '') {
                  doc.image(record.image, 0, 0, {
                    fit: [this.toPT(210), this.toPT(297)]
                  });
                }
              }
              this.setOMR(record, doc);
            }
            return doc.end();
          }
        });
      }

      toPT(mm) {
        return (mm / 25.4) * 72;
      }

      setOMR(record, doc) {
        var i, j, l, len, p, results, x, y_start, ys;
        ys = 4.23;
        l = 6;
        x = 4;
        y_start = 297 - 250;
        if (typeof record.omr !== 'undefined') {
          p = record.omr.split("");
          results = [];
          for (j = 0, len = p.length; j < len; j++) {
            i = p[j];
            if (i === "1") {
              doc.lineWidth(this.toPT(0.4));
              doc.moveTo(this.toPT(x), this.toPT(y_start)).lineTo(this.toPT(x + l), this.toPT(y_start)).stroke();
            }
            results.push(y_start += ys);
          }
          return results;
        }
      }

      // BEGIN files store data
      globJobFiles(cb) {
        var me;
        me = this;
        return new Promise((resolve, reject) => {
          var liste, pathname;
          pathname = me.args.jobpath;
          console.log(path.join(pathname, '*.xml'));
          liste = glob.sync(path.join(pathname, '*.xml'));
          return this.loopxml([], liste, 0, function(res) {
            return resolve(res);
          });
        });
      }

      loopxml(result, list, index, cb) {
        var data;
        if (index < list.length) {
          data = fs.readFileSync(list[index]);
          return parseString(data, (err, res) => {
            var o;
            o = {
              fname: list[index],
              result: res,
              err: err
            };
            result.push(o);
            index += 1;
            return this.loopxml(result, list, index, cb);
          });
        } else {
          return this.xml2store(result, cb);
        }
      }

      xml2store(liste, cb) {
        var result;
        result = [];
        liste.forEach(function(item) {
          var color, customer, envelope, id, layout, o, pagecnt;
          id = item.result.JobTicket.Job_ID[0];
          customer = item.result.JobTicket.Customer[0];
          pagecnt = item.result.JobTicket.Page_cnt[0];
          color = item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'][0];
          envelope = item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'][0];
          layout = item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'][0];
          o = {
            id: id,
            group: envelope + ' / ' + color,
            customer: customer,
            file: item.fname,
            pages: pagecnt,
            color: color,
            envelope: envelope,
            layout: layout,
            processed: false
          };
          return result.push(o);
        });
        return cb(result);
      }

      // END files store data
      readSequences() {
        var e, j, len, me, pos, sequences, sequencesL;
        me = this;
        sequences = {};
        try {
          if (fs.existsSync(path.resolve(path.join('.', 'config', 'sequences.json')))) {
            sequencesL = JSON.parse(fs.readFileSync(path.resolve(path.join('.', 'config', 'sequences.json'))).toString());
            for (j = 0, len = sequencesL.length; j < len; j++) {
              pos = sequencesL[j];
              sequences[pos.key] = pos.value;
            }
          }
        } catch (error) {
          e = error;
          console.error(e);
        }
        return sequences;
      }

      storeSequences() {
        var e, j, k, len, me, ref, sequencesL;
        me = this;
        try {
          sequencesL = [];
          ref = me.sequencesStore;
          for (j = 0, len = ref.length; j < len; j++) {
            k = ref[j];
            if (me.sequencesStore.hasOwnProperty(k)) {
              sequencesL.push({
                key: k,
                value: me.sequencesStore[k]
              });
            }
          }
          return fs.writeFileSync(path.resolve(path.join('.', 'config', 'sequences.json')), JSON.stringify(sequencesL, null, 1));
        } catch (error) {
          e = error;
          return console.error(e);
        }
      }

    };

    HttpServer.commandName = 'httpserver';

    HttpServer.commandArgs = ['port', 'jobpath'];

    HttpServer.commandShortDescription = 'running the bbs machine controll service';

    HttpServer.options = [];

    return HttpServer;

  }).call(this);

}).call(this);

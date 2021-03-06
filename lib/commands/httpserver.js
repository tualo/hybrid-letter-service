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
            fs.copyFileSync(path.resolve(path.join('.', 'images', 'blank.jpg')), path.join(me.tempdir, 'blank.jpg'));
            return fs.copyFileSync(path.resolve(path.join('.', 'images', 'blank.pdf')), path.join(me.tempdir, 'blank.pdf'));
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
          var me, prms, result;
          me = this;
          result = {
            success: true
          };
          // console.log '/hls/hybrid/list'
          me.filter = null;
          return prms = this.globJobFiles().then(function(data) {
            var prms_font;
            result.data = data;
            // console.log '/hls/hybrid/list',data.length
            if (data.length > 0) {
              return prms_font = me.precheckfonts_loop(data).then(function(result_liste) {
                var promise3;
                // console.log '/hls/hybrid/list'
                result.data = result_liste;
                return promise3 = me.processJobFiles2SinglePages(result_liste).then(function(data) {
                  result.data = result_liste;
                  return res.send(JSON.stringify(result));
                }).catch(function(data) {
                  result.success = false;
                  result.msg = "Fehler beim Vorbereiten der Aufträge *";
                  console.log('Fehler beim Vorbereiten der Aufträge', data);
                  return res.send(JSON.stringify(result));
                });
              }).catch(function(data) {
                result.success = false;
                result.data_fonts = data;
                return res.send(JSON.stringify(result));
              });
            } else {
              result.success = true;
              result.data = [];
              result.msg = "keine Daten";
              return res.send(JSON.stringify(result));
            }
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
          me.filter = null;
          if (req.query) {
            if (req.query.file) {
              me.filter = req.query.file;
            }
          }
          return prms = me.globJobFiles().then(function(data) {
            var prms2, promise3;
            promise3 = me.processJobFiles2SinglePages(data).then(function(data) {
              result.data = me.processJobFilesImageList(data);
              return res.send(JSON.stringify(result));
            }).catch(function(data) {
              result.success = false;
              result.msg = "Fehler beim Vorbereiten der Aufträge *";
              return res.send(JSON.stringify(result));
            });
            if (false) {
              return prms2 = me.processJobFilesPNGPages(data).then(function(data) {
                result.data = me.processJobFilesPNGList(data);
                return res.send(JSON.stringify(result));
              }).catch(function(data) {
                result.success = false;
                result.msg = "Fehler beim Vorbereiten der Aufträge";
                return res.send(JSON.stringify(result));
              });
            }
          }).catch(function(data) {
            result.success = false;
            result.msg = "Fehler beim Vorbereiten der Aufträge";
            return res.send(JSON.stringify(result));
          });
        });
        app.post('/hls/hybrid/print', (req, res) => {
          var files, kllj, me, result, running;
          me = this;
          result = {
            success: true
          };
          files = JSON.parse(req.body.files);
          running = Array(files.length).fill(1);
          return kllj = me.killoldjobs().then(function(data, opt) {
            var cancelcups;
            return cancelcups = me.runcommand('cancel', ['-a']).then(function(data, opt) {
              var cupsenable, file, i, index, len, printerName, results, scriptname;
              results = [];
              for (index = i = 0, len = files.length; i < len; index = ++i) {
                file = files[index];
                console.log('print', file);
                printerName = 'vario';
                scriptname = path.resolve(path.join(__dirname, '..', '..', 'scripts', 'black'));
                //printerName='color'
                if (file.indexOf('color') >= 0) {
                  printerName = 'color';
                  scriptname = path.resolve(path.join(__dirname, '..', '..', 'scripts', 'color'));
                }
                results.push(cupsenable = me.runcommand('cupsenable', [printerName]).then(function(data, opt) {
                  var fn, params;
                  params = [];
                  params.push(path.join(me.tempdir, file));
                  console.log('print', params);
                  //me.archivFiles file
                  fn = function(index) {
                    var prms;
                    return prms = me.runcommand(scriptname, params).then(function(data, opt) {
                      result.success = true;
                      result.msg = "Gedruckt";
                      result.data = data;
                      console.log('print', 'done', running.reduce(me._sum, 0), index, data);
                      me.archivFiles(file);
                      running[index - 1] = 0;
                      console.log('print', 'done*', running, running.reduce(me._sum, 0), index, data);
                      if (running.reduce(me._sum, 0) === 0) {
                        console.log('print', 'done', running.reduce(me._sum, 0), index, data);
                        return res.send(JSON.stringify(result));
                      }
                    }).catch(function(data) {
                      console.log('print', "Fehler beim Drucken (" + printerName + ")", index, data);
                      result.success = false;
                      result.data = data;
                      running[index] = 0;
                      result.msg = "Fehler beim Drucken (" + printerName + ")";
                      if (running.reduce(me._sum, 0) === 0) {
                        return res.send(JSON.stringify(result));
                      }
                    });
                  };
                  fn(index);
                  if (false) {
                    params = [];
                    params.push('-J' + file);
                    params.push('-o');
                    params.push('sides=two-sided-long-edge');
                    params.push('-o');
                    params.push('Duplex=DuplexNoTumble');
                    params.push('-P');
                    params.push(printerName);
                    params.push(path.join(me.tempdir, file));
                    console.log('print', params);
                    //me.archivFiles file
                    fn = function(index) {
                      var prms;
                      return prms = me.runcommand('lpr', params).then(function(data, opt) {
                        result.success = true;
                        result.msg = "Gedruckt";
                        result.data = data;
                        console.log('print', 'done', running.reduce(me._sum, 0), index, data);
                        me.archivFiles(file);
                        running[index - 1] = 0;
                        console.log('print', 'done*', running, running.reduce(me._sum, 0), index, data);
                        if (running.reduce(me._sum, 0) === 0) {
                          console.log('print', 'done', running.reduce(me._sum, 0), index, data);
                          return res.send(JSON.stringify(result));
                        }
                      }).catch(function(data) {
                        console.log('print', "Fehler beim Drucken (" + printerName + ")", index, data);
                        result.success = false;
                        result.data = data;
                        running[index] = 0;
                        result.msg = "Fehler beim Drucken (" + printerName + ")";
                        if (running.reduce(me._sum, 0) === 0) {
                          return res.send(JSON.stringify(result));
                        }
                      });
                    };
                    return fn(index);
                  }
                }).catch(function(data) {
                  result.success = false;
                  result.msg = 'failed cupsenable';
                  return res.send(JSON.stringify(result));
                }));
              }
              return results;
            }).catch(function(data) {
              result.success = false;
              result.msg = 'failed cancelcups';
              return res.send(JSON.stringify(result));
            });
          }).catch(function(data) {
            console.log('killall failed');
            return res.send(JSON.stringify(result));
          });
        });
        app.get('/hls/hybrid/pdfpages', (req, res) => {
          var me, prms, result;
          me = this;
          result = {
            success: true
          };
          return prms = me.globJobFiles().then(function(data) {
            var prms2;
            data = me.processJobFilesImageList(data);
            return prms2 = me.processCreatePDF(data).then(function(data) {
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

      killoldjobs() {
        var me;
        me = this;
        return new Promise(function(resolve, reject) {
          var lpstat;
          return lpstat = me.runcommand('lpstat', []).then(function(data, opt) {
            var datalist;
            console.log('killoldjobs', data);
            datalist = data.split("\n");
            datalist.forEach(function(line) {
              var tabs;
              tabs = line.split(/\s/);
              return lpstat = me.runcommand('cancel', [tabs[0]]).then(function(data, opt) {
                return console.log('killed job', tabs[0]);
              }).catch(function(data) {
                return console.log('killed job', tabs[0], 'failed');
              });
            });
            return resolve(true);
          }).catch(function(data) {
            console.log('killoldjobs*', data);
            return reject(true);
          });
        });
      }

      //cancelcups = me.runcommand 'cancel',['-a']
      //.then (data,opt) ->
      runcommand(cmd, param, opt) {
        return new Promise(function(resolve, reject) {
          var e, errorText, hasError, outputText, prg;
          try {
            prg = spawn(cmd, param);
            hasError = false;
            errorText = "";
            outputText = "";
            prg.on('error', function(error) {
              console.error("ERROR error", error);
              return reject(error, opt);
            });
            prg.stdout.on('data', function(data) {
              return outputText += data.toString() + "\n";
            });
            prg.stderr.on('data', function(data) {
              //if data.toString().indexOf('ERROR: A pdfmark destination page')>0
              //  errorText+=data.toString()+"\n"
              //else
              errorText += data.toString() + "\n";
              return hasError = true;
            });
            return prg.on('close', function(code) {
              if (hasError) {
                console.error("ERROR ---", errorText);
                return reject(errorText, opt);
              } else {
                return resolve(outputText, opt);
              }
            });
          } catch (error1) {
            e = error1;
            console.error('X', e);
            return reject(e, opt);
          }
        });
      }

      _sum(pv, cv) {
        return pv + cv;
      }

      // Job Liste der XML Daten durchlaufen
      // Je Auftragsseite eine einzelne PDF erzeugen
      processJobFiles2SinglePages(liste) {
        var me, result_liste;
        me = this;
        result_liste = [];
        return new Promise(function(resolve, reject) {
          var listFN, running;
          running = Array(liste.length).fill(1);
          listFN = function(index) {
            var dirname, filename, item, prms;
            if (index < liste.length) {
              item = liste[index];
              filename = path.basename(item.file).replace('.xml', '.pdf');
              dirname = path.dirname(item.file);
              prms = me.printablePDFPages(dirname, filename).then(function(data) {
                result_liste.push(item);
                running[index] = 0;
                if (running.reduce(me._sum, 0) === 0) {
                  return resolve(liste);
                }
              }).catch(function(data) {
                running[index] = 0;
                //# move error files
                if (fs.existsSync(path.join(dirname, filename))) {
                  fs.writeFileSync(path.join(me.args.errorpath, filename + '.error.txt'), JSON.stringify(data, null, 1));
                  fs.copyFileSync(path.resolve(path.join(dirname, filename)), path.join(me.args.errorpath, filename));
                  fs.unlinkSync(path.resolve(path.join(dirname, filename)));
                }
                if (fs.existsSync(path.join(dirname, filename.replace('.pdf', '.xml')))) {
                  fs.copyFileSync(path.resolve(path.join(dirname, filename.replace('.pdf', '.xml'))), path.join(me.args.errorpath, filename.replace('.pdf', '.xml')));
                  fs.unlinkSync(path.resolve(path.join(dirname, filename.replace('.pdf', '.xml'))));
                }
                if (running.reduce(me._sum, 0) === 0) {
                  return resolve(liste);
                }
              });
              //console.log "processJobFiles2SinglePages", filename
              //console.log "processJobFiles2SinglePages", data
              //reject data
              return listFN(index + 1);
            } else {

            }
          };
          return listFN(0);
        });
      }

      precheckfonts_loop(liste) {
        var me, result_liste;
        me = this;
        result_liste = [];
        return new Promise(function(resolve, reject) {
          var listFN, running;
          running = Array(liste.length).fill(1);
          listFN = function(index) {
            var dirname, filename, fullfilename, item, prms;
            if (index < liste.length) {
              item = liste[index];
              fullfilename = item.file.replace('.xml', '.pdf');
              filename = path.basename(item.file).replace('.xml', '.pdf');
              dirname = path.dirname(item.file);
              prms = me.precheckfonts(fullfilename).then(function(data) {
                liste[index].fontcheck = data;
                result_liste.push(liste[index]);
                running[index] = 0;
                if (running.reduce(me._sum, 0) === 0) {
                  return resolve(result_liste);
                }
              }).catch(function(data) {
                running[index] = 0;
                if (fs.existsSync(path.join(dirname, filename))) {
                  fs.writeFileSync(path.join(me.args.errorpath, filename + '.error.txt'), JSON.stringify(data, null, 1));
                  fs.copyFileSync(path.resolve(path.join(dirname, filename)), path.join(me.args.errorpath, filename));
                  fs.unlinkSync(path.resolve(path.join(dirname, filename)));
                }
                if (fs.existsSync(path.join(dirname, filename.replace('.pdf', '.xml')))) {
                  fs.copyFileSync(path.resolve(path.join(dirname, filename.replace('.pdf', '.xml'))), path.join(me.args.errorpath, filename.replace('.pdf', '.xml')));
                  fs.unlinkSync(path.resolve(path.join(dirname, filename.replace('.pdf', '.xml'))));
                }
                if (running.reduce(me._sum, 0) === 0) {
                  return resolve(result_liste);
                }
              });
              //reject data
              return listFN(index + 1);
            } else {

            }
          };
          return listFN(0);
        });
      }

      precheckfonts(filename) {
        var me;
        //pdffonts
        //console.log('#','precheckfonts',filename)
        me = this;
        return new Promise(function(resolve, reject) {
          var params, prms;
          params = [];
          params.push(path.join(filename));
          //console.log('pdffonts','--->')
          return prms = me.runcommand('pdffonts', params).then(function(data) {
            var fonts_tab, hasError, result;
            result = {
              success: true,
              msg: '',
              filename: path.basename(filename),
              fonts: []
            };
            fonts_tab = data.split(/\n/);
            hasError = false;
            fonts_tab.forEach(function(line) {
              var columns;
              columns = line.replace(/\s\s+/g, ' ').split(/\s/);
              if (columns.length > 0) {
                if (columns[0] !== 'name') {
                  if (columns[0].indexOf('--') !== 0) {
                    // 'name', 'type', 'encoding', 'emb', 'sub', 'uni', 'object', 'ID'
                    result.fonts.push({
                      name: columns[0],
                      type: columns[1],
                      encoding: columns[2],
                      emb: columns[3],
                      sub: columns[4],
                      uni: columns[5],
                      object: columns[6],
                      id: columns[7]
                    });
                    if (columns[3] === 'no' && columns[4] === 'no') {
                      return reject(result);
                    }
                  }
                }
              }
            });
            //result.success = false
            //result.message = 'Die Schriftart '+columns[0]+' kann nicht richtig verarbeitet werden'
            //console.log('#',line,line.replace(/\s\s+/g,' ').split(/\s/))
            return resolve(result);
          }).catch(function(data) {
            console.log('# error', data);
            return reject(data);
          });
        });
      }

      printablePDFPages(dirname, filename) {
        var me;
        me = this;
        return new Promise(function(resolve, reject) {
          var params, prms;
          params = [];
          params.push('-q');
          params.push('-dNOPAUSE');
          params.push('-dDOPDFMARKS=false');
          params.push('-dBATCH');
          params.push('-sDEVICE=pdfwrite');
          params.push('-r600');
          params.push('-sOutputFile=' + path.join(me.tempdir, filename) + '%05d.pdf');
          params.push('-dPDFFitPage');
          params.push('-dFIXEDMEDIA');
          params.push('-sPAPERSIZE=a4');
          params.push('-dAutoRotatePages=/None');
          //gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dFIXEDMEDIA -dPDFFitPage -sPAPERSIZE=a4 -dAone

          // -dNODISPLAY -q -sFile=IN.PDF -dDumpMediaSizes pdf_info.ps >DUMP.TXT
          //-dAutoRotatePages=/PageByPage
          //-dAutoRotatePages=/None
          //params.push '-dAutoRotatePages=/PageByPage'
          params.push(path.join(dirname, filename));
          //console.log  'gs ',params.join(' '),path.join(dirname,filename)
          return prms = me.runcommand('gs', params).then(function(data) {
            var params2, prms2;
            params2 = [];
            params2.push('-q');
            params2.push('-dNOPAUSE');
            params2.push('-dBATCH');
            params2.push('-dDOPDFMARKS=false');
            params2.push('-sDEVICE=jpeg');
            params2.push('-r72');
            params2.push('-sOutputFile=' + path.join(me.tempdir, filename) + '%05d.jpg');
            params2.push(path.join(dirname, filename));
            return prms2 = me.runcommand('gs', params2).then(function(data2) {
              return resolve(data);
            }).catch(function(data2) {
              return reject(data2);
            });
          }).catch(function(data) {
            return reject(data);
          });
        });
      }

      //-dNODISPLAY -q -sFileName=abc.pdf -c "FileName (r) file runpdfbegin 1 1 pdfpagecount {pdfgetpage /MediaBox get {=print ( ) print} forall (\n) print} for quit"
      //rotateOut
      processJobFilesImageList(liste) {
        var baseitem, dirname, filename, i, imageliste, item, j, l, len, len1, len2, len3, list, loopindex, m, me, n, p, q, seq, sequence, sequenceNum;
        me = this;
        list = [];
        n = 0;
        sequence = 0;
        for (i = 0, len = liste.length; i < len; i++) {
          item = liste[i];
          filename = path.basename(item.file, '.xml');
          dirname = path.dirname(item.file);
          imageliste = glob.sync(path.join(me.tempdir, filename) + '*.jpg');
          p = 0;
          for (j = 0, len1 = imageliste.length; j < len1; j++) {
            l = imageliste[j];
            baseitem = JSON.parse(JSON.stringify(item, null, 1));
            baseitem.num = n++;
            baseitem.id = baseitem.num;
            baseitem.image = l;
            baseitem.highrespdf = l.replace('.jpg', '.pdf');
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
              baseitem.image = path.join(me.tempdir, 'blank.jpg');
              baseitem.preview = path.join('../preview', 'blank.jpg');
              baseitem.highrespdf = path.join(me.tempdir, 'blank.pdf');
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
          }
          
          //if sequence!=0
          //  if list[sequence-1]
          //    list[sequence-1].lastpage=true

          //if list[sequence-1].pagenum%2==1
          // frontseite zur letzten erklären
          //  list[sequence-2].lastpage=true
          if (list[list.length - 1].pagenum % 2 === 0) {
            // letzte seite ungerade, eine leere einfügen
            baseitem = JSON.parse(JSON.stringify(list[list.length - 1], null, 1));
            baseitem.num = n++;
            baseitem.id = baseitem.num;
            baseitem.image = path.join(me.tempdir, 'blank.jpg');
            baseitem.preview = path.join('../preview', 'blank.jpg');
            baseitem.highrespdf = path.join(me.tempdir, 'blank.pdf');
            baseitem.newletter = p === 0;
            baseitem.lastpage = false;
            baseitem.sequence = sequence;
            baseitem.printpage = true;
            baseitem.omr = '---';
            baseitem.pagenum = p;
            list.push(baseitem);
            p += 1;
          }
        }
        //sequence+=1
        sequenceNum = 0;
        list = list.reverse();
        console.log("*pages", "lastpage", "pagenum", "sequence", "layout", "highrespdf");
        loopindex = 0;
        for (m = 0, len2 = list.length; m < len2; m++) {
          item = list[m];
          console.log(item.pages, item.lastpage, item.pagenum, item.sequence, item.layout, path.basename(item.highrespdf));
          if (item.layout === "Doppelseitig") {
            if ((item.pages * 1 === item.pagenum && path.basename(item.highrespdf) === "blank.pdf") || (item.pages * 1 === item.pagenum + 1 && path.basename(item.highrespdf) !== "blank.pdf")) {
              list[loopindex + 1].lastpage = true;
            }
          } else {
            if (item.pages * 1 === item.pagenum) {
              item.lastpage = true;
            }
          }
          loopindex++;
        }
        list = list.reverse();
        //console.log list
        console.log("pages", "lastpage", "pagenum", "sequence", "layout", "highrespdf");
        for (q = 0, len3 = list.length; q < len3; q++) {
          item = list[q];
          if (typeof me.sequencesStore[item.color + '|' + item.envelope] === 'undefined') {
            me.sequencesStore[item.color + '|' + item.envelope] = 0;
          }
          sequenceNum = me.sequencesStore[item.color + '|' + item.envelope];
          console.log(item.pages, item.lastpage, item.pagenum, item.sequence, item.layout, path.basename(item.highrespdf));
          if (item.pagenum % 2 === 0) {
            seq = Number(sequenceNum).toString(2).substr(-3); //;//.split("").reverse().join("")
            // console.log item.highrespdf, sequenceNum, seq
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
          // console.log item.highrespdf,'>>>>>', seq
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
          var cl, farbe_c4, farbe_c4_txt, farbe_dlang, farbe_dlang_txt, fn, i, len, record, sw, sw_c4, sw_c4_txt, sw_dlang, sw_dlang_txt;
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
          for (i = 0, len = range.length; i < len; i++) {
            record = range[i];
            //DIN C6 (22,9cm x 11,4cm)
            if (record.color === 'Schwarz/Weiß' && (record.envelope === 'DIN C6 (22,9cm x 11,4cm)' || record.envelope === 'DIN C6/5 (22,9cm x 11,4cm)')) {
              sw_dlang.push(record);
              sw_dlang_txt.count += 1;
            }
            if (record.color === 'Schwarz/Weiß' && (record.envelope !== 'DIN C6 (22,9cm x 11,4cm)' && record.envelope !== 'DIN C6/5 (22,9cm x 11,4cm)')) {
              sw_c4.push(record);
              sw_c4_txt.count += 1;
            }
            if (record.color !== 'Schwarz/Weiß' && (record.envelope === 'DIN C6 (22,9cm x 11,4cm)' || record.envelope === 'DIN C6/5 (22,9cm x 11,4cm)')) {
              farbe_dlang.push(record);
              farbe_dlang_txt.count += 1;
            }
            if (record.color !== 'Schwarz/Weiß' && (record.envelope !== 'DIN C6 (22,9cm x 11,4cm)' && record.envelope !== 'DIN C6/5 (22,9cm x 11,4cm)')) {
              farbe_c4.push(record);
              farbe_c4_txt.count += 1;
            }
          }
          sw = [];
          cl = [];
          me.headerPages = 0;
          if (sw_dlang.length > 0) {
            sw_dlang_txt.highrespdf = path.join(me.tempdir, 'sw_dlang_txt' + 'hdr.pdf');
            sw_dlang_txt.omr = '---';
            me.headerPages++;
            me.createHDRPage(sw_dlang_txt);
            sw.push(sw_dlang_txt);
            sw.push({
              omr: '---',
              highrespdf: path.join(me.tempdir, 'blank.pdf')
            });
            sw = sw.concat(sw_dlang);
          }
          if (sw_c4.length > 0) {
            sw_c4_txt.highrespdf = path.join(me.tempdir, 'sw_c4_txt' + 'hdr.pdf');
            sw_c4_txt.omr = '---';
            me.headerPages++;
            me.createHDRPage(sw_c4_txt);
            sw.push(sw_c4_txt);
            sw.push({
              omr: '---',
              highrespdf: path.join(me.tempdir, 'blank.pdf')
            });
            sw = sw.concat(sw_c4);
          }
          if (farbe_dlang.length > 0) {
            farbe_dlang_txt.highrespdf = path.join(me.tempdir, 'farbe_dlang_txt' + 'hdr.pdf');
            farbe_dlang_txt.omr = '---';
            me.headerPages++;
            me.createHDRPage(farbe_dlang_txt);
            cl.push(farbe_dlang_txt);
            cl.push({
              omr: '---',
              highrespdf: path.join(me.tempdir, 'blank.pdf')
            });
            cl = cl.concat(farbe_dlang);
          }
          if (farbe_c4.length > 0) {
            farbe_c4_txt.highrespdf = path.join(me.tempdir, 'farbe_c4_txt' + 'hdr.pdf');
            farbe_c4_txt.omr = '---';
            me.headerPages++;
            me.createHDRPage(farbe_c4_txt);
            cl.push(farbe_c4_txt);
            cl.push({
              omr: '---',
              highrespdf: path.join(me.tempdir, 'blank.pdf')
            });
            cl = cl.concat(farbe_c4);
          }
          
          //while me.headerPages>0
          fn = function() {
            var prms;
            return prms = me.createOutPutPDF(sw, false).then(function(name) {
              var prms2;
              if (name !== null) {
                res.push({
                  name: name
                });
              }
              return prms2 = me.createOutPutPDF(cl, true).then(function(name) {
                if (name !== null) {
                  res.push({
                    name: name
                  });
                }
                return resolve(res);
              }).catch(function(data) {
                return reject(data);
              });
            }).catch(function(data) {
              return reject(data);
            });
          };
          return setTimeout(fn, 3000);
        });
      }

      createHDRPage(record) {
        var doc, me, pageopt, pdfopt;
        me = this;
        // deckblatt erzeugen
        pdfopt = {
          size: 'a4',
          layout: 'portrait',
          margin: 0,
          compress: false,
          autoFirstPage: false
        };
        doc = new PDFDocument(pdfopt);
        doc.pipe(fs.createWriteStream(record.highrespdf));
        doc.on('end', function() {
          return me.headerPages--;
        });
        pageopt = {
          size: 'a4',
          margin: 0
        };
        doc.addPage(pageopt);
        doc.fillColor('black').fontSize(25).text(record.env, 100, 100).text(record.col, 100, 150).text('Seiten: ' + record.count, 100, 200).text('Blatt: ' + (record.count / 2), 100, 250);
        return doc.end();
      }

      createOutPutPDF(range, color) {
        var me;
        me = this;
        return new Promise((resolve, reject) => {
          var filelist, i, len, name, params, prms, record;
          this.prnNumber += 1;
          name = 'job-hybrid-highres-bw-' + this.prnNumber + '.pdf';
          if (color) {
            name = 'job-hybrid-highres-color-' + this.prnNumber + '.pdf';
          }
          if (range.length === 0) {
            return resolve(null);
          } else {
            filelist = [];
            params = [];
            params.push('-q');
            params.push('-dNOPAUSE');
            params.push('-dBATCH');
            params.push('-sDEVICE=pdfwrite');
            params.push('-sOutputFile=' + path.join(me.tempdir, name));
            params.push('-dPDFFitPage');
// -dNODISPLAY -q -sFile=IN.PDF -dDumpMediaSizes pdf_info.ps >DUMP.TXT
//-dAutoRotatePages=/PageByPage
//-dAutoRotatePages=/None
//params.push '-dAutoRotatePages=/PageByPage'
            for (i = 0, len = range.length; i < len; i++) {
              record = range[i];
              if (typeof record.omr !== 'undefined') {
                if (record.omr !== '---') {
                  params.push('-f');
                  params.push(path.resolve(path.join('.', 'images', record.omr + '.ps')));
                } else {
                  params.push('-f');
                  params.push(path.resolve(path.join('.', 'images', '0000000.ps')));
                }
                params.push('-f');
                params.push(path.resolve(record.highrespdf));
                filelist.push(record);
              }
            }
            // console.log "\n\n\n\n"+params.join(" \\\n")+"\n\n\n\n"
            return prms = me.runcommand('gs', params).then(function(data) {
              fs.writeFileSync(path.join(me.tempdir, name + '.json'), JSON.stringify(filelist, null, 1));
              return resolve(name);
            }).catch(function(data) {
              return reject(data);
            });
          }
        });
      }

      //cupsenable vario
      //cancel -a
      //lpstat -p vario -l
      //cancel vario-46

      // BEGIN files store data
      globJobFiles(cb) {
        var me;
        me = this;
        return new Promise((resolve, reject) => {
          var liste, pathname;
          pathname = me.args.jobpath;
          liste = glob.sync(path.join(pathname, '*.xml'));
          liste = liste.slice(0, 100);
          return this.loopxml([], liste, 0, function(res) {
            res.forEach(function(item) {
              return item.shortname = path.basename(item.file);
            });
            if (me.filter !== null && (typeof me.filter !== 'undefined')) {
              res = res.filter(function(item) {
                return item.shortname === me.filter;
              });
            }
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
        // console.log('xml2store',liste.length )
        liste.forEach(function(item) {
          var color, customer, e, envelope, id, layout, o, pagecnt;
          try {
            try {
              if (typeof item.result === 'undefined') {
                throw new Error(item.fname + ' result ist nicht definiert');
              }
              if (typeof item.result.JobTicket === 'undefined') {
                throw new Error(item.fname + ' JobTicket ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicDruckmodus'] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicDruckmodus] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicDruckmodus'][0] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicDruckmodus][0] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicDruckmodus][0][value] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'][0] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicDruckmodus][0][value][0] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicKuvertgrösse'] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicKuvertgrösse] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicKuvertgrösse][0] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicKuvertgrösse][0][value] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'][0] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicKuvertgrösse][0][value][0] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicLayout'] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicLayout] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicLayout'][0] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicLayout][0] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicLayout][0][value] ist nicht definiert');
              }
              if (typeof item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'][0] === 'undefined') {
                throw new Error(item.fname + ' JobTicket.TicDP[0][TicLayout][0][value][0] ist nicht definiert');
              }
              id = item.result.JobTicket.Job_ID[0];
              //console.log 'xml2store','id',id,JSON.stringify(item.result.JobTicket.TicDP,null,1)
              customer = item.result.JobTicket.Customer[0];
              pagecnt = item.result.JobTicket.Page_cnt[0];
              color = item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'][0];
              envelope = item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'][0];
              layout = item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'][0];
            } catch (error1) {
              e = error1;
              id = (new Date()).getTime();
              //console.log 'xml2store','id',id,JSON.stringify(item.result.JobTicket.TicDP,null,1)
              customer = e.message;
              pagecnt = 1;
              color = 'Farbe';
              envelope = 'DIN C6 (22,9cm x 11,4cm)';
              layout = '';
            }
            o = {
              id: id + item.fname,
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
          } catch (error1) {
            e = error1;
            return console.log(e);
          }
        });
        // console.log('xml2store', result  )
        return cb(result);
      }

      // END files store data
      readSequences() {
        var e, i, len, me, pos, sequences, sequencesL;
        me = this;
        sequences = {};
        try {
          if (fs.existsSync(path.resolve(path.join('.', 'config', 'sequences.json')))) {
            sequencesL = JSON.parse(fs.readFileSync(path.resolve(path.join('.', 'config', 'sequences.json'))).toString());
            for (i = 0, len = sequencesL.length; i < len; i++) {
              pos = sequencesL[i];
              sequences[pos.key] = pos.value;
            }
          }
        } catch (error1) {
          e = error1;
          console.error(e);
        }
        return sequences;
      }

      storeSequences() {
        var e, i, k, len, me, ref, sequencesL;
        me = this;
        try {
          sequencesL = [];
          ref = me.sequencesStore;
          for (i = 0, len = ref.length; i < len; i++) {
            k = ref[i];
            if (me.sequencesStore.hasOwnProperty(k)) {
              sequencesL.push({
                key: k,
                value: me.sequencesStore[k]
              });
            }
          }
          return fs.writeFileSync(path.resolve(path.join('.', 'config', 'sequences.json')), JSON.stringify(sequencesL, null, 1));
        } catch (error1) {
          e = error1;
          return console.error(e);
        }
      }

      archivFiles(file) {
        var files, me;
        me = this;
        if (fs.existsSync(path.join(me.tempdir, file + '.json'))) {
          files = JSON.parse(fs.readFileSync(path.join(me.tempdir, file + '.json')));
          // console.log 'archivFiles',files
          return files.forEach(function(fileitem) {
            var strdate;
            if (typeof fileitem.shortname === 'string') {
              strdate = (new Date()).toISOString().substr(0, 10);
              mkdirp(path.resolve(path.join(me.args.archivpath, strdate)), function(err) {
                if (fs.existsSync(path.join(me.args.jobpath, fileitem.shortname))) {
                  fs.copyFileSync(path.resolve(path.join(me.args.jobpath, fileitem.shortname)), path.join(me.args.archivpath, strdate, fileitem.shortname));
                }
                if (fs.existsSync(path.join(me.args.jobpath, fileitem.shortname.replace('.xml', '.pdf')))) {
                  fs.copyFileSync(path.resolve(path.join(me.args.jobpath, fileitem.shortname.replace('.xml', '.pdf'))), path.join(me.args.archivpath, strdate, fileitem.shortname.replace('.xml', '.pdf')));
                }
                if (fs.existsSync(path.join(me.args.jobpath, fileitem.shortname))) {
                  fs.unlinkSync(path.resolve(path.join(me.args.jobpath, fileitem.shortname)));
                }
                if (fs.existsSync(path.join(me.args.jobpath, fileitem.shortname.replace('.xml', '.pdf')))) {
                  return fs.unlinkSync(path.resolve(path.join(me.args.jobpath, fileitem.shortname.replace('.xml', '.pdf'))));
                }
              });
              if (fs.existsSync(path.join(me.tempdir, file + '.json'))) {
                return fs.unlinkSync(path.join(me.tempdir, file + '.json'));
              }
            }
          });
        }
      }

    };

    HttpServer.commandName = 'httpserver';

    HttpServer.commandArgs = ['port', 'jobpath', 'archivpath', 'errorpath'];

    HttpServer.commandShortDescription = 'running the hybrid letter service';

    HttpServer.options = [];

    return HttpServer;

  }).call(this);

}).call(this);

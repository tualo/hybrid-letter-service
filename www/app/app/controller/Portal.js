Ext.define('HybridLetterServer.controller.Portal', {
    extend: 'Ext.app.ViewController',
   
    alias: 'controller.hybrid_controller_portal',
    onBoxReady: function(){
        var me =this;

        var cssText = '.dataview-inline .img { display: inline-block; width: 75px;  float:left; margin:15px;   height: 75px; background-repeat: no-repeat; background-size: 104%; background-position: 50%;  border-radius: 5%; -webkit-box-shadow: 0px 8px 10px -6px black; -moz-box-shadow: 0px 8px 10px -6px black;        box-shadow: 0px 8px 10px -6px black;    }   ';
        Ext.util.CSS.createStyleSheet ( cssText, 'dataview-style' );

        me.loadHybrid();
    },

    loadHybrid: function(){
        var me =this,
            model = me.getViewModel();
        model.getStore('files').load();

    },
    onFilesLoad: function(store,records){

    },
    onStartCheck: function(){
        var me =this,
            model = me.getViewModel();
        model.getStore('preview').load();
    },
    onPreviewLoad: function(store,records){
        var me =this,
            model = me.getViewModel();
        model.getStore('pdfpages').load();

    },
    onPDFItemDplClick: function(view,record){
        console.log(record);
        window.open('/hls/preview/'+record.get('name'));
    },
    printPDF: function(){
        var me =this,
            model = me.getViewModel(),
            range = model.getStore('pdfpages').getRange(),
            files = [];
        range.forEach( function(item){  files.push( item.get('name') ) } );
        Ext.Ajax.request({
            url: '/hls/hybrid/print',
            params: {
                files: JSON.stringify(files)
            },
            timeout: 30000,
            failure: function(){
                console.log('print failure',arguments);
                var o = JSON.parse(res.responseText);
                Ext.toast({
                    html: o.msg,
                    title: 'Fehler',
                    width: 200,
                    align: 't'
                });
            },
            success: function(res){
                console.log('done')
                var o = JSON.parse(res.responseText);
                Ext.toast({
                    html: o.msg,
                    title: 'OK',
                    width: 200,
                    align: 't'
                });
            }
        })
    },








    loadSettings: function(){
        var me =this;
        var model = me.getViewModel();

        /*
        var store = model.getStore('settings');
        var rec;
        store.load();
        rec = store.findRecord('id','hybrid_folder');
        if (Ext.isEmpty(rec)){
            Ext.toast({
                html: 'Bitte richten Sie zuerst das Verzeichnis ein',
                title: 'Einstellungen',
                width: 200,
                align: 't'
            });
        }else{
            document.hybrid_folder = rec.get('value');
        }
        
        rec = store.findRecord('id','ghostscript_command');
        if (Ext.isEmpty(rec)){
            Ext.toast({
                html: 'Bitte richten Sie zuerst das Ghostscript ein',
                title: 'Einstellungen',
                width: 200,
                align: 't'
            });
        }else{
            document.ghostscript_command = rec.get('value');
        }
        */
    },
 
    onStartCheckX: function(){
        var me =this;
        me.loadSettings();
        document.onFolderFiles = this.onFolderFiles.bind(this);
        document.globFolderFiles();
    },

    onFolderFilesX: function(liste){
        var me =this;
        var model = me.getViewModel();
        var store = model.getStore('files');
        store.removeAll();
        var hash={};
        liste.forEach(function(item){
            console.log(item);
            
            var id = item.result.JobTicket.Job_ID[0];
            var customer = item.result.JobTicket.Customer[0];
            var pagecnt = item.result.JobTicket.Page_cnt[0];

            var color = item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'][0];
            var envelope = item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'][0];
            var layout = item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'][0];

            store.add({
                id: id,
                group: envelope+' / '+color,
                customer: customer,
                file: item.fname,
                pages: pagecnt,
                color: color,
                envelope: envelope,
                layout: layout,
                processed: false
            });
            
            
        });
        this.process();

    },

    process: function(){
        var me =this;
        var model = me.getViewModel();
        var store = model.getStore('files');
        var range = store.getRange();
        var running=false;
        var path=require('path');
        var os=require('os');
        model.set('preparing',true);
        model.set('prepared',false);

        range.forEach(function(item){
            if ((item.get('processed')===true)||(running==true)){

            }else{

                var filename = path.basename(item.get('file'),'.xml');
                var dirname = path.dirname(item.get('file'));

                console.log('----');
                document.gs([
                '-q',
                '-dNOPAUSE',
                '-dBATCH',
                '-sDEVICE=pngalpha',
                '-r600',
                '-sOutputFile='+path.join(os.tmpdir(),filename)+'%05d.png',
                path.join(dirname,filename)+'.pdf'
                ], () => {
                    item.set('processed',true);
                    me.process();
                });

                

                running=true;
            }
                

        });
        if (running==false){
            me.processPages();
        }
    },

    
    processCreatePDF: function(){
        var me =this;
        var model = me.getViewModel();
        var path=require('path');
        var os=require('os');
        var fs=require('fs');
        var store = model.getStore('jobfiles');
        var range = store.getRange();

        
        model.set('printing',true);
        
        var farbe_dlang = [];
        var farbe_c4 = [];
        var sw_dlang = [];
        var sw_c4 = [];
        

        var farbe_dlang_txt = {count:0,env:"C6/DIN Lang",col:"Farbdruck"};
        var farbe_c4_txt = {count:0,env:"C4",col:"Farbdruck"};
        var sw_dlang_txt = {count:0,env:"C6/DIN Lang",col:"Schwarz/ Weiß"};
        var sw_c4_txt = {count:0,env:"C4",col:"Schwarz/ Weiß"};

        /*
        {name:'color',type:"string"},
            {name:'envelope',type:"string"},
        */
        range.forEach(function(record){
            if ((record.get('color')=='Schwarz/Weiß')&&(record.get('envelope')=='DIN C6/5 (22,9cm x 11,4cm)')){
                sw_dlang.push(record);
                sw_dlang_txt.count++;
            }else if ((record.get('color')=='Schwarz/Weiß')&&(record.get('envelope')!='DIN C6/5 (22,9cm x 11,4cm)')){
                sw_c4.push(record);
                sw_c4_txt.count++;

            }else if ((record.get('color')!='Schwarz/Weiß')&&(record.get('envelope')=='DIN C6/5 (22,9cm x 11,4cm)')){
                farbe_dlang.push(record);
                farbe_dlang_txt.count++;
            }else if ((record.get('color')!='Schwarz/Weiß')&&(record.get('envelope')!='DIN C6/5 (22,9cm x 11,4cm)')){
                farbe_c4.push(record);
                farbe_c4_txt.count++;
            }
        });





        var printers = model.getStore('printers');
        var rec;
        printers.load();
        if (sw_dlang.length>0){
            rec = printers.findRecord('color',false);
            if (Ext.isEmpty(rec)){
                Ext.toast({
                    html: 'Bitte richten Sie zuerst einen SW ein',
                    title: 'Einstellungen',
                    width: 200,
                    align: 't'
                });
                return;
            }
            me.createPRNDATA(sw_dlang,false,rec.get('uri'),sw_dlang_txt,rec.get('device'));
        }
        if (sw_c4.length>0){
            rec = printers.findRecord('color',false);
            if (Ext.isEmpty(rec)){
                Ext.toast({
                    html: 'Bitte richten Sie zuerst einen SW ein',
                    title: 'Einstellungen',
                    width: 200,
                    align: 't'
                });
                return;
            }
            me.createPRNDATA(sw_c4,false,rec.get('uri'),sw_c4_txt,rec.get('device'));
        }


        if (farbe_dlang.length>0){
            rec = printers.findRecord('color',true);
            if (Ext.isEmpty(rec)){
                Ext.toast({
                    html: 'Bitte richten Sie zuerst einen Farbdrucker ein',
                    title: 'Einstellungen',
                    width: 200,
                    align: 't'
                });
                return;
            }
            me.createPRNDATA(farbe_dlang,true,rec.get('uri'),farbe_dlang_txt,rec.get('device'));
        }
        if (farbe_c4.length>0){
            rec = printers.findRecord('color',true);
            if (Ext.isEmpty(rec)){
                Ext.toast({
                    html: 'Bitte richten Sie zuerst einen Farbdrucker ein',
                    title: 'Einstellungen',
                    width: 200,
                    align: 't'
                });
                return;
            }
            me.createPRNDATA(farbe_c4,true,rec.get('uri'),farbe_c4_txt,rec.get('device'));
        }

        


    },
    prnNumber: 1,
    createPRNDATA: function(range,color,host,txt,device){
        var me =this;
        var model = me.getViewModel();
        var path=require('path');
        var os=require('os');
        var fs=require('fs');
        var net=require('net');

        this.prnNumber++;
        let buffers = [];
        let name = 'job-hybrid-highres-bw-'+(this.prnNumber)+'.pdf';
        if (color==true){
            name= 'job-hybrid-highres-color-'+(this.prnNumber)+'.pdf';
        }

        var doc = new document.PDFDocument({
            size: 'a4',
            layout: 'portrait',
            margin:0,
            autoFirstPage:false
        });


        doc.pipe(fs.createWriteStream(path.join(os.tmpdir(),name)));
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', function(){
            
            if (Ext.isEmpty(device)){
                device='ps2write';
            }
            //device = 'hl1250';
            device = 'ps2write';

            let timeout = 30000;
            let port=9100;

            
            Ext.toast({
                html: txt.env+'<br/>'+ txt.col+ '<br/>'+'Seiten: '+txt.count + '<br/>Blatt: '+(txt.count/2)+' wird gedruckt',
                title: 'Drucken',
                width: 200,
                align: 't'
            });
            
            document.gs([
                '-q',
                '-dNOPAUSE',

                '-dBATCH',
                '-sDEVICE='+device,
                '-r600',

                '-sOutputFile='+path.join(os.tmpdir(),name)+'-print.ps',
                path.join(os.tmpdir(),name),

            ], () => {


                var buffer= fs.readFileSync(path.join(os.tmpdir(),name)+'-print.ps');
                var data = buffer.toString();
                if (data.indexOf('%%BeginSetup')>=0){
                    console.log('HAS - Page Setup');
                }else {
                    console.log('HAS NO - Page Setup');
                    if (data.indexOf('%%Page: 1 1')>=0){
                        console.log('Page: 1 1 found');
                        let duplex_insert = ['%%BeginSetup',
                        '[{',
                        '%%BeginFeature: *Duplex DuplexNoTumble',
                        '<</Duplex true/Tumble false>>setpagedevice',
                        '%%EndFeature',
                        '} stopped cleartomark',
                        '%%EndSetup',
                        '%%Page: 1 1'].join("\n")
                        data = data.replace("%%Page: 1 1",duplex_insert);
                        //fs.writeFileSync('/Users/thomashoffmann/Desktop/prn.ps',data);


                        var printer = net.connect({
                            host : host,
                            port : port,
                            timeout: timeout
                          }, function() {
                            printer.write(data, null, function () {
                                Ext.toast({
                                    html: 'Der Druck wurde erfolgreich abgeschlossen',
                                    title: 'Erfolg',
                                    width: 200,
                                    align: 't'
                                });
                                model.set('printing',false);
                            if (typeof cb !== "undefined") {
                                cb(null);
                            }
                            printer.end();

                            });
                          });
                        
                          printer.on('error', function (err) {
                            if (typeof cb !== "undefined") {
                                Ext.toast({
                                    html: err,
                                    title: 'Fehler',
                                    width: 200,
                                    align: 't'
                                });
                            }
                            model.set('printing',false);
                            printer.end();
                          });
                        
                          printer.on('timeout', function () {
                            if (typeof cb !== "undefined") {
                                Ext.toast({
                                    html: 'Zeitüberschreitung',
                                    title: 'Fehler',
                                    width: 200,
                                    align: 't'
                                });
                            }
                            printer.end();
                          });
                                        
                    }else{
                        Ext.toast({
                            html: 'Die Druckdaten konnten nicht um die Dublex-Anweisungen erweitert werden.',
                            title: 'Fehler',
                            width: 200,
                            align: 't'
                        });
                    }
                }

            } );
        });


        // Infoseite und Rückseite
        doc.addPage({
            size: 'a4',
            margin: 0
        });
        doc.fillColor('black')
            .fontSize(25)
            .text(txt.env,100,100)
            .text(txt.col,100,150)
            .text('Seiten: '+txt.count,100,200);
        doc.addPage({
            size: 'a4',
            margin: 0
        });

        Ext.toast({
            html: txt.env+'<br/>'+ txt.col+ '<br/>'+'Seiten: '+txt.count + '<br/>Blatt: '+(txt.count/2)+' wird vorbereitet',
            title: 'Vorbereitung',
            width: 200,
            align: 't'
        });

        //-- Infoseite und Rückseite
    
        range.forEach(function(record){
            doc.addPage({
                size: 'a4',
                margin: 0
            });
    
            //210 × 297
            if (record.get('jpg')!=''){
                doc.image(record.get('jpg'),0,0, {fit: [document.toPT(210),document.toPT(297)] });
                // {width: document.toPT(210), height: document.toPT(297)});
            }
            
            //if (record.get('frontpage')==true){
            me.setOMR(record,doc);
            //}
        });
        doc.end();
    },
    setOMR: function(record,doc){
       
        var ys=4.23;
        var l = 6;
        var x = 4;
        var y_start = 297-250;
        var p = record.get('omr').split("");

        p.forEach(function(i){
            if (i=="1"){
                doc.lineWidth(document.toPT(0.4));
                doc.moveTo(document.toPT(x), document.toPT(y_start))
                .lineTo(document.toPT(x+l), document.toPT(y_start))
                .stroke();
            }
            y_start+=ys;
        });
    },
    processPages: function(){
        var me =this;
        var model = me.getViewModel();
        var store = model.getStore('files');
        var range = store.getRange();
        var list = [];
        var n=0;
        var path=require('path');
        var os=require('os');
        var glob=require('glob');
        var sequence=0;
        var lastitem = null;
        range.forEach(function(item){


            let filename = path.basename(item.get('file'),'.xml');
            let dirname = path.dirname(item.get('file'));
            let liste = glob.sync( path.join(os.tmpdir(),filename)+'*.png' );
            

            let p=0;
            liste.forEach(function(l){
                var baseitem=JSON.parse(JSON.stringify(item.data,null,1));
                baseitem.num = n++;
                baseitem.id = baseitem.num;
                baseitem.jpg = l;

                baseitem.newletter =(p==0);
                baseitem.lastpage  = false;

                baseitem.sequence=sequence;
                baseitem.printpage=true;
                baseitem.omr='---';


                baseitem.pagenum=p;

                
                list.push(baseitem);
                p++;
                sequence++;
                
                if (item.get('layout')=="Einseitig"){
                    // leerseite einfügen
                    var baseitem=JSON.parse(JSON.stringify(item.data,null,1));
                    baseitem.num = n++;
                    baseitem.id = baseitem.num;
                    baseitem.jpg = '';
    
                    baseitem.newletter =(p==0);
                    baseitem.lastpage  = false;
    
                    baseitem.sequence=sequence;
                    baseitem.printpage=true;
                    baseitem.omr='---';
    
    
                    baseitem.pagenum=p;
    
                    
                    list.push(baseitem);
                    p++;
                    sequence++;
                }

            });

            if (list[list.length-1].pagenum%2==0){
                // letzte seite ungerade, eine leere einfügen
                var baseitem=JSON.parse(JSON.stringify(list[list.length-1],null,1));
                baseitem.num = n++;
                baseitem.id = baseitem.num;
                baseitem.jpg = '';

                baseitem.newletter =(p==0);
                baseitem.lastpage  = false;

                baseitem.sequence=sequence;
                baseitem.printpage=true;
                baseitem.omr='---';


                baseitem.pagenum=p;

                
                list.push(baseitem);
                p++;
                sequence++;
            }

            if (sequence!=0){
                if (list[sequence-1]){
                    list[sequence-1].lastpage=true;
                    if (list[sequence-1].pagenum%2==1){
                        // frontseite zur letzten erklären
                        list[sequence-2].lastpage=true;
                    }
                }
            }


            

        });

        let sequenceNum=0;
        list.forEach(function(item){
            if(item.pagenum%2==0){
                var seq = sequenceNum.toString(2).substr(-3);//.split("").reverse().join("");
                sequenceNum++;
                while(seq.length<3){
                    seq='0'+seq;
                }
                
                var seq = '1'+'x'+seq+'p1';

                if (item.lastpage ==true){
                    seq = seq.replace('x','1');
                }else{
                    seq = seq.replace('x','0');
                }

                if ((seq.split("1").length - 1)%2==1){
                    seq = seq.replace('p','1');
                }else{
                    seq = seq.replace('p','0');
                }
                item.omr=seq;
            }
        });
        

        model.set('preparing',false);
        model.set('prepared',true);
        model.getStore('jobfiles').loadData(list);
    }

});
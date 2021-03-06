{Command} = require 'tualo-commander'
path = require 'path'
fs = require 'fs'
os = require 'os'
glob = require 'glob'
mkdirp = require 'mkdirp'
{spawn} = require 'child_process'


PDFDocument = require('pdfkit')
app = require('express')()
http = require('http').Server(app)
bbs = require('../main')
parseString = require('xml2js').parseString;

grayprinter=''
colorprinter=''




module.exports =
class HttpServer extends Command
  @commandName: 'httpserver'
  @commandArgs: ['port','jobpath','archivpath','errorpath']
  @commandShortDescription: 'running the hybrid letter service'
  @options: []

  @help: () ->
    """

    """

  action: (options,args) ->
    me = @
    if args.port
      @args = args
      @prnNumber = 10000
      @tempdir = path.join(os.tmpdir(),'hls')
      #'/Users/thomashoffmann/Desktop/hybrid-test'

      mkdirp @tempdir,(err) ->
        if err
          console.error err
        fs.copyFileSync( path.resolve( path.join('.','images','blank.jpg') ), path.join(me.tempdir,'blank.jpg') )
        fs.copyFileSync( path.resolve( path.join('.','images','blank.pdf') ), path.join(me.tempdir,'blank.pdf') )
      @openExpressServer()

      mkdirp path.resolve( path.join('.','config' ) ),(err) ->
        if err
          console.error err
        me.sequencesStore = me.readSequences()

  openExpressServer: () ->
    express = require('express')
    bodyParser = require('body-parser')
    app = express()

    app.use bodyParser.json()
    app.use bodyParser.urlencoded {extended: true}
    
    app.use '/hls/app', express.static( path.join('.','www','app') )
    app.use '/app', express.static( path.join('.','www','app') )

    app.use '/hls/preview', express.static( @tempdir )

    app.get '/hls/', (req, res) =>
      result = {success: true}
      res.send(JSON.stringify(result))




    app.get '/hls/hybrid/list', (req, res) =>
      me = @
      result = {success: true}
      # console.log '/hls/hybrid/list'
      me.filter = null

      prms = @globJobFiles()
      .then (data) ->
        result.data=data
        # console.log '/hls/hybrid/list',data.length
        if data.length > 0
          prms_font = me.precheckfonts_loop(data)
          .then (result_liste) ->
            # console.log '/hls/hybrid/list'
            result.data=result_liste
            promise3 = me.processJobFiles2SinglePages(result_liste)
            .then (data) ->
              result.data=result_liste
              res.send JSON.stringify(result)
            .catch (data) ->
              result.success= false
              result.msg = "Fehler beim Vorbereiten der Aufträge *"
              console.log 'Fehler beim Vorbereiten der Aufträge', data
              res.send JSON.stringify(result)
          .catch (data) ->
            result.success=false
            result.data_fonts=data
            res.send JSON.stringify(result)
        else
          result.success=true
          result.data = []
          result.msg="keine Daten"
          res.send JSON.stringify(result)

      .catch (data) ->
        result.success= false
        result.msg = "Fehler beim Lesen der Aufträge"
        res.send JSON.stringify(result)
      

    app.get '/hls/hybrid/preview', (req, res) =>
      me = @
      result = {success: true}
      me.filter = null
      if req.query
        if req.query.file
          me.filter = req.query.file
      prms = me.globJobFiles()
      .then (data) ->


        promise3 = me.processJobFiles2SinglePages(data)
        .then (data) ->
          result.data=me.processJobFilesImageList data
          res.send JSON.stringify(result)
        .catch (data) ->
          result.success= false
          result.msg = "Fehler beim Vorbereiten der Aufträge *"
          res.send JSON.stringify(result)

        if false
          prms2 = me.processJobFilesPNGPages(data)
          .then (data) ->
            result.data=me.processJobFilesPNGList data
            res.send JSON.stringify(result)
          .catch (data) ->
            result.success= false
            result.msg = "Fehler beim Vorbereiten der Aufträge"
            res.send JSON.stringify(result)
      .catch (data) ->
        result.success= false
        result.msg = "Fehler beim Vorbereiten der Aufträge"
        res.send JSON.stringify(result)

    
    app.post '/hls/hybrid/print', (req, res) =>
      me = @
      result = {success: true}
      files = JSON.parse( req.body.files);
      running = Array(files.length).fill(1);
      kllj = me.killoldjobs()
      .then (data,opt) ->
        cancelcups = me.runcommand 'cancel',['-a']
        .then (data,opt) ->

          for file,index in files
            console.log 'print',file
            printerName='vario'
            scriptname=path.resolve(path.join(__dirname,'..','..','scripts','black'))
            #printerName='color'
            if file.indexOf('color')>=0
              printerName='color'
              scriptname=path.resolve(path.join(__dirname,'..','..','scripts','color'))

            cupsenable = me.runcommand 'cupsenable',[printerName]
            .then (data,opt) ->

              params = []
              params.push path.join(me.tempdir,file)

              console.log 'print',params

              #me.archivFiles file
              fn = (index) ->
                prms = me.runcommand scriptname,params
                .then (data,opt) ->
                  result.success= true
                  result.msg = "Gedruckt"
                  result.data = data
                  console.log 'print','done',running.reduce(me._sum, 0),index,data

                  me.archivFiles file

                  running[index-1]=0
                  console.log 'print','done*',running,running.reduce(me._sum, 0),index,data

                  if running.reduce(me._sum, 0)==0
                    console.log 'print','done',running.reduce(me._sum, 0),index,data
                    res.send JSON.stringify(result)

                .catch (data) ->
                  console.log 'print',"Fehler beim Drucken ("+printerName+")",index,data
                  result.success= false
                  result.data = data
                  running[index]=0
                  result.msg = "Fehler beim Drucken ("+printerName+")"
                  if running.reduce(me._sum, 0)==0
                    res.send JSON.stringify(result)
              fn(index)
              
              if false
                params = []
                params.push '-J'+file
                params.push '-o'
                params.push 'sides=two-sided-long-edge'
                params.push '-o'
                params.push 'Duplex=DuplexNoTumble'
                params.push '-P'
                params.push printerName
                params.push path.join(me.tempdir,file)

                console.log 'print',params

                #me.archivFiles file
                fn = (index) ->
                  prms = me.runcommand 'lpr',params
                  .then (data,opt) ->
                    result.success= true
                    result.msg = "Gedruckt"
                    result.data = data
                    console.log 'print','done',running.reduce(me._sum, 0),index,data

                    me.archivFiles file

                    running[index-1]=0
                    console.log 'print','done*',running,running.reduce(me._sum, 0),index,data

                    if running.reduce(me._sum, 0)==0
                      console.log 'print','done',running.reduce(me._sum, 0),index,data
                      res.send JSON.stringify(result)

                  .catch (data) ->
                    console.log 'print',"Fehler beim Drucken ("+printerName+")",index,data
                    result.success= false
                    result.data = data
                    running[index]=0
                    result.msg = "Fehler beim Drucken ("+printerName+")"
                    if running.reduce(me._sum, 0)==0
                      res.send JSON.stringify(result)
                fn(index)

            .catch (data) ->
              result.success = false
              result.msg = 'failed cupsenable'
              res.send JSON.stringify(result)


        .catch (data) ->
          result.success = false
          result.msg = 'failed cancelcups'
          res.send JSON.stringify(result)

      .catch (data) ->
        console.log 'killall failed'
        res.send JSON.stringify(result)

      

    app.get '/hls/hybrid/pdfpages', (req, res) =>
      me = @
      result = {success: true}
      prms = me.globJobFiles()
      .then (data) ->
        data=me.processJobFilesImageList data
        prms2 = me.processCreatePDF(data)
        .then (data) ->
          result.data=data
          res.send JSON.stringify(result)
        .catch (data) ->
          result.success= false
          result.msg = "Fehler beim Vorbereiten der Aufträge"
          res.send JSON.stringify(result)
      .catch (data) ->
        result.success= false
        result.msg = "Fehler beim Vorbereiten der Aufträge"
        res.send JSON.stringify(result)

    app.listen @args.port,'0.0.0.0'



  killoldjobs: () ->
    me = @
    new Promise (resolve, reject) ->

      lpstat = me.runcommand 'lpstat',[]
      .then (data,opt) ->
        console.log 'killoldjobs',data
        datalist = data.split("\n")
        datalist.forEach ( line ) ->
          tabs =line.split(/\s/)
          lpstat = me.runcommand 'cancel',[tabs[0]]
          .then (data,opt) ->
            console.log 'killed job',tabs[0]
          .catch (data) ->
            console.log 'killed job',tabs[0],'failed'

        resolve(true)

      .catch (data) ->
        console.log 'killoldjobs*',data
        reject(true)

    #cancelcups = me.runcommand 'cancel',['-a']
    #.then (data,opt) ->

  
  runcommand: (cmd,param,opt) ->
    new Promise (resolve, reject) ->
      try
        prg = spawn cmd , param
        hasError = false
        errorText = "";
        outputText = "";
        prg.on 'error', (error) ->
          console.error "ERROR error",error
          reject error,opt
        prg.stdout.on 'data', (data) ->
          outputText+=data.toString() + "\n"
          
        prg.stderr.on 'data', (data) ->
          #if data.toString().indexOf('ERROR: A pdfmark destination page')>0
          #  errorText+=data.toString()+"\n"
          #else
          errorText+=data.toString()+"\n"
          hasError = true

        prg.on 'close', (code) ->
          if hasError
            console.error "ERROR ---",errorText
            reject errorText,opt
          else
            resolve outputText,opt
      catch e
        console.error 'X',e
        reject e,opt
  

  _sum: (pv, cv) -> 
    pv+cv


  # Job Liste der XML Daten durchlaufen
  # Je Auftragsseite eine einzelne PDF erzeugen
  
  processJobFiles2SinglePages: (liste) ->
    me = @
    result_liste = []
    return new Promise (resolve, reject) ->
      running = Array(liste.length).fill(1);
      listFN = (index) ->
        if index < liste.length
          item = liste[index]
          filename = path.basename(item.file).replace('.xml','.pdf')
          dirname = path.dirname(item.file)
          prms = me.printablePDFPages dirname,filename
          .then (data) ->
            result_liste.push item
            running[index]=0
            if running.reduce(me._sum, 0)==0
              resolve liste
          .catch (data) ->
            running[index]=0
            ## move error files
            if fs.existsSync(  path.join( dirname , filename ) )
              fs.writeFileSync(path.join( me.args.errorpath , filename+'.error.txt' ),JSON.stringify(data,null,1))
              fs.copyFileSync( path.resolve(  path.join( dirname , filename )  ),  path.join( me.args.errorpath , filename )  )
              fs.unlinkSync( path.resolve(  path.join( dirname , filename )  ) )
            if fs.existsSync(  path.join( dirname , filename.replace('.pdf','.xml') ) )
              fs.copyFileSync( path.resolve(  path.join( dirname , filename.replace('.pdf','.xml') )  ),  path.join( me.args.errorpath , filename.replace('.pdf','.xml') )  )
              fs.unlinkSync( path.resolve(  path.join( dirname , filename.replace('.pdf','.xml') )  ) )

            if running.reduce(me._sum, 0)==0
              resolve liste
            #console.log "processJobFiles2SinglePages", filename
            #console.log "processJobFiles2SinglePages", data
            #reject data
          listFN index+1
        else
          
      listFN 0

  precheckfonts_loop: (liste)->
    me = @
    result_liste = []
    return new Promise (resolve, reject) ->
      running = Array(liste.length).fill(1);
      listFN = (index) ->
        if index < liste.length
          item = liste[index]
          fullfilename = item.file.replace('.xml','.pdf')
          filename = path.basename(item.file).replace('.xml','.pdf')
          dirname = path.dirname(item.file)
          prms = me.precheckfonts fullfilename
          .then (data) ->
            liste[index].fontcheck = data
            result_liste.push liste[index]
            running[index]=0
            if running.reduce(me._sum, 0)==0
              resolve result_liste
          .catch (data) ->
            running[index]=0
            if fs.existsSync(  path.join( dirname , filename ) )
              fs.writeFileSync(path.join( me.args.errorpath , filename+'.error.txt' ),JSON.stringify(data,null,1))
              fs.copyFileSync( path.resolve(  path.join( dirname , filename )  ),  path.join( me.args.errorpath , filename )  )
              fs.unlinkSync( path.resolve(  path.join( dirname , filename )  ) )
            if fs.existsSync(  path.join( dirname , filename.replace('.pdf','.xml') ) )
              fs.copyFileSync( path.resolve(  path.join( dirname , filename.replace('.pdf','.xml') )  ),  path.join( me.args.errorpath , filename.replace('.pdf','.xml') )  )
              fs.unlinkSync( path.resolve(  path.join( dirname , filename.replace('.pdf','.xml') )  ) )
            if running.reduce(me._sum, 0)==0
              resolve result_liste
            #reject data
          listFN index+1
        else
      listFN 0

  precheckfonts: (filename) ->
    #pdffonts
    #console.log('#','precheckfonts',filename)
    me = @
    new Promise (resolve, reject) ->
      params = []
      params.push path.join(filename)
      #console.log('pdffonts','--->')
      prms = me.runcommand 'pdffonts',params
      .then (data) ->
        result = 
          success: true
          msg: ''
          filename: path.basename(filename)
          fonts: []
        fonts_tab = data.split(/\n/)
        hasError = false
        fonts_tab.forEach (line) ->
          columns = line.replace(/\s\s+/g,' ').split(/\s/)
          if columns.length > 0
            if columns[0] != 'name'
              if columns[0].indexOf('--') != 0
                # 'name', 'type', 'encoding', 'emb', 'sub', 'uni', 'object', 'ID'
                result.fonts.push {name: columns[0],type: columns[1], encoding: columns[2], emb: columns[3], sub: columns[4], uni: columns[5], object: columns[6], id: columns[7]}
                if columns[3]=='no' and columns[4]=='no'
                  reject result
                  #result.success = false
                  #result.message = 'Die Schriftart '+columns[0]+' kann nicht richtig verarbeitet werden'
          #console.log('#',line,line.replace(/\s\s+/g,' ').split(/\s/))
        resolve(result)
      .catch (data) ->
        console.log('# error',data)
        reject data

  printablePDFPages: (dirname, filename) ->
    me = @
    new Promise (resolve, reject) ->
      params = []
      params.push '-q'
      params.push '-dNOPAUSE'
      params.push '-dDOPDFMARKS=false'
      params.push '-dBATCH'
      params.push '-sDEVICE=pdfwrite'
      params.push '-r600'
      params.push '-sOutputFile='+path.join(me.tempdir,filename)+'%05d.pdf'
      params.push '-dPDFFitPage'
      params.push '-dFIXEDMEDIA'
      params.push '-sPAPERSIZE=a4'
      params.push '-dAutoRotatePages=/None'

      #gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dFIXEDMEDIA -dPDFFitPage -sPAPERSIZE=a4 -dAone

      # -dNODISPLAY -q -sFile=IN.PDF -dDumpMediaSizes pdf_info.ps >DUMP.TXT
      #-dAutoRotatePages=/PageByPage
      #-dAutoRotatePages=/None
      #params.push '-dAutoRotatePages=/PageByPage'
      params.push path.join(dirname,filename)

      #console.log  'gs ',params.join(' '),path.join(dirname,filename)
      prms = me.runcommand 'gs',params
      .then (data) ->
        

        params2 = []
        params2.push '-q'
        params2.push '-dNOPAUSE'
        params2.push '-dBATCH'
        params2.push '-dDOPDFMARKS=false'
        params2.push '-sDEVICE=jpeg'
        params2.push '-r72'
        params2.push '-sOutputFile='+path.join(me.tempdir,filename)+'%05d.jpg'
        params2.push path.join(dirname,filename)

        prms2 = me.runcommand 'gs',params2
        .then (data2) ->
          resolve data
        .catch (data2) ->
          reject data2
      .catch (data) ->
        reject data

  #-dNODISPLAY -q -sFileName=abc.pdf -c "FileName (r) file runpdfbegin 1 1 pdfpagecount {pdfgetpage /MediaBox get {=print ( ) print} forall (\n) print} for quit"
  #rotateOut

  processJobFilesImageList: (liste) ->
    me = @
    list = []
    n=0
    sequence=0

    for item in liste
      filename = path.basename(item.file,'.xml')
      dirname = path.dirname(item.file)
      imageliste = glob.sync( path.join(me.tempdir,filename)+'*.jpg' )
      p=0
      for l in imageliste
        baseitem = JSON.parse(JSON.stringify(item,null,1))
        baseitem.num = n++
        baseitem.id = baseitem.num
        baseitem.image = l
        baseitem.highrespdf = l.replace('.jpg','.pdf')
        baseitem.preview = path.join('../preview',path.basename(l))
        baseitem.newletter = (p==0)
        baseitem.lastpage  = false
        baseitem.sequence=sequence
        baseitem.printpage=true
        baseitem.omr='---'
        baseitem.pagenum=p
        list.push(baseitem)
        p+=1
        sequence+=1
        if item.layout=="Einseitig"
          #leerseite einfügen
          baseitem=JSON.parse(JSON.stringify(item,null,1))
          baseitem.num = n++
          baseitem.id = baseitem.num

          baseitem.image = path.join(me.tempdir,'blank.jpg')
          baseitem.preview = path.join('../preview','blank.jpg')
          baseitem.highrespdf = path.join(me.tempdir,'blank.pdf')
          baseitem.newletter =(p==0)
          baseitem.lastpage  = false
          baseitem.sequence=sequence
          baseitem.printpage=true
          baseitem.omr='---'
          baseitem.pagenum=p
          list.push(baseitem)
          p+=1
          sequence+=1
          

      #if sequence!=0
      #  if list[sequence-1]
      #    list[sequence-1].lastpage=true

          #if list[sequence-1].pagenum%2==1
            # frontseite zur letzten erklären
          #  list[sequence-2].lastpage=true
      


      if list[list.length-1].pagenum%2==0
        # letzte seite ungerade, eine leere einfügen
        baseitem=JSON.parse(JSON.stringify(list[list.length-1],null,1))
        baseitem.num = n++
        baseitem.id = baseitem.num
        baseitem.image = path.join(me.tempdir,'blank.jpg')
        baseitem.preview = path.join('../preview','blank.jpg')
        baseitem.highrespdf = path.join(me.tempdir,'blank.pdf')
        baseitem.newletter =(p==0)
        baseitem.lastpage  = false
        baseitem.sequence=sequence
        baseitem.printpage=true
        baseitem.omr='---'
        baseitem.pagenum=p
        list.push(baseitem)
        p+=1
        #sequence+=1

    sequenceNum=0

    list = list.reverse()
    console.log "*pages","lastpage","pagenum","sequence","layout","highrespdf"
    loopindex=0
    for item in list
      console.log item.pages,item.lastpage,item.pagenum,item.sequence,item.layout,path.basename(item.highrespdf)
      if item.layout=="Doppelseitig"
        if (item.pages*1==item.pagenum && path.basename(item.highrespdf)=="blank.pdf") || (item.pages*1==item.pagenum+1 && path.basename(item.highrespdf)!="blank.pdf")
          list[loopindex+1].lastpage=true
      else
        if item.pages*1==item.pagenum
          item.lastpage=true
      loopindex++
    list = list.reverse()

    #console.log list
    console.log "pages","lastpage","pagenum","sequence","layout","highrespdf"
    for item in list
      if typeof me.sequencesStore[item.color+'|'+item.envelope]=='undefined'
        me.sequencesStore[item.color+'|'+item.envelope]=0
      sequenceNum=me.sequencesStore[item.color+'|'+item.envelope]
      console.log item.pages,item.lastpage,item.pagenum,item.sequence,item.layout,path.basename(item.highrespdf)
      if item.pagenum%2 == 0
        seq = Number(sequenceNum).toString(2).substr(-3)#;//.split("").reverse().join("")
        # console.log item.highrespdf, sequenceNum, seq
        sequenceNum+=1
        while seq.length < 3
          seq='0'+seq
        seq = '1'+'x'+seq+'p1'
        if item.lastpage
          seq = seq.replace('x','1')
        else
          seq = seq.replace('x','0')

        if (seq.split("1").length - 1)%2==1
          seq = seq.replace('p','1')
        else
          seq = seq.replace('p','0')
        item.omr=seq
        # console.log item.highrespdf,'>>>>>', seq
      me.sequencesStore[item.color+'|'+item.envelope]=sequenceNum

    me.storeSequences()
    return list





  processCreatePDF: (range) ->
    me = @
    res =[]
    new Promise (resolve, reject) ->
      farbe_dlang = []
      farbe_c4 = []
      sw_dlang = []
      sw_c4 = []
      farbe_dlang_txt = {count:0,env:"C6/DIN Lang",col:"Farbdruck"}
      farbe_c4_txt = {count:0,env:"C4",col:"Farbdruck"}
      sw_dlang_txt = {count:0,env:"C6/DIN Lang",col:"Schwarz/ Weiß"}
      sw_c4_txt = {count:0,env:"C4",col:"Schwarz/ Weiß"}

      for record in range
        #DIN C6 (22,9cm x 11,4cm)
        if record.color=='Schwarz/Weiß' and ( record.envelope=='DIN C6 (22,9cm x 11,4cm)' or record.envelope=='DIN C6/5 (22,9cm x 11,4cm)')
          sw_dlang.push record
          sw_dlang_txt.count+=1
        if record.color=='Schwarz/Weiß' and ( record.envelope!='DIN C6 (22,9cm x 11,4cm)' and record.envelope!='DIN C6/5 (22,9cm x 11,4cm)')
          sw_c4.push record
          sw_c4_txt.count+=1
        if record.color!='Schwarz/Weiß' and ( record.envelope=='DIN C6 (22,9cm x 11,4cm)' or record.envelope=='DIN C6/5 (22,9cm x 11,4cm)')
          farbe_dlang.push record
          farbe_dlang_txt.count+=1
        if record.color!='Schwarz/Weiß' and ( record.envelope!='DIN C6 (22,9cm x 11,4cm)' and record.envelope!='DIN C6/5 (22,9cm x 11,4cm)')
          farbe_c4.push record
          farbe_c4_txt.count+=1

      sw = []
      cl = []
      me.headerPages=0
      if sw_dlang.length>0
        sw_dlang_txt.highrespdf = path.join(me.tempdir,'sw_dlang_txt'+'hdr.pdf')
        sw_dlang_txt.omr='---'
        me.headerPages++
        me.createHDRPage sw_dlang_txt
        sw.push sw_dlang_txt
        sw.push { omr: '---',highrespdf: path.join(me.tempdir,'blank.pdf') }

        sw= sw.concat sw_dlang
      if sw_c4.length>0
        sw_c4_txt.highrespdf = path.join(me.tempdir,'sw_c4_txt'+'hdr.pdf')
        sw_c4_txt.omr='---'
        me.headerPages++
        me.createHDRPage sw_c4_txt
        sw.push sw_c4_txt
        sw.push { omr: '---',highrespdf: path.join(me.tempdir,'blank.pdf') }

        sw= sw.concat sw_c4
      if farbe_dlang.length>0
        farbe_dlang_txt.highrespdf = path.join(me.tempdir,'farbe_dlang_txt'+'hdr.pdf')
        farbe_dlang_txt.omr='---'
        me.headerPages++
        me.createHDRPage farbe_dlang_txt
        cl.push farbe_dlang_txt
        cl.push { omr: '---',highrespdf: path.join(me.tempdir,'blank.pdf') }

        cl= cl.concat farbe_dlang
      if farbe_c4.length>0
        farbe_c4_txt.highrespdf = path.join(me.tempdir,'farbe_c4_txt'+'hdr.pdf')
        farbe_c4_txt.omr='---'
        me.headerPages++
        me.createHDRPage farbe_c4_txt
        cl.push farbe_c4_txt
        cl.push { omr: '---',highrespdf: path.join(me.tempdir,'blank.pdf') }

        cl= cl.concat farbe_c4
        

      #while me.headerPages>0
      fn = () ->
        prms = me.createOutPutPDF(sw,false)
        .then (name) ->
          if name!=null
            res.push({name:name})
          prms2 = me.createOutPutPDF(cl,true)
          .then (name) ->
            if name!=null
              res.push({name:name})
            resolve res
          .catch (data) ->
            reject data
        .catch (data) ->
          reject data

      setTimeout fn,3000

  createHDRPage: (record) ->
    me = @
    # deckblatt erzeugen
    pdfopt = 
      size: 'a4'
      layout: 'portrait'
      margin:0
      compress: false
      autoFirstPage: false
    doc = new PDFDocument pdfopt
    doc.pipe fs.createWriteStream( record.highrespdf )
    doc.on 'end', () ->
      me.headerPages--
    pageopt = 
      size: 'a4'
      margin: 0
    doc.addPage pageopt 
    doc.fillColor('black').fontSize(25).text(record.env,100,100).text(record.col,100,150).text('Seiten: '+record.count,100,200).text('Blatt: '+(record.count/2),100,250)
    doc.end()

  createOutPutPDF: (range,color) ->
    me = @
    new Promise (resolve, reject) =>


      @prnNumber+=1
      name = 'job-hybrid-highres-bw-'+(@prnNumber)+'.pdf'
      if color
        name = 'job-hybrid-highres-color-'+(@prnNumber)+'.pdf'


      if range.length==0
        resolve null
      else
        filelist = []
        params = []
        params.push '-q'
        params.push '-dNOPAUSE'
        params.push '-dBATCH'
        params.push '-sDEVICE=pdfwrite'

        params.push '-sOutputFile='+path.join(me.tempdir,name)
        params.push '-dPDFFitPage'

        # -dNODISPLAY -q -sFile=IN.PDF -dDumpMediaSizes pdf_info.ps >DUMP.TXT
        #-dAutoRotatePages=/PageByPage
        #-dAutoRotatePages=/None
        #params.push '-dAutoRotatePages=/PageByPage'

        for record in range
          
          if typeof record.omr!='undefined'
            if record.omr!='---'
              params.push '-f'
              params.push path.resolve( path.join('.','images',record.omr+'.ps') )


            else
              
              params.push '-f'
              params.push path.resolve( path.join('.','images','0000000.ps') )
              
            params.push '-f'
            params.push path.resolve( record.highrespdf )

            filelist.push(record)

        # console.log "\n\n\n\n"+params.join(" \\\n")+"\n\n\n\n"

        prms = me.runcommand 'gs',params
        .then (data) ->
          fs.writeFileSync path.join(me.tempdir,name+'.json'),JSON.stringify(filelist,null,1)
          resolve name
        .catch (data) ->
          reject data

  #cupsenable vario
  #cancel -a
  #lpstat -p vario -l
  #cancel vario-46

  # BEGIN files store data
  globJobFiles: (cb) ->
    me = @
    new Promise (resolve, reject) =>
      pathname = me.args.jobpath
      liste = glob.sync path.join(pathname,'*.xml')
      liste = liste.slice(0, 100)

      @loopxml [],liste,0,(res) ->
        res.forEach (item) ->
          item.shortname = path.basename(item.file)
        
        if me.filter!=null and (typeof me.filter!='undefined')
          res = res.filter (item) -> 
            item.shortname == me.filter

        resolve res

  loopxml: (result,list,index,cb) ->
    if index < list.length
      data = fs.readFileSync(list[index])
      parseString data, (err, res) =>
        o = 
          fname: list[index],
          result: res,
          err: err
        result.push o
        index+=1
        @loopxml result,list,index,cb
    else
      @xml2store result, cb
  
  xml2store: (liste,cb) ->
    result = []
    # console.log('xml2store',liste.length )
    liste.forEach (item) ->
      try
        
        try
          throw new Error(item.fname+' result ist nicht definiert') if typeof item.result == 'undefined'
          throw new Error(item.fname+' JobTicket ist nicht definiert') if typeof item.result.JobTicket == 'undefined'

          throw new Error(item.fname+' JobTicket.TicDP ist nicht definiert') if typeof item.result.JobTicket.TicDP == 'undefined'
          throw new Error(item.fname+' JobTicket.TicDP[0] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0] == 'undefined'

          throw new Error(item.fname+' JobTicket.TicDP[0][TicDruckmodus] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicDruckmodus'] == 'undefined'
          throw new Error(item.fname+' JobTicket.TicDP[0][TicDruckmodus][0] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicDruckmodus'][0] == 'undefined'
          
          throw new Error(item.fname+' JobTicket.TicDP[0][TicDruckmodus][0][value] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'] == 'undefined'
          throw new Error(item.fname+' JobTicket.TicDP[0][TicDruckmodus][0][value][0] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'][0] == 'undefined'

          
          throw new Error(item.fname+' JobTicket.TicDP[0][TicKuvertgrösse] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicKuvertgrösse'] == 'undefined'
          throw new Error(item.fname+' JobTicket.TicDP[0][TicKuvertgrösse][0] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0] == 'undefined'
          
          throw new Error(item.fname+' JobTicket.TicDP[0][TicKuvertgrösse][0][value] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'] == 'undefined'
          throw new Error(item.fname+' JobTicket.TicDP[0][TicKuvertgrösse][0][value][0] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'][0] == 'undefined'
          
          throw new Error(item.fname+' JobTicket.TicDP[0][TicLayout] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicLayout'] == 'undefined'
          throw new Error(item.fname+' JobTicket.TicDP[0][TicLayout][0] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicLayout'][0] == 'undefined'
          
          throw new Error(item.fname+' JobTicket.TicDP[0][TicLayout][0][value] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'] == 'undefined'
          throw new Error(item.fname+' JobTicket.TicDP[0][TicLayout][0][value][0] ist nicht definiert') if typeof item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'][0] == 'undefined'
          id = item.result.JobTicket.Job_ID[0]
          #console.log 'xml2store','id',id,JSON.stringify(item.result.JobTicket.TicDP,null,1)
          customer = item.result.JobTicket.Customer[0]
          pagecnt = item.result.JobTicket.Page_cnt[0]
          color = item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'][0]
          envelope = item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'][0]
          layout = item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'][0]
        catch e 
          id = (new Date()).getTime()
          #console.log 'xml2store','id',id,JSON.stringify(item.result.JobTicket.TicDP,null,1)
          customer = e.message
          pagecnt = 1
          color = 'Farbe'
          envelope = 'DIN C6 (22,9cm x 11,4cm)'
          layout = ''


        o =
          id: id+item.fname
          group: envelope+' / '+color
          customer: customer
          file: item.fname
          pages: pagecnt
          color: color
          envelope: envelope
          layout: layout
          processed: false
        result.push o
      catch e
        console.log e
    # console.log('xml2store', result  )
    cb result
  # END files store data


  readSequences: () ->
    me=@
    sequences = {}
    try
      if fs.existsSync( path.resolve( path.join('.','config','sequences.json') ) )
        sequencesL = JSON.parse(fs.readFileSync( path.resolve( path.join('.','config','sequences.json') ) ).toString())
        for pos in sequencesL
          sequences[pos.key]=pos.value
    catch e
      console.error e
    return sequences

  storeSequences: () ->
    me=@
    try
      sequencesL=[]
      for k in me.sequencesStore
        if me.sequencesStore.hasOwnProperty(k)
          sequencesL.push({key: k, value: me.sequencesStore[k]})
      fs.writeFileSync(path.resolve( path.join('.','config','sequences.json') ),JSON.stringify(sequencesL,null,1))
    catch e
      console.error e

  archivFiles: (file) ->
    me = @
    if fs.existsSync(path.join(me.tempdir,file+'.json'))
      files = JSON.parse(fs.readFileSync(path.join(me.tempdir,file+'.json')))
      # console.log 'archivFiles',files
      files.forEach (fileitem) ->
        if typeof fileitem.shortname=='string'
          
          strdate = (new Date()).toISOString().substr(0,10);

          mkdirp path.resolve( path.join( me.args.archivpath,strdate  ) ), (err) ->
            if fs.existsSync(  path.join(me.args.jobpath,fileitem.shortname) )
              fs.copyFileSync( path.resolve( path.join(me.args.jobpath,fileitem.shortname) ), path.join(me.args.archivpath,strdate,fileitem.shortname) )
            if fs.existsSync(  path.join(me.args.jobpath,fileitem.shortname.replace('.xml','.pdf')) )
              fs.copyFileSync( path.resolve( path.join(me.args.jobpath,fileitem.shortname.replace('.xml','.pdf')) ), path.join(me.args.archivpath,strdate,fileitem.shortname.replace('.xml','.pdf')) )
            if fs.existsSync(  path.join(me.args.jobpath,fileitem.shortname) )
              fs.unlinkSync( path.resolve( path.join(me.args.jobpath,fileitem.shortname) ) )
            if fs.existsSync(  path.join(me.args.jobpath,fileitem.shortname.replace('.xml','.pdf')) )
              fs.unlinkSync( path.resolve( path.join(me.args.jobpath,fileitem.shortname.replace('.xml','.pdf')) ) )
          if fs.existsSync(path.join(me.tempdir,file+'.json'))
            fs.unlinkSync( path.join(me.tempdir,file+'.json') )


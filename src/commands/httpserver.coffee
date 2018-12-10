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
  @commandArgs: ['port','jobpath']
  @commandShortDescription: 'running the bbs machine controll service'
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
        fs.copyFileSync( path.resolve( path.join('.','images','blank.png') ), path.join(me.tempdir,'blank.png') )
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
    
    app.use '/app', express.static( path.join('.','www','app') )
    app.use '/preview', express.static( @tempdir )

    app.get '/', (req, res) =>
      result = {success: true}
      res.send(JSON.stringify(result))

    app.get '/hybrid/list', (req, res) =>
      result = {success: true}
      prms = @globJobFiles()
      .then (data) ->
        result.data=data
        res.send JSON.stringify(result)
      .catch (data) ->
        result.success= false
        result.msg = "Fehler beim Lesen der Aufträge"
        res.send JSON.stringify(result)

    app.get '/hybrid/preview', (req, res) =>
      me = @
      result = {success: true}
      prms = me.globJobFiles()
      .then (data) ->
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

    
    app.post '/hybrid/print', (req, res) =>
      me = @
      result = {success: true}
      files = JSON.parse( req.body.files);
      running = Array(files.length).fill(1);
      for file,index in files
        printerName='vario'
        if file.indexOf('color')
          printerName='color'
        params = []
        params.push '-J'+file
        params.push '-o'
        params.push 'sides=two-sided-long-edge'
        params.push '-o'
        params.push 'Duplex=DuplexNoTumble'
        params.push '-P'
        params.push printerName
        params.push path.join(me.tempdir,file)
        fn = (index) ->
          prms = me.runcommand 'lpr',params
          .then (data,opt) ->
            result.success= true
            result.msg = "Gedruckt"
            result.data = data
            running[index]=0
            if running.reduce(me._sum, 0)==0
              res.send JSON.stringify(result)

          .catch (data) ->
            result.success= false
            result.data = data
            running[index]=0
            result.msg = "Fehler beim Drucken ("+printerName+")"
            if running.reduce(me._sum, 0)==0
              res.send JSON.stringify(result)
        fn(index)

    app.get '/hybrid/pdfpages', (req, res) =>
      me = @
      result = {success: true}
      prms = me.globJobFiles()
      .then (data) ->
        data=me.processJobFilesPNGList data
        prms2 = me.processCreatePDF(data)
        .then (data) ->
          console.log data
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




  runcommand: (cmd,param,opt) ->
    new Promise (resolve, reject) ->
      try
        prg = spawn cmd , param
        hasError = false
        errorText = "";
        outputText = "";
        prg.stdout.on 'data', (data) ->
          outputText+=data.toString() + "\n"
          
        prg.stderr.on 'data', (data) ->
          errorText+=data.toString()+"\n"
          hasError = true

        prg.on 'close', (code) ->
          if hasError
            console.error "ERROR",errorText
            reject errorText,opt
          else
            resolve outputText,opt
      catch e
        console.error 'X',e
        reject e,opt
  

  _sum: (pv, cv) -> 
    pv+cv

  # start converting parallel
  # running keeps the state of all still running proceses
  processJobFilesPNGPages: (liste) ->
    me = @
    return new Promise (resolve, reject) ->
      running = Array(liste.length).fill(1);
      listFN = (index) ->
        if index < liste.length
          item = liste[index]
          filename = path.basename(item.file).replace('.xml','.pdf')
          dirname = path.dirname(item.file)
          device = 'png16m'
          if item.color=='Schwarz/Weiß'
            device = 'pnggray'
          prms = me.printablePages dirname,filename, device
          .then (data) ->
            running[index]=0
            if running.reduce(me._sum, 0)==0
              resolve liste
          .catch (data) ->
            reject data
          listFN index+1
        else
          
      listFN 0

  printablePages: (dirname, filename, device) ->
    me = @
    new Promise (resolve, reject) ->
      params = []
      params.push '-q'
      params.push '-dNOPAUSE'
      params.push '-dBATCH'
      params.push '-sDEVICE='+device
      params.push '-r600'
      params.push '-sOutputFile='+path.join(me.tempdir,filename)+'%05d.png'
      params.push path.join(dirname,filename)

      prms = me.runcommand 'gs',params
      .then (data) ->
        console.log 'data',data
        resolve data
      .catch (data) ->
        reject data


  processJobFilesPNGList: (liste) ->
    me = @
    list = []
    n=0
    sequence=0

    for item in liste
      filename = path.basename(item.file,'.xml')
      dirname = path.dirname(item.file)
      pngliste = glob.sync( path.join(me.tempdir,filename)+'*.png' )
      p=0
      for l in pngliste
        baseitem = JSON.parse(JSON.stringify(item,null,1))
        baseitem.num = n++
        baseitem.id = baseitem.num
        baseitem.image = l
        baseitem.preview = path.join('/preview',path.basename(l))
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
          baseitem.image = path.join(me.tempdir,'blank.png')
          baseitem.preview = path.join('/preview','blank.png')
          baseitem.newletter =(p==0)
          baseitem.lastpage  = false
          baseitem.sequence=sequence
          baseitem.printpage=true
          baseitem.omr='---'
          baseitem.pagenum=p
          list.push(baseitem)
          p+=1
          sequence+=1
          

        if list[list.length-1].pagenum%2==0
          # letzte seite ungerade, eine leere einfügen
          baseitem=JSON.parse(JSON.stringify(list[list.length-1],null,1))
          baseitem.num = n++
          baseitem.id = baseitem.num
          baseitem.image = path.join(me.tempdir,'blank.png')
          baseitem.preview = path.join('/preview','blank.png')
          baseitem.newletter =(p==0)
          baseitem.lastpage  = false
          baseitem.sequence=sequence
          baseitem.printpage=true
          baseitem.omr='---'
          baseitem.pagenum=p
          list.push(baseitem)
          p+=1
          sequence+=1

        if sequence!=0
          if list[sequence-1]
            list[sequence-1].lastpage=true
            if list[sequence-1].pagenum%2==1
              # frontseite zur letzten erklären
              list[sequence-2].lastpage=true
    sequenceNum=0

    for item in list
      if typeof me.sequencesStore[item.color+'|'+item.envelope]=='undefined'
        me.sequencesStore[item.color+'|'+item.envelope]=0
      sequenceNum=me.sequencesStore[item.color+'|'+item.envelope]

      if item.pagenum%2==0
        seq = sequenceNum.toString(2).substr(-3)#;//.split("").reverse().join("")
        sequenceNum+=1
        while seq.length<3
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
        if record.color=='Schwarz/Weiß' and record.envelope=='DIN C6/5 (22,9cm x 11,4cm)'
          sw_dlang.push record
          sw_dlang_txt.count+=1
        if record.color=='Schwarz/Weiß' and record.envelope!='DIN C6/5 (22,9cm x 11,4cm)'
          sw_c4.push record
          sw_c4_txt.count+=1
        if record.color!='Schwarz/Weiß' and record.envelope=='DIN C6/5 (22,9cm x 11,4cm)'
          farbe_dlang.push record
          farbe_dlang_txt.count+=1
        if record.color!='Schwarz/Weiß' and record.envelope!='DIN C6/5 (22,9cm x 11,4cm)'
          farbe_c4.push record
          farbe_c4_txt.count+=1

      sw = []
      cl = []

      if sw_dlang.length>0
        sw.push sw_dlang_txt
        sw= sw.concat sw_dlang
      if sw_c4.length>0
        sw.push sw_c4_txt
        sw= sw.concat sw_c4
      if farbe_dlang.length>0
        cl.push farbe_dlang_txt
        cl= cl.concat farbe_dlang
      if farbe_c4.length>0
        cl.push farbe_c4_txt
        cl= cl.concat farbe_c4
        
     
      prms = me.createPRNDATA(sw,false)
      .then (name) ->
        if name!=null
          res.push({name:name})
        prms2 = me.createPRNDATA(cl,true)
        .then (name) ->
          if name!=null
            res.push({name:name})
          resolve res
        .catch (data) ->
          reject false
      .catch (data) ->
        reject false


  createPRNDATA: (range,color) ->
    me = @
    new Promise (resolve, reject) =>
      @prnNumber+=1
      name = 'job-hybrid-highres-bw-'+(@prnNumber)+'.pdf'
      if color
        name = 'job-hybrid-highres-color-'+(@prnNumber)+'.pdf'
      pdfopt = 
        size: 'a4'
        layout: 'portrait'
        margin:0
        compress: false
        autoFirstPage: false
      if range.length==0
        resolve null
      else
        doc = new PDFDocument pdfopt
        doc.pipe fs.createWriteStream( path.join(me.tempdir,name) )
        doc.on 'end', () ->
          console.log 'end', color
          resolve name


        pageopt = 
          size: 'a4'
          margin: 0
        for record in range
          doc.addPage pageopt 
          if typeof record.preview=='undefined'
            doc.fillColor('black').fontSize(25).text(record.env,100,100).text(record.col,100,150).text('Seiten: '+record.count,100,200).text('Blatt: '+(record.count/2),100,250)
            doc.addPage pageopt # empty second page
          else
            if record.image!=''
              doc.image record.image,0,0, {fit: [@toPT(210),@toPT(297)] }
          @setOMR record,doc

        doc.end()
    
  toPT: (mm) ->
    (mm/25.4)*72

  setOMR: (record,doc) ->
    ys=4.23
    l = 6
    x = 4
    y_start = 297-250
    if typeof record.omr!='undefined'
      p = record.omr.split("")
      for i in p
        if i=="1"
          doc.lineWidth( @toPT(0.4))
          doc.moveTo( @toPT(x), @toPT(y_start) ).lineTo( @toPT(x+l), @toPT(y_start) ).stroke()
        y_start+=ys




  # BEGIN files store data
  globJobFiles: (cb) ->
    me = @
    new Promise (resolve, reject) =>
      pathname = me.args.jobpath
      console.log path.join(pathname,'*.xml')
      liste = glob.sync path.join(pathname,'*.xml')
      @loopxml [],liste,0,(res) ->
        resolve res

  loopxml: (result,list,index,cb) ->
    if index<list.length
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
    liste.forEach (item) ->

      id = item.result.JobTicket.Job_ID[0]
      customer = item.result.JobTicket.Customer[0]
      pagecnt = item.result.JobTicket.Page_cnt[0]

      color = item.result.JobTicket.TicDP[0]['TicDruckmodus'][0]['value'][0]
      envelope = item.result.JobTicket.TicDP[0]['TicKuvertgrösse'][0]['value'][0]
      layout = item.result.JobTicket.TicDP[0]['TicLayout'][0]['value'][0]

      o =
        id: id
        group: envelope+' / '+color
        customer: customer
        file: item.fname
        pages: pagecnt
        color: color
        envelope: envelope
        layout: layout
        processed: false
      result.push o
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


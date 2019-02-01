{Command} = require 'tualo-commander'
path = require 'path'
fs = require 'fs'
os = require 'os'
glob = require 'glob'

module.exports =
class GenerateOMR extends Command
  @commandName: 'generateomr'
  @commandArgs: ['path']
  @commandShortDescription: 'running the bbs machine controll service'
  @options: []

  @help: () ->
    """

    """

  action: (options,args) ->
    me = @
    if args.path
        for i in [0..31]
            #console.log 'here', "1"+("00000" + i.toString(2) ).slice(-5)+"1"
            code = "1"+("00000" + i.toString(2) ).slice(-5)+"1"
            lines = me.setOMR  code
            txt = '%!'+"\n"
            txt += '<<'+"\n"
            txt += '    /PageSize [595 842]'+"\n"
            txt += '    /EndPage {'+"\n"
            txt += '        exch pop 2 lt {'+"\n"
            txt += '            gsave'+"\n"
            txt += lines
            txt += '            grestore'+"\n"
            txt += '            true'+"\n"
            txt += '        } { false } ifelse'+"\n"
            txt += '    }bind'+"\n"
            txt += '>>setpagedevice'+"\n"
            fs.writeFileSync(path.join(args.path,code+'.ps'),txt)

  toPT: (mm) ->
    (mm/25.4)*72

  setOMR: (omr) ->
    txt=""
    ys=4.23
    l = 6
    x = 4
    y_start = 297-250
    p = omr.split("")
    for i in p
        if i=="1"
            #doc.lineWidth( @toPT(0.4))
            #doc.moveTo( @toPT(x), @toPT(y_start) ).lineTo( @toPT(x+l), @toPT(y_start) ).stroke()
            sp = '             '
            txt+=sp+"newpath"+"\n"
            txt+=sp+@toPT(x) + " " + (@toPT(297) - @toPT(y_start)) + " moveto"+"\n"
            txt+=sp+@toPT(x+l) + " " + (@toPT(297) - @toPT(y_start)) + " lineto"+"\n"
            txt+=sp+@toPT(0.4) + " setlinewidth"+"\n"
            txt+=sp+"stroke"+"\n"
        y_start+=ys
    return txt
Ext.define('HybridLetterServer.model.Portal', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.hybrid_model_portal',
    data: {
        prepared: false,
        printing: false,
        preparing: false,
    },
    formulas: {
        canPrint: function(get){
            return (!get('printing'))&&get('prepared');
        },
        canPrepare: function(get){
            return  (!get('printing'))&&(!get('preparing'));
        }
    },
    stores: {
      files: {
        type: 'json',
        groupField: 'group',
        fields:[
            {name:'id',type:"string"},
            {name:'color',type:"string"},
            {name:'layout',type:"string"},
            {name:'envelope',type:"string"},
            {name:'customer',type:"string"},
            {name:'group',type:"string"},
            {name:'file',type: 'string'},
            {name:'shortname',type: 'string'},
            {name:'pages',type:"number"}
        ],
        proxy: {
            type: 'ajax',
            timeout: 300000,
            url: '/hls/hybrid/list',
            reader: {
                type: 'json',
                rootProperty: 'data'
            }
        },
        listeners: {
            load: 'onFilesLoad'
        }
        
      },
      
      preview: {
        type: 'json',
        groupField: 'group',
        autoLoad: false,
        fields:[
            {name:'num',type:'number'},
            {name:'id',type:"number"},

            {name:'color',type:"string"},
            {name:'envelope',type:"string"},

            {name:'layout',type:"string"},

            {name:'customer',type:"string"},
            {name:'group',type:"string"},
            {name:'file',type: 'string'},
            {name:'jpg',type: 'string'},

            {name:'pages',type:"number"},




            {name:'newletter',type:"boolean"},
            {name:'lastpage',type:"boolean"},
            {name:'frontpage',type:"boolean"},
            
            {name:'sequence',type:"number"},
            {name:'omr',type:"string"},
            {name:'pagenum',type:"number"}

        ],
        proxy: {
            type: 'ajax',
            timeout: 300000,
            url: '/hls/hybrid/preview',
            reader: {
                type: 'json',
                rootProperty: 'data'
            }
        },
        listeners: {
            load: 'onPreviewLoad'
        }
        
      },


      pdfpages: {
        type: 'store',
        fields:[
            {name:'name',type:'string'},
            {name:'color',type:'string'}
        ],
        proxy: {
            type: 'ajax',
            url: '/hls/hybrid/pdfpages',
            reader: {
                type: 'json',
                rootProperty: 'data'
            }
        }
        
      }

    }

  });
  
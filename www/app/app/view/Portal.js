Ext.define('HybridLetterServer.view.Portal', {
    extend: 'Ext.panel.Panel',
    requires: [
        'HybridLetterServer.model.Portal',
        'HybridLetterServer.controller.Portal',
        'Ext.grid.feature.Grouping'
    ],
    layout: 'border',
    alias: 'widget.hybrid_views_portal',
    viewModel: {
        type: 'hybrid_model_portal'
    },
    controller: 'hybrid_controller_portal',
    listeners:{
        boxReady: 'onBoxReady'
    },
    items:[


        {
            region: 'west',
            //xtype: 'grid',
            tbar:[
                {
                    text: 'Vorverarbeiten (Auswahl)',
                    handler: 'onStartCheckSelected',
                    bind:{
                        disabled: '{!canPrepare}'
                    }
                },
                {
                    text: 'Vorverarbeiten (Alle)',
                    handler: 'onStartCheck',
                    bind:{
                        disabled: '{!canPrepare}'
                    }
                }
            ],
            xtype: 'grid',
            reference: 'printerpanel',
            features: [{
                ftype: 'grouping',
                startCollapsed: true,
                groupHeaderTpl: '{name} ({rows.length} Item{[values.rows.length > 1 ? "s" : ""]})'
            }],
            bind:{
                store: '{files}',
                selection: '{file}'
            },
            forcefit: false,
            split: true,
            border: true,
            width: 400,
            
            
            columns: [

                {text: 'Schriften',  dataIndex:'fontcheck', renderer: function(v){
                    try{
                        if (v.success){
                            return "OK"
                        }else{
                            return v.message
                        }
                    }catch(e){

                    }
                    return 'Fehler'
                }},
                {text: 'Kunde',  dataIndex:'customer'},
                {text: 'Seiten',  dataIndex:'pages'},
                {text: 'Umschlag',  dataIndex:'envelope'},
                {text: 'Farbe',  dataIndex:'color'},
                {text: 'Gruppe',  dataIndex:'group'},
                {text: 'Datei',  dataIndex:'file'},
                {text: 'Job-ID',  dataIndex:'id'},
                {text: 'Verarbeitet', dataIndex: 'processed'}
            ]
        },

        {
            region: 'center',
            xtype: 'panel',
            bodyPadding: '5px',
            scrollable: 'y',
            layout: 'fit',
            width: '300px',
            items: [
                {
                    xtype: 'dataview',
                    region: 'center',

                    bind:{
                        store: '{preview}',
                    },
                    inline: true,
                    //itemTpl: '<div class="img" style="width:255px;height:255px;background-image: url({file});"></div>',

                    tpl: new Ext.XTemplate(
                        '<tpl for=".">',
                            '<div class="img" style="width:155px;height:155px; border: {[values.newletter === true ? "4" : "2"]}px {[values.part === 2 ? "dashed" : "solid"]}  {[values.color === true ? "#05A" : "#000"]};   background-image: url({preview});  box-shadow: 0px 8px 10px -6px #aaa; opacity: {[values.printpage === true ? (values.frontpage === true ? "1" :  "0.6" ) :  "0.1" ]}">',
                            '<div style="padding:15px;">',
                                'OMR: {omr}<br>',
                            '</div>',
                            '</div>',
                        '</tpl>'
                    ),
                    cls: 'dataview-inline',
                    itemSelector: 'div.img',
                    listeners:{
                        itemdblclick: 'onItemdblclick'
                    }
                }
            ]

        },

        {
            region: 'east',
            tbar:[
                {
                    text: 'Druck auslösen',
                    handler: 'printPDF'
                }
            ],
            xtype: 'grid',
            reference: 'pdfpagespanel',
            bind:{
                store: '{pdfpages}'
            },
            forcefit: false,
            split: true,
            border: true,
            width: 300,
            listeners: {
                itemdblclick: 'onPDFItemDplClick'
            },
            columns: [
                {text: 'Datei',  dataIndex:'name',flex: 1}
            ]
        }


    ]
});
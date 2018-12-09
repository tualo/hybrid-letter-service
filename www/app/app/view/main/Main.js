/**
 * This class is the main view for the application. It is specified in app.js as the
 * "mainView" property. That setting automatically applies the "viewport"
 * plugin causing this view to become the body element (i.e., the viewport).
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('HybridLetterServer.view.main.Main', {
    extend: 'Ext.tab.Panel',
    xtype: 'app-main',

    requires: [
        'Ext.plugin.Viewport',
        'Ext.window.MessageBox',
        'HybridLetterServer.view.Portal',
        'HybridLetterServer.model.Main',
        'HybridLetterServer.controller.Main'
    ],


    ui: 'navigation',
    viewModel: {
        type: 'hybrid_model_main'
    },
    controller: 'hybrid_controller_main',
    
    tabBarHeaderPosition: 1,
    titleRotation: 0,
    tabRotation: 0,

    header: {
        layout: {
            align: 'stretchmax'
        },
        title: {
            bind: {
                text: '{name}'
            },
            flex: 0
        },
        iconCls: 'fa-th-list'
    },

    tabBar: {
        flex: 1,
        layout: {
            align: 'stretch',
            overflowHandler: 'none'
        }
    },

    responsiveConfig: {
        tall: {
            headerPosition: 'top'
        },
        wide: {
            headerPosition: 'left'
        }
    },

    defaults: {
        bodyPadding: 20,
        tabConfig: {
            plugins: 'responsive',
            responsiveConfig: {
                wide: {
                    iconAlign: 'left',
                    textAlign: 'left'
                },
                tall: {
                    iconAlign: 'top',
                    textAlign: 'center',
                    width: 120
                }
            }
        }
    },
    items: [
        {
            title: 'Portal',
            glyph: 'xf0e0@FontAwesome',
            layout: 'fit',
            items: [
                {
                    xtype: 'hybrid_views_portal'
                }
            ]
        }/*,
        {
            title: 'Auftrag',
            glyph: 'xf15c@FontAwesome',
            html: 'Auftrag'
            
        },
        {
            title: 'Drucker',
            glyph: 'xf02f@FontAwesome',
            layout: 'fit',
            items: [
                {
                    xtype: 'tualo_hybrid_views_printers'
                }
            ]
        },
        {
            title: 'Einstellungen',
            glyph: 'xf085@FontAwesome',
            layout: 'fit',
            items: [
                {
                    xtype: 'tualo_hybrid_views_settings'
                }
            ]
        }*/
    ]
});

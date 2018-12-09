/*
 * This file launches the application by asking Ext JS to create
 * and launch() the Application class.
 */
Ext.application({
    extend: 'HybridLetterServer.Application',

    name: 'HybridLetterServer',

    requires: [
        // This will automatically load all classes in the HybridLetterServer namespace
        // so that application classes do not need to require each other.
        'HybridLetterServer.*'
    ],

    // The name of the initial view to create.
    mainView: 'HybridLetterServer.view.main.Main'
});

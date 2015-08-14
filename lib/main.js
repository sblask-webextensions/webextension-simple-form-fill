const contextMenu = require("sdk/context-menu");
const panel = require("sdk/panel");
const simplePreferences = require('sdk/simple-prefs');

const preferences = simplePreferences.prefs;

contextMenu.Item({
    label: "Add to Simple Form Fill",
    context: contextMenu.SelectionContext(),
    contentScriptFile: "./content_script_add.js",
    onMessage: function (newString) {
        preferences.items = preferences.items + "\n" + newString;
    }
});

var fillMenu = contextMenu.Menu({
    label: "Simple Form Fill",
    context: contextMenu.SelectorContext("input"),
    items: []
});

var editPanel = panel.Panel({
    contentURL: "./panel.html",
    height: 300,
    width: 300
});

function populateMenu() {
    let menuItem;
    for (menuItem of fillMenu.items) {
        fillMenu.removeItem(menuItem);
    }

    let preferenceItem;
    for (preferenceItem of preferences.items.split("\n")) {
        if (preferenceItem.length > 0) {
            fillMenu.addItem(contextMenu.Item({
                label: preferenceItem,
                data: preferenceItem,
                contentScriptFile: './content_script_select.js',
            }));
        }
    }
}

simplePreferences.on("items", function(){
    populateMenu();
});

simplePreferences.on("editButton", function() {
    editPanel.show();
});

editPanel.port.on("save", function (text) {
    editPanel.hide();
    preferences.items = text;
});

editPanel.on("show", function() {
    editPanel.port.emit("show", preferences.items);
});

populateMenu();

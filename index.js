const simplePreferences = require("sdk/simple-prefs");
const ui = require("./lib/ui");

const preferences = simplePreferences.prefs;

// Use a panel because there is no multiline string in simple-prefs
// show and fill on button click in preference
simplePreferences.on("editButton", function() {
    ui.panel.show();
});
ui.panel.on("show", function() {
    ui.panel.port.emit("show", preferences.items);
});
// save content and hide on save button click
ui.panel.port.on("save", function(text) {
    ui.panel.hide();
    preferences.items = text;
});

simplePreferences.on("items", function() {
    ui.populateSubMenu();
});

ui.populateSubMenu();

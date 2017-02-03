const simplePreferences = require("sdk/simple-prefs");
const webextension = require("sdk/webextension");

const ui = require("./lib/ui");

let addMenu;
let fillMenu;
let panel;

function __fillPanel() {
    if (panel) {
        panel.port.emit("show", simplePreferences.prefs.items);
    }
}

function __save(text) {
    if (panel) {
        panel.hide();
        simplePreferences.prefs.items = text;
    }
}

function __updateMenu() {
    ui.updateContextMenu(fillMenu);
}

exports.main = function(options) {
    console.log("Starting up with reason ", options.loadReason);

    addMenu = ui.makeAddMenu();
    fillMenu = ui.makeFillMenu();

    // Use a panel because there is no multiline string in simple-prefs
    // show and fill on button click in preference
    panel = ui.makePanel();
    panel.on("show", __fillPanel);

    // save content and hide on save button click
    panel.port.on("save", __save);

    simplePreferences.on("items", __updateMenu);

    __updateMenu();

    webextension.startup().then(({browser}) => {
        browser.runtime.onConnect.addListener(port => {
            if (port.name === "sync-simple-preferences") {
                port.postMessage({
                    items: simplePreferences.prefs.items,
                });
                simplePreferences.on("items", () => {
                    port.postMessage({
                        items: simplePreferences.prefs.items,
                    });
                });
            }
        });

        browser.runtime.onMessage.addListener((preferences, _sender, _sendReply) => {
            simplePreferences.prefs.items = preferences.items;
        });
    });
};

exports.onUnload = function(reason) {
    console.log("Closing down with reason ", reason);

    simplePreferences.removeListener("items", __updateMenu);

    if (panel) {
        panel.destroy();
        panel = null;
    }

    if (fillMenu) {
        fillMenu.destroy();
        fillMenu = null;
    }

    if (addMenu) {
        addMenu.destroy();
        addMenu = null;
    }
};

browser.runtime.onMessage.addListener(insertItemListener);
function insertItemListener(message) {
    if (!message.item) {
        return;
    }

    insertItem(document.activeElement, message.item);
    browser.runtime.onMessage.removeListener(insertItemListener);
}

function insertItem(node, item) {
    if (node.selectionStart == undefined || node.selectionEnd == undefined) {
        return;
    }

    const beforeCursorOrSelection = node.value.slice(0, node.selectionStart);
    const afterCursorOrSelection = node.value.slice(node.selectionEnd, node.value.length);
    node.value = beforeCursorOrSelection + item + afterCursorOrSelection;
    const detail = {
        simpleFormFillCustomInputEvent: true,
    };
    node.dispatchEvent(new CustomEvent("input", { detail }));
}

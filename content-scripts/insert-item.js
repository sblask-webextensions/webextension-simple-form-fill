browser.runtime.onMessage.addListener(insertItemListener);
function insertItemListener(message) {
    if (!message.item) {
        return;
    }

    insertItem(document.activeElement, message.item);
    browser.runtime.onMessage.removeListener(insertItemListener);
}

function insertItem(node, item) {
    // some pages seem to override/reset selectionStart/selectionEnd
    const selectionStart = node.selectionStart || 0;
    const selectionEnd = node.selectionEnd || node.value.length;

    const beforeCursorOrSelection = node.value.slice(0, selectionStart);
    const afterCursorOrSelection = node.value.slice(selectionEnd, node.value.length);
    node.value = beforeCursorOrSelection + item + afterCursorOrSelection;
    const detail = {
        simpleFormFillCustomInputEvent: true,
    };
    node.dispatchEvent(new CustomEvent("input", { detail }));
}

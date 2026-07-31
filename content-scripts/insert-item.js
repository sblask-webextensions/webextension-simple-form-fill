browser.runtime.onMessage.addListener((message, sender) => {
    if (
        sender.id !== browser.runtime.id
        || message?.type !== "insert-item"
        || typeof message.item !== "string"
    ) {
        return;
    }

    const node = document.activeElement;
    if (
        !(node instanceof HTMLInputElement)
        && !(node instanceof HTMLTextAreaElement)
    ) {
        return;
    }

    insertItem(node, message.item);
});

function insertItem(node, item) {
    // some pages seem to override/reset selectionStart/selectionEnd
    const selectionStart = node.selectionStart ?? 0;
    const selectionEnd = node.selectionEnd ?? node.value.length;

    const beforeCursorOrSelection = node.value.slice(0, selectionStart);
    const afterCursorOrSelection = node.value.slice(selectionEnd, node.value.length);
    node.value = beforeCursorOrSelection + item + afterCursorOrSelection;
    const detail = {
        simpleFormFillCustomInputEvent: true,
    };
    node.dispatchEvent(new CustomEvent("input", {detail}));
}

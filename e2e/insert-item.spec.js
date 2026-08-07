import {
    test,
    expect,
    sendMessageToTab,
} from "./extension-fixtures.js";

test("inserts at the input cursor and dispatches a marked input event", async ({
    page,
    serviceWorker,
}) => {
    await page.goto("/static.html");
    const input = page.locator("#text");
    await input.fill("abcd");
    await input.evaluate((element) => element.setSelectionRange(2, 2));
    await input.focus();

    await sendMessageToTab(serviceWorker, page, {
        type: "insert-item",
        item: "XX",
    });

    await expect(input).toHaveValue("abXXcd");
    await expect(page.locator("#last-input-detail")).toHaveText("true");
});

test("replaces selected input text", async ({page, serviceWorker}) => {
    await page.goto("/static.html");
    const input = page.locator("#text");
    await input.fill("abcdef");
    await input.evaluate((element) => element.setSelectionRange(2, 5));
    await input.focus();

    await sendMessageToTab(serviceWorker, page, {
        type: "insert-item",
        item: "X",
    });

    await expect(input).toHaveValue("abXf");
});

test("inserts into a textarea", async ({page, serviceWorker}) => {
    await page.goto("/static.html");
    const textarea = page.locator("#textarea");
    await textarea.fill("before after");
    await textarea.evaluate((element) => element.setSelectionRange(7, 7));
    await textarea.focus();

    await sendMessageToTab(serviceWorker, page, {
        type: "insert-item",
        item: "middle ",
    });

    await expect(textarea).toHaveValue("before middle after");
});

test("inserts into the focused frame only", async ({page, serviceWorker}) => {
    await page.goto("/frames.html");
    const sameOriginInput = page.frameLocator("#same-origin").locator("#text");
    const crossOriginInput = page.frameLocator("#cross-origin").locator("#text");
    await sameOriginInput.fill("same");
    await crossOriginInput.fill("cross");
    await crossOriginInput.focus();

    await sendMessageToTab(serviceWorker, page, {
        type: "insert-item",
        item: "-inserted",
    });

    await expect(sameOriginInput).toHaveValue("same");
    await expect(crossOriginInput).toHaveValue("cross-inserted");
});

test("ignores malformed insert messages", async ({page, serviceWorker}) => {
    await page.goto("/static.html");
    const input = page.locator("#text");
    await input.fill("unchanged");
    await input.focus();

    await sendMessageToTab(serviceWorker, page, {
        type: "another-message",
        item: "-wrong-type",
    });
    await sendMessageToTab(serviceWorker, page, {
        type: "insert-item",
        item: 123,
    });

    await expect(input).toHaveValue("unchanged");
});

test("ignores insertion when no editable element is focused", async ({page, serviceWorker}) => {
    await page.goto("/static.html");
    const input = page.locator("#text");
    await input.fill("unchanged");
    await input.evaluate((element) => element.blur());

    await sendMessageToTab(serviceWorker, page, {
        type: "insert-item",
        item: "-not-inserted",
    });

    await expect(input).toHaveValue("unchanged");
});

import {test, expect, DEFAULT_OPTIONS, setExtensionOptions, updateExtensionOptions} from "./extension-fixtures.js";

test("loads defaults and persists option changes", async ({extensionId, page, serviceWorker}) => {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    await expect(page.locator("#autocomplete-enabled")).not.toBeChecked();
    await expect(page.locator("#contextmenu-enabled")).toBeChecked();
    await expect(page.locator("#minimum-character-count")).toHaveValue("1");

    await page.locator("#autocomplete-enabled").check();
    await page.locator("#contextmenu-enabled").uncheck();
    await page.locator("#match-only-at-beginning").check();
    await page.locator("#sync-items-enabled").check();
    await page.locator("#use-tab-to-choose-items").check();
    await page.locator("#comment-string").fill(" # ");
    await page.locator("#items").fill("One # comment\nTwo");
    await page.locator("#minimum-character-count").fill("2");

    await expect.poll(async () => serviceWorker.evaluate(async () => (
        browser.storage.local.get()
    ))).toMatchObject({
        ...DEFAULT_OPTIONS,
        autocompleteEnabled: true,
        commentString: " # ",
        contextmenuEnabled: false,
        items: "One # comment\nTwo",
        matchOnlyAtBeginning: true,
        minimumCharacterCount: 2,
        syncItems: true,
        useTabToChooseItems: true,
    });

    await page.reload();
    await expect(page.locator("#autocomplete-enabled")).toBeChecked();
    await expect(page.locator("#contextmenu-enabled")).not.toBeChecked();
    await expect(page.locator("#items")).toHaveValue("One # comment\nTwo");
    await expect(page.locator("#minimum-character-count")).toHaveValue("2");
    await expect(page.locator("#sync-items-enabled")).toBeChecked();
});

test("external changes do not overriding in-progress edits on other fields", async ({extensionId, page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {items: DEFAULT_OPTIONS.items});
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    await expect(page.locator("#items")).toHaveValue(DEFAULT_OPTIONS.items);

    await page.locator("#comment-string").fill(" // in-progress edit");

    await updateExtensionOptions(serviceWorker, {
        items: "external edit",
    });

    await expect(page.locator("#items")).toHaveValue("external edit");
    await expect(page.locator("#comment-string")).toHaveValue(" // in-progress edit");
});

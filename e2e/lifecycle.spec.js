import {
    test,
    expect,
    setExtensionOptions,
    terminateServiceWorker,
} from "./extension-fixtures.js";

test("restores autocomplete after MV3 service worker termination", async ({
    context,
    extensionId,
    page,
    serviceWorker,
}) => {
    await setExtensionOptions(serviceWorker, {
        autocompleteEnabled: true,
        items: "Persisted item",
    });
    await page.goto("/static.html?before-termination");
    const input = page.locator("#text");
    await input.fill("Persisted");
    await expect(page.locator("ul.ui-autocomplete.simple-form-fill:visible")).toContainText("Persisted item");

    await terminateServiceWorker(context, page, extensionId);
    await page.goto("/static.html?after-termination");
    await expect(input).toHaveAttribute("autocomplete", "off");
    await input.fill("Persisted");
    await expect(page.locator("ul.ui-autocomplete.simple-form-fill:visible")).toContainText("Persisted item");
});

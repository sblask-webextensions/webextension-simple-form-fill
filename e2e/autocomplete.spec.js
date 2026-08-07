import {
    test,
    expect,
    setExtensionOptions,
    updateExtensionOptions,
} from "./extension-fixtures.js";

const AUTOCOMPLETE_INPUT_SELECTOR = "input[autocomplete=off]";
const AUTOCOMPLETE_MENU_SELECTOR = "ul.ui-autocomplete.simple-form-fill:visible";

test("matches items and fills the selected value", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await page.goto("/static.html");

    const input = page.locator("#text");
    await expect(input).toHaveAttribute("autocomplete", "off");
    await input.fill("alp");
    const menu = page.locator(AUTOCOMPLETE_MENU_SELECTOR);
    await expect(menu).toContainText("Alpha");
    await expect(menu).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(menu).toHaveCSS("border-top", "1px solid rgb(197, 197, 197)");
    await expect(menu).toHaveCSS("padding-left", "0px");
    await input.press("ArrowDown");
    await input.press("Enter");

    await expect(input).toHaveValue("Alpha");
    await expect(page.locator("#last-input-detail")).toHaveText("true");
});

test("respects minimum length and beginning-only matching", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {
        autocompleteEnabled: true,
        matchOnlyAtBeginning: true,
        minimumCharacterCount: 2,
    });
    await page.goto("/static.html");

    const input = page.locator("#text");
    await input.fill("A");
    await expect(page.locator(AUTOCOMPLETE_MENU_SELECTOR)).toHaveCount(0);
    await input.fill("Al");
    await expect(page.locator(AUTOCOMPLETE_MENU_SELECTOR)).toContainText("Alpha");
    await input.fill("pha");
    await expect(page.locator(AUTOCOMPLETE_MENU_SELECTOR)).toHaveCount(0);
});

test("matches comments but inserts only the uncommented value", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {
        autocompleteEnabled: true,
        commentString: " # ",
        items: "Alpha # first item\nBeta # second item",
    });
    await page.goto("/static.html");

    const input = page.locator("#text");
    await input.fill("first");
    const menu = page.locator(AUTOCOMPLETE_MENU_SELECTOR);
    await expect(menu).toContainText("Alpha # first item");
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(input).toHaveValue("Alpha");
});

for (const {description, selector, searchTerm} of [
    {
        description: "dark solid input",
        searchTerm: "alp",
        selector: "#dark-input",
    },
    {
        description: "light dashed input",
        searchTerm: "bet",
        selector: "#light-input",
    },
]) {
    test(`copies styles from a ${description}`, async ({page, serviceWorker}) => {
        await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
        await page.goto("/styled.html");

        const input = page.locator(selector);
        await input.fill(searchTerm);
        const menu = page.locator(AUTOCOMPLETE_MENU_SELECTOR);
        await expect(menu).toBeVisible();

        const copiedProperties = [
            "background-color",
            "border-bottom-left-radius",
            "border-bottom-color",
            "border-bottom-style",
            "border-bottom-width",
            "border-left-color",
            "border-left-style",
            "border-left-width",
            "border-right-color",
            "border-right-style",
            "border-right-width",
            "border-top-color",
            "border-top-style",
            "border-top-width",
            "color",
        ];
        const inputStyles = await input.evaluate((element, properties) => {
            const computedStyle = getComputedStyle(element);
            return Object.fromEntries(
                properties.map((property) => [property, computedStyle.getPropertyValue(property)])
            );
        }, copiedProperties);

        for (const [property, value] of Object.entries(inputStyles)) {
            await expect(menu).toHaveCSS(property, value);
        }

        const inputBox = await input.boundingBox();
        const menuBox = await menu.boundingBox();
        expect(menuBox.width).toBeCloseTo(inputBox.width, 1);
    });
}

test("uses Tab to move through an open menu when configured", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {
        autocompleteEnabled: true,
        useTabToChooseItems: true,
    });
    await page.goto("/static.html");

    const input = page.locator("#text");
    await input.fill("a");
    await expect(page.locator(AUTOCOMPLETE_MENU_SELECTOR)).toBeVisible();
    await input.press("Tab");
    await expect(input).toBeFocused();
    await input.press("Enter");
    await expect(input).toHaveValue("Alpha");
});

test("does not accumulate handlers when options are refreshed", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await page.goto("/static.html");
    await expect(page.locator(AUTOCOMPLETE_INPUT_SELECTOR)).toHaveCount(2);

    await updateExtensionOptions(serviceWorker, {useTabToChooseItems: true});
    await updateExtensionOptions(serviceWorker, {useTabToChooseItems: false});
    await updateExtensionOptions(serviceWorker, {useTabToChooseItems: true});

    const input = page.locator("#text");
    await input.pressSequentially("alp");
    const eventCountBeforeSelection = Number(await page.locator("#input-event-count").textContent());
    await expect(page.locator(AUTOCOMPLETE_MENU_SELECTOR)).toBeVisible();
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(page.locator("#input-event-count")).toHaveText(String(eventCountBeforeSelection + 1));
    await expect(page.locator("#last-input-detail")).toHaveText("true");
});

test("initializes inputs added directly and inside containers", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await page.goto("/dynamic.html");

    await page.locator("#add-direct").click();
    await expect(page.locator("#direct-input")).toHaveAttribute("autocomplete", "off");

    await page.locator("#add-container").click();
    await expect(page.locator("#nested-input-one")).toHaveAttribute("autocomplete", "off");
    await expect(page.locator("#nested-input-two")).toHaveAttribute("autocomplete", "off");
});

test("initializes a one-for-one replacement input", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await page.goto("/dynamic.html");

    await page.locator("#add-direct").click();
    const input = page.locator("#direct-input");
    await expect(input).toHaveAttribute("autocomplete", "off");
    await page.locator("#replace-input").click();
    await expect(input).toHaveAttribute("autocomplete", "off");
});

test("ignores unrelated and transient DOM additions", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await page.goto("/dynamic.html");

    await page.locator("#add-noise").click();
    await page.locator("#add-transient").click();
    await expect(page.locator(".ui-helper-hidden-accessible.simple-form-fill")).toHaveCount(0);

    await page.locator("#add-direct").click();
    await expect(page.locator("#direct-input")).toHaveAttribute("autocomplete", "off");
});

test("excludes non-text input types", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await page.goto("/input-types.html");

    for (const selector of ["#text", "#email", "#search"]) {
        await expect(page.locator(selector)).toHaveAttribute("autocomplete", "off");
    }
    for (const selector of [
        "#password",
        "#checkbox",
        "#color",
        "#hidden",
        "#image",
        "#radio",
        "#range",
        "#submit",
    ]) {
        await expect(page.locator(selector)).not.toHaveAttribute("autocomplete", "off");
    }
});

test("initializes same-origin and cross-origin frames", async ({page, serviceWorker}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await page.goto("/frames.html");

    for (const frameSelector of ["#same-origin", "#cross-origin"]) {
        const frame = page.frameLocator(frameSelector);
        const input = frame.locator("#text");
        await expect(input).toHaveAttribute("autocomplete", "off");
        await input.fill("bet");
        await expect(frame.locator(AUTOCOMPLETE_MENU_SELECTOR)).toContainText("Beta");
    }
});

test("enables only the active tab and initializes another tab on activation", async ({
    context,
    page,
    serviceWorker,
}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: false});
    await page.goto("/static.html?tab=one");
    const secondPage = await context.newPage();
    await secondPage.goto("/static.html?tab=two");
    await page.bringToFront();

    await updateExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await expect(page.locator("#text")).toHaveAttribute("autocomplete", "off");
    await expect(secondPage.locator("#text")).not.toHaveAttribute("autocomplete", "off");

    await secondPage.bringToFront();
    await expect(secondPage.locator("#text")).toHaveAttribute("autocomplete", "off");
});

test("disabling removes widgets from every initialized tab", async ({
    context,
    page,
    serviceWorker,
}) => {
    await setExtensionOptions(serviceWorker, {autocompleteEnabled: true});
    await page.goto("/static.html?tab=one");
    await expect(page.locator("#text")).toHaveAttribute("autocomplete", "off");

    const secondPage = await context.newPage();
    await secondPage.goto("/static.html?tab=two");
    await expect(secondPage.locator("#text")).toHaveAttribute("autocomplete", "off");

    await updateExtensionOptions(serviceWorker, {autocompleteEnabled: false});
    await expect(page.locator("#text")).not.toHaveAttribute("autocomplete", "off");
    await expect(secondPage.locator("#text")).not.toHaveAttribute("autocomplete", "off");
    await expect(page.locator(".ui-helper-hidden-accessible.simple-form-fill")).toHaveCount(0);
    await expect(secondPage.locator(".ui-helper-hidden-accessible.simple-form-fill")).toHaveCount(0);
});

test("refreshes options when an initialized tab becomes active again", async ({
    context,
    page,
    serviceWorker,
}) => {
    await setExtensionOptions(serviceWorker, {
        autocompleteEnabled: true,
        items: "Old item",
    });
    await page.goto("/static.html?tab=one");
    await expect(page.locator("#text")).toHaveAttribute("autocomplete", "off");

    const secondPage = await context.newPage();
    await secondPage.goto("/static.html?tab=two");
    await updateExtensionOptions(serviceWorker, {items: "New item"});

    await page.bringToFront();
    const input = page.locator("#text");
    await input.fill("New");
    await expect(page.locator(AUTOCOMPLETE_MENU_SELECTOR)).toContainText("New item");
});

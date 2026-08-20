[![pre-commit Status](https://github.com/sblask/webextension-simple-form-fill/actions/workflows/pre-commit.yml/badge.svg)](https://github.com/sblask/webextension-simple-form-fill/actions/workflows/pre-commit.yml)
[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/filmkodmbabpfkfhoekpgfpankdlajmf?color=db4437)](https://chromewebstore.google.com/detail/simple-form-fill/filmkodmbabpfkfhoekpgfpankdlajmf)
[![Mozilla Add-on Version](https://img.shields.io/amo/v/simple-form-fill?color=ff7139)](https://addons.mozilla.org/firefox/addon/simple-form-fill/)

Simple Form Fill
================
Enter text into input fields by choosing configured items from the context menu
or using the optional autocomplete (not autofill) which suggest items based on
typed input.

New items can be added through the context menu while having some text selected
or in the extension's preferences (click on toolbar icon).

Please have a look at the screenshots to see how it works.

Privacy Policy
--------------

This extension does not collect or send data of any kind to third parties.

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/webextension-simple-form-fill)

Patches are welcome.

Testing
-------

Install the Chromium browser used by Playwright once:

```sh
npx playwright install chromium
```

Run the unit and extension end-to-end tests with:

```sh
npm test
npm run test:e2e
```

Use `npm run test:e2e:headed` to watch the end-to-end tests in Chromium.

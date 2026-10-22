# PageCapture plugins for Selenium and Playwright

The AQAPageCapture plugins capture the pages a [Selenium](https://www.selenium.dev) or
[Playwright](https://playwright.dev) test visits in Chrome, and upload them to AQA as a flow. They work with the
**PageCapture for automated tools** extension, which records the pages and takes the snapshots.

Version 2.0. The plugins and the extension are delivered together, and each works only with the other from the
same bundle: a 1.x plugin with the 2.0 extension, or a 2.0 plugin with a 1.x extension, fails at `init()`.

## Browsers

**Chrome or Chromium 142 or later**, as a [Chrome for Testing](https://developer.chrome.com/blog/chrome-for-testing/)
or Chromium build. Branded Google Chrome ignores `--load-extension` (since Chrome 137), so the extension does not
load in it; with Selenium there is another way to install it, below.

| Mode | Supported | How |
|---|---|---|
| Headed (locally, or on CI under Xvfb) | yes | The screen must be larger than the device plus the browser's bars: on CI, for example, `xvfb-run -s "-screen 0 1920x1200x24"` (Xvfb's default 1280×1024 is too small for the `1280x1024` device). |
| New headless | yes | Selenium: `--headless=new`. Playwright: `channel: 'chromium'`, or `executablePath` to a full Chrome for Testing or Chromium. |
| chrome-headless-shell | **no** | It cannot load extensions. It is what Playwright's default `headless: true` runs: `init()` fails with a message saying so. |

Recommended: launch Chrome with `--silent-debugger-extension-api`. Without it Chrome shows a "started debugging
this browser" bar, which takes height from the page; the plugin makes up for it, but the bar is not needed.

### Selenium with branded Google Chrome

Install the extension through WebDriver BiDi before `init()`:

```JavaScript
const options = new Chrome.Options();
options.enableBidi();
options.addArguments('--enable-unsafe-extension-debugging');
const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
const bidi = await driver.getBidi();
await bidi.send({
  method: 'webExtension.install',
  params: { extensionData: { type: 'path', path: '[absolute-path]/AQAPageCapture/extension' } },
});
const aqaPageCapture = await AQAPageCapturePlugin.init(driver, { /* … */ });
```

Playwright has no equivalent: use its bundled Chromium (the default) or `channel: 'chromium'`.

## Usage

The test runs Chrome with the extension loaded; the unpacked extension is in `AQAPageCapture/extension`. See
[Selenium](https://www.selenium.dev/documentation/webdriver/browsers/chrome/) and
[Playwright](https://playwright.dev/docs/chrome-extensions) for loading an extension.

Then, in the test:

1. `init()` the plugin, right after the browser opens;
2. `createFlow()`, before navigating to the first page to capture;
3. `doSnapshot()` on each page to capture;
4. `uploadZip()`.

### Init the plugin

Import the plugin of your test framework, `plugin.playwright` or `plugin.selenium`, and initialize it with the AQA
api key and the suite the flow is uploaded to.

```TypeScript
import AQAPageCapturePlugin from 'AQAPageCapture/plugin.[playwright|selenium]';

const aqaPageCapture = await AQAPageCapturePlugin.init(driver, {
  suite: 'aqa-suite-id',
  team: 'aqa-team-id',
  xTeam: 'your-api-key',
  testId: 'test-id', // optional: set it to update an existing test.
  ignoreErrors: false, // optional, false by default: when true, the plugin logs its errors instead of throwing them.
  disarm: false, // optional, false by default: when true, the plugin does nothing.
});
```

`driver` is the Selenium [WebDriver](https://www.selenium.dev/documentation/webdriver/), or the Playwright
[Page](https://playwright.dev/docs/api/class-page) the test starts on.

Call `init()` right after the browser opens, before the first navigation: everything the pages load is then
recorded as it happens. It also works after a navigation (what the page loaded before is recovered), and it must
come before `createFlow()`.

`init()` fails with a message that names the cause when the extension is not there, when the browser is
chrome-headless-shell, or when the extension is not the 2.0 delivered with the plugins. When the page reaches an
extension but nothing answers, the message also names the other cause it cannot tell apart: the extension is
installed and its service worker does not answer, which a browser profile reused across deliveries can do. Start the
browser with a fresh profile (the setups above do), or reload the extension in `chrome://extensions`.

### Create a new flow

```TypeScript
await aqaPageCapture.createFlow({
  name: 'Test flow',
  description: 'Test flow description', // optional
  device: '1366x768', // optional
});
```

The plugin adds a timestamp to the name, so that running the test again does not overwrite the flow.
`description` appears on the AQA flow.

#### Device

`device` is the size of the viewport the flow is captured at: `1280x1024`, `1366x768` or `1536x864` (`1366x668`,
1.x's name for `1366x768`, still works). Without it, the flow keeps the size the page has when `createFlow()` is
called.

AQA renders every captured page again at the flow's device, with one size and one pixel ratio for the whole flow.
So:

- The plugin brings the page to capture to the device, at `createFlow()` and before every `doSnapshot()`. With
  Selenium it resizes the window the driver is on; with Playwright it sets the viewport of every page of the
  context.
- Call `createFlow()` before navigating to the first page you capture (the browser's initial blank page is fine),
  so that pages load at the device. A page that has been wider than the device, or at another pixel ratio, since it
  loaded keeps the images it picked for that size (`srcset`, `image-set()`), which AQA would not find:
  `doSnapshot()` fails on it until the page is loaded again. A page that only grew to the device is fine.
- Keep pages at 100% zoom: a zoomed page fails the step.
- `doSnapshot()` fails when the page cannot be brought to the device: in a headed browser, a screen smaller than
  the device plus the browser's bars (see [Browsers](#browsers)). It fails too if the window moved to a monitor
  with another pixel ratio.
- Playwright: keep the context's viewport emulation (Playwright's default, with any `deviceScaleFactor`). Do not
  launch with `viewport: null`: on a high-density screen the pages would load at the screen's pixel ratio, and the
  plugin would move them to the context's after they loaded.

### Capture a page

Take a snapshot of a page, with the step name given.

```TypeScript
await aqaPageCapture.doSnapshot('Name of the page');
```

A step stores the page as it is at that moment, with what it has loaded. Content a page builds after `load` is
there only once it is built, so wait for it before `doSnapshot()`; images that load lazily (`loading="lazy"`) are
there only once the test has brought them near the visible area.

Which page is captured:

- **Selenium:** the window the test switched to. A popup is captured only after `driver.switchTo().window(…)` to
  it (1.x captured the focused one).
- **Playwright:** the page brought to the front last: a popup as soon as it opens, a page `newPage()` opened, the
  first page again after `page.bringToFront()` or once the popup is closed. A page that was already open before
  `init()`, other than the one given to it, is never captured.

`doSnapshot()` also fails, with a message saying why, on a page that is not a web page (`about:blank`, `data:`,
`chrome://`): navigate to the page to capture first.

### Upload the flow to AQA

Upload the captured pages as a zip to the AQA suite given to `init()`.

```TypeScript
await aqaPageCapture.uploadZip();
```

`downloadFlowSnapshot()` is not supported: it throws an error saying so. `uploadZip()` is how the flow is
delivered.

## Examples

### Selenium

```JavaScript
const Chrome = require('selenium-webdriver/chrome');
const { Builder } = require('selenium-webdriver');

const AQAPageCapturePlugin = require('AQAPageCapture/plugin.selenium');

describe('a test', function () {
  this.timeout(60000);
  let driver;

  beforeEach(async () => {
    const options = new Chrome.Options();
    // A Chrome for Testing or Chromium binary: branded Chrome ignores --load-extension.
    options.setChromeBinaryPath('[absolute-path-to-chrome-for-testing-binary]');
    options.addArguments('--disable-search-engine-choice-screen');
    options.addArguments('--silent-debugger-extension-api');
    options.addArguments('--load-extension=[absolute-path]/AQAPageCapture/extension');
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  });

  it('captures the UsableNet home page', async () => {
    const aqaPageCapture = await AQAPageCapturePlugin.init(driver, {
      suite: 'TS123',
      team: 'myTeam',
      xTeam: 'myKey',
    });
    await aqaPageCapture.createFlow({
      name: 'UsableNet website',
      description: 'Test the UsableNet website',
      device: '1366x768',
    });

    await driver.get('https://www.usablenet.com/');
    await aqaPageCapture.doSnapshot('Homepage');
    await aqaPageCapture.uploadZip();
  });
});
```

### Playwright

```TypeScript
import AQAPageCapturePlugin from 'AQAPageCapture/plugin.playwright';
import { test as base, chromium, type BrowserContext } from '@playwright/test';

const pathToExtension = '[absolute-path]/AQAPageCapture/extension';

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    // Playwright's own viewport emulation is kept: no `viewport: null`. New headless; `headless: false` for a headed run.
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--silent-debugger-extension-api',
      ],
    });
    await use(context);
    await context.close();
  },
});

test('captures the UsableNet home page', async ({ page }) => {
  const aqaPageCapture = await AQAPageCapturePlugin.init(page, {
    suite: 'TS123',
    team: 'myTeam',
    xTeam: 'myKey',
  });
  await aqaPageCapture.createFlow({
    name: 'UsableNet website Playwright',
    description: 'Test the UsableNet website',
    device: '1366x768',
  });

  await page.goto('https://www.usablenet.com/');
  await aqaPageCapture.doSnapshot('Homepage');
  await aqaPageCapture.uploadZip();
});
```

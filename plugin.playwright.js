(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["AQAPageCapturePlugin"] = factory();
	else
		root["AQAPageCapturePlugin"] = factory();
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 144
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChromeExternalMessagingAction = exports.PLUGINS_PROTOCOL = void 0;
/**
 * The plugins' RPC with PageCapture for automated tools, protocol v2. The plugins
 * and the extension are delivered together, so there is no
 * v1 support: the version only guards against a manual mix, in both directions.
 */
exports.PLUGINS_PROTOCOL = 2;
var ChromeExternalMessagingAction;
(function (ChromeExternalMessagingAction) {
    ChromeExternalMessagingAction["CREATE_FLOW"] = "bg-ext-create-flow";
    ChromeExternalMessagingAction["DO_SNAPSHOT"] = "bg-ext-do-snapshot";
    ChromeExternalMessagingAction["DOWNLOAD"] = "bg-ext-download-flow";
    ChromeExternalMessagingAction["HEALTH_CHECK"] = "bg-ext-health-check";
    ChromeExternalMessagingAction["START"] = "bg-ext-start";
    ChromeExternalMessagingAction["UPLOAD"] = "bg-ext-upload";
})(ChromeExternalMessagingAction || (exports.ChromeExternalMessagingAction = ChromeExternalMessagingAction = {}));


/***/ },

/***/ 652
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PLUGIN_DEVICES = exports.Devices = exports.DeviceId = void 0;
exports.getDevice = getDevice;
var DeviceId;
(function (DeviceId) {
    DeviceId["DESKTOP_1"] = "device_0";
    DeviceId["DESKTOP_2"] = "device_1";
    DeviceId["DESKTOP_3"] = "device_2";
    DeviceId["MOBILE_1"] = "device_3";
    DeviceId["CUSTOM"] = "custom";
})(DeviceId || (exports.DeviceId = DeviceId = {}));
/** The presets, as both extensions and the plugins size them. */
exports.Devices = [
    {
        id: DeviceId.DESKTOP_1,
        name: 'Device 0',
        viewport: {
            width: 1280,
            height: 1024,
            touch: false,
        },
    },
    {
        id: DeviceId.DESKTOP_2,
        name: 'Device 1',
        viewport: {
            width: 1366,
            height: 768,
            touch: false,
        },
    },
    {
        id: DeviceId.DESKTOP_3,
        name: 'Device 2',
        viewport: {
            width: 1536,
            height: 864,
            touch: false,
        },
    },
    {
        id: DeviceId.MOBILE_1,
        name: 'Device 3',
        viewport: {
            width: 390,
            height: 844,
            touch: true,
        },
    },
];
function getDevice(id) {
    var _a;
    return (_a = exports.Devices.find((_device) => _device.id === id)) !== null && _a !== void 0 ? _a : null;
}
exports.PLUGIN_DEVICES = {
    '1280x1024': DeviceId.DESKTOP_1,
    '1366x768': DeviceId.DESKTOP_2,
    '1536x864': DeviceId.DESKTOP_3,
    /**
     * 1.x's name for `1366x768`, kept so its suites keep working; not documented.
     * Most likely a typo: it was added (a412f89) when the device was already
     * 1366×768 (a976575), and the other two labels are their devices' sizes.
     */
    '1366x668': DeviceId.DESKTOP_2,
};


/***/ },

/***/ 547
(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const ChromeExternalMessaging_1 = __webpack_require__(144);
const Devices_1 = __webpack_require__(652);
/**
 * How long the health check waits for the extension. It answers in
 * milliseconds; with no service worker, Chromium 142 never answers at all.
 */
const HEALTH_CHECK_TIMEOUT_MS = 5000;
const EXTENSION_NOT_FOUND = 'Chrome extension not available. Ensure it has been correctly loaded in the browser. ' +
    'Note that branded Google Chrome ignores --load-extension: use Chrome for Testing, or Chromium 142 or later.';
/**
 * The plugins' side of protocol v2, one implementation for both
 * drivers: each plugin only says how its driver sends a message from the page,
 * reads the browser's brands and the page's viewport, and brings the page to
 * capture to the flow's device. The extension does the recording
 * and the capture, and checks the device; the public API is 1.x's.
 */
class AQAPageCapturePluginCore {
    constructor(options) {
        this.extensionID = 'llaaiankjgnonjipogopofnpahaoccfo';
        this.version = '2.0';
        this.devices = Devices_1.PLUGIN_DEVICES;
        this.errors = {
            CREATE_FLOW: 'Unable to create flow',
            CREATE_FLOW_WITH_NAME: 'Unable to create flow with name ',
            CREATE_FLOW_MISSING_NAME: 'Missing name param on createFlow',
            EXTENSION_NOT_FOUND,
            // The page has a channel to an extension, and nothing answers: the extension is not loaded (another one opened
            // the channel), or it is installed and its service worker does not answer. Nothing in the page tells which.
            EXTENSION_NOT_ANSWERING: `${EXTENSION_NOT_FOUND} If it is loaded, its service worker does not answer: a browser profile reused after ` +
                'the extension was replaced by another build of the same version does this. Start the browser with a fresh ' +
                'profile, or reload the extension in chrome://extensions.',
            SNAPSHOT: 'Unable to generate page snapshot',
            UNABLE_TO_CONNECT: 'Unable to connect to the AQAPageCapture extension',
            UPLOAD_ZIP: 'Unable to upload zip',
        };
        this.ignoreErrors = false;
        this.disarm = false;
        this.uploadFlowData = {
            name: '',
            suite: '',
            team: '',
            xTeam: '',
            description: undefined,
            testId: undefined,
        };
        /**
         * The flow's viewport, which the plugin brings every page it captures to:
         * the preset's, or the size a CUSTOM flow was created at.
         */
        this.flowViewport = null;
        if (options.ignoreErrors) {
            this.ignoreErrors = true;
        }
        if (options.disarm) {
            this.disarm = true;
        }
        if (!options.suite) {
            this.throwError('Missing AQA "suite" setting.');
        }
        this.uploadFlowData.suite = options.suite;
        if (!options.team) {
            this.throwError('Missing AQA "team" setting.');
        }
        this.uploadFlowData.team = options.team;
        if (!options.xTeam) {
            this.throwError('Missing AQA api key.');
        }
        this.uploadFlowData.xTeam = options.xTeam;
        this.uploadFlowData.testId = options.testId;
    }
    static nameTimeStamp() {
        const time = new Date();
        const a = `${time.getMonth() + 1}-${time.getDate()}_${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
        return a;
    }
    static log(msg) {
        // eslint-disable-next-line no-console
        console.info('AQAPageCapture:', msg);
    }
    throwError(message) {
        if (this.disarm)
            return;
        if (!this.ignoreErrors) {
            throw new Error(`AQAPageCapture: ${message}`);
        }
        else {
            // eslint-disable-next-line no-console -- ignoreErrors: the plugin reports the error instead of throwing
            console.error(`AQAPageCapture: ${message}`);
        }
    }
    createFlow(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disarm)
                return;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- a JavaScript caller can omit the options
            if (!(options === null || options === void 0 ? void 0 : options.name)) {
                this.throwError(this.errors.CREATE_FLOW_MISSING_NAME);
            }
            this.uploadFlowData.name = `${options.name} (${AQAPageCapturePluginCore.nameTimeStamp()})`;
            this.uploadFlowData.description = options.description;
            // An unknown label is a CUSTOM flow, as in 1.x.
            const preset = options.device ? this.devices[options.device] : undefined;
            const device = preset !== null && preset !== void 0 ? preset : Devices_1.DeviceId.CUSTOM;
            const presetDevice = device === Devices_1.DeviceId.CUSTOM ? null : (0, Devices_1.getDevice)(device);
            // A CUSTOM flow keeps the size the page has now, applied like a preset's. The extension
            // records this read, so both sides go by the same one; if it fails, the extension reads its own.
            const pageViewport = presetDevice ? undefined : yield this.readPageViewport().catch(() => undefined);
            if (presetDevice) {
                this.flowViewport = { width: presetDevice.viewport.width, height: presetDevice.viewport.height };
            }
            else {
                this.flowViewport = pageViewport ? { width: pageViewport.innerWidth, height: pageViewport.innerHeight } : null;
            }
            if (this.flowViewport)
                yield this.ensureViewport(this.flowViewport);
            const response = yield this.send({
                action: ChromeExternalMessaging_1.ChromeExternalMessagingAction.CREATE_FLOW,
                payload: { name: this.uploadFlowData.name, device, pageViewport },
            });
            if (!(response === null || response === void 0 ? void 0 : response.success)) {
                this.throwError(`${this.errors.CREATE_FLOW_WITH_NAME} ${this.uploadFlowData.name}`);
            }
        });
    }
    doSnapshot(pageName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disarm)
                return;
            if (pageName) {
                AQAPageCapturePluginCore.log(`taking "${pageName}" snapshot...`);
            }
            else {
                AQAPageCapturePluginCore.log('taking snapshot...');
            }
            // The page to capture brought to the device, every time (1.x resized at every step):
            // the extension captures the window the driver is on with Selenium, the page brought to the
            // front last with Playwright, and checks it.
            if (this.flowViewport)
                yield this.ensureViewport(this.flowViewport);
            const response = yield this.send({ action: ChromeExternalMessaging_1.ChromeExternalMessagingAction.DO_SNAPSHOT, payload: { pageName } });
            if (!(response === null || response === void 0 ? void 0 : response.success)) {
                this.throwError(response ? response.error : this.errors.SNAPSHOT);
            }
            else {
                AQAPageCapturePluginCore.log('...done!');
            }
        });
    }
    uploadZip() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disarm)
                return;
            const { testId, suite, name } = this.uploadFlowData;
            if (testId) {
                AQAPageCapturePluginCore.log(`updating test ${testId} on suite ${suite} with flow named "${name}"...`);
            }
            else {
                AQAPageCapturePluginCore.log(`creating test on suite ${suite} with flow named "${name}"...`);
            }
            const response = yield this.send({ action: ChromeExternalMessaging_1.ChromeExternalMessagingAction.UPLOAD, payload: this.uploadFlowData });
            if (!(response === null || response === void 0 ? void 0 : response.success)) {
                if (response === null || response === void 0 ? void 0 : response.error) {
                    this.throwError(`${this.errors.UPLOAD_ZIP}: ${response.error}`);
                }
                else {
                    this.throwError(this.errors.UPLOAD_ZIP);
                }
            }
            else {
                AQAPageCapturePluginCore.log('...done!');
            }
        });
    }
    /** Not supported: the extension says so at once, and `uploadZip()` delivers the flow. */
    downloadFlowSnapshot() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disarm)
                return;
            const response = yield this.send({ action: ChromeExternalMessaging_1.ChromeExternalMessagingAction.DOWNLOAD });
            if (!(response === null || response === void 0 ? void 0 : response.success)) {
                this.throwError(response ? response.error : 'downloading the flow is not supported: use uploadZip()');
            }
        });
    }
    /**
     * The extension is there and speaks protocol 2, then `START`: it binds this
     * tab, attaches and records it from now on. Before the first navigation is
     * best (every request recorded live), and always before `createFlow()`.
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disarm)
                return;
            const health = yield this.send({ action: ChromeExternalMessaging_1.ChromeExternalMessagingAction.HEALTH_CHECK, protocol: ChromeExternalMessaging_1.PLUGINS_PROTOCOL }, HEALTH_CHECK_TIMEOUT_MS);
            if (!(health === null || health === void 0 ? void 0 : health.success)) {
                const brands = yield this.readBrands().catch(() => null);
                if (brands === null || brands === void 0 ? void 0 : brands.includes('HeadlessChrome')) {
                    this.throwError(`chrome-headless-shell cannot load extensions, so PageCapture for automated tools is not available in it. ${this.headlessShellFix}`);
                }
                else {
                    this.throwError(health ? this.errors.EXTENSION_NOT_ANSWERING : this.errors.EXTENSION_NOT_FOUND);
                }
                return;
            }
            const protocol = 'protocol' in health ? health.protocol : undefined;
            if (protocol === undefined || protocol < ChromeExternalMessaging_1.PLUGINS_PROTOCOL) {
                const version = 'version' in health && health.version ? health.version : '1.x';
                this.throwError(`the PageCapture for automated tools extension found is version ${version}, without protocol ${ChromeExternalMessaging_1.PLUGINS_PROTOCOL}: ` +
                    'plugins 2.0 need the PageCapture for automated tools 2.0 delivered with them.');
                return;
            }
            const started = yield this.send({
                action: ChromeExternalMessaging_1.ChromeExternalMessagingAction.START,
                payload: { driver: this.driverName },
            });
            if (!(started === null || started === void 0 ? void 0 : started.success)) {
                this.throwError(started ? started.error : this.errors.UNABLE_TO_CONNECT);
            }
        });
    }
    /**
     * The script sending a message from the page, as a string, so that no build
     * step rewrites it: it runs in the page, not here. It never throws and answers
     * once: `null` when the page has no channel to the extension at all, a
     * failure when the extension does not answer, within `timeoutMs` when given.
     */
    messageScript(message, resolve, timeoutMs) {
        const timeout = timeoutMs
            ? `setTimeout(function () { finish(noAnswer('the extension gave no answer in ${timeoutMs} ms')); }, ${timeoutMs});`
            : '';
        return `(function () {
      var done = false;
      var finish = function (r) { if (!done) { done = true; ${resolve}(r); } };
      var noAnswer = function (error) { return { success: false, error: error }; };
      var c = (typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.sendMessage) ? chrome : window._AQA_Chrome;
      if (!c || !c.runtime || !c.runtime.sendMessage) { finish(null); return; }
      ${timeout}
      try {
        c.runtime.sendMessage(${JSON.stringify(this.extensionID)}, ${JSON.stringify(message)}, function (r) {
          var e = c.runtime.lastError;
          finish(r || noAnswer(e ? e.message : 'the extension gave no answer'));
        });
      } catch (e) {
        finish(noAnswer(String(e)));
      }
    })();`;
    }
}
/** The script reading the browser's brands, as a string: it runs in the page, so no build step may rewrite it. */
AQAPageCapturePluginCore.BRANDS_SCRIPT = '(navigator.userAgentData && navigator.userAgentData.brands || []).map(function (b) { return b.brand; })';
/** The page's viewport as the extension reads it (`getPageViewport`), as a string for the same reason. */
AQAPageCapturePluginCore.PAGE_VIEWPORT_SCRIPT = '({ outerWidth: window.outerWidth, outerHeight: window.outerHeight, innerWidth: window.innerWidth, ' +
    "innerHeight: window.innerHeight, touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0 })";
exports["default"] = AQAPageCapturePluginCore;


/***/ },

/***/ 531
(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const plugin_core_1 = __importDefault(__webpack_require__(547));
/**
 * The Playwright plugin: every message goes from the page given to `init()`,
 * the only one it drives. Which page a step captures is the extension's to
 * pick (the page last brought to the front), so the device goes to every
 * page of the context.
 */
class AQAPageCapturePlugin extends plugin_core_1.default {
    constructor(driver, options) {
        super(options);
        this.driverName = 'playwright';
        this.headlessShellFix = "Playwright's default headless: true runs it: launch with channel: 'chromium', or give executablePath a full " +
            'Chrome for Testing or Chromium.';
        this.driver = driver;
    }
    /**
     * Plugin initializer.
     */
    static init(driver, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const classInstance = new AQAPageCapturePlugin(driver, options);
            yield classInstance.connect();
            return classInstance;
        });
    }
    send(message, timeoutMs) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.driver.evaluate(`new Promise(function (resolve) { ${this.messageScript(message, 'resolve', timeoutMs)} })`);
        });
    }
    readBrands() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.driver.evaluate(plugin_core_1.default.BRANDS_SCRIPT);
        });
    }
    /**
     * Every page of the context at the device: the one a step captures
     * is the last brought to the front, which the plugin has no handle for.
     * `setViewportSize` sets the inner size itself; a page without one,
     * under `viewport: null`, gets it. A page closing meanwhile is left to the
     * extension's check.
     */
    ensureViewport(_a) {
        return __awaiter(this, arguments, void 0, function* ({ width, height }) {
            yield Promise.all(this.driver
                .context()
                .pages()
                .map((page) => __awaiter(this, void 0, void 0, function* () {
                const size = page.viewportSize();
                if ((size === null || size === void 0 ? void 0 : size.width) === width && size.height === height)
                    return;
                yield page.setViewportSize({ width, height }).catch(() => undefined);
            })));
        });
    }
    readPageViewport() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.driver.evaluate(plugin_core_1.default.PAGE_VIEWPORT_SCRIPT);
        });
    }
}
exports["default"] = AQAPageCapturePlugin;


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(531);
/******/ 	__webpack_exports__ = __webpack_exports__["default"];
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});
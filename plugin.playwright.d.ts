import { Page } from '@playwright/test';

export declare const enum DeviceId {
	DESKTOP_1 = "device_0",
	DESKTOP_2 = "device_1",
	DESKTOP_3 = "device_2",
	MOBILE_1 = "device_3",
	CUSTOM = "custom"
}
export type PresetDeviceId = DeviceId.DESKTOP_1 | DeviceId.DESKTOP_2 | DeviceId.DESKTOP_3 | DeviceId.MOBILE_1;
export interface DeviceViewport {
	width: number;
	height: number;
	touch: boolean;
}
export type PluginDeviceLabel = "1280x1024" | "1366x768" | "1536x864" | "1366x668";
export type AutomationDriver = "playwright" | "selenium";
export declare const enum ChromeExternalMessagingAction {
	CREATE_FLOW = "bg-ext-create-flow",
	DO_SNAPSHOT = "bg-ext-do-snapshot",
	DOWNLOAD = "bg-ext-download-flow",
	HEALTH_CHECK = "bg-ext-health-check",
	START = "bg-ext-start",
	UPLOAD = "bg-ext-upload"
}
export interface PluginPageViewport {
	outerWidth: number;
	outerHeight: number;
	innerWidth: number;
	innerHeight: number;
	touch: boolean;
}
export interface ChromeExtMsgCreateFlow {
	action: ChromeExternalMessagingAction.CREATE_FLOW;
	payload: {
		name?: string;
		device: DeviceId.CUSTOM | PresetDeviceId;
		pageViewport?: PluginPageViewport;
	};
}
export interface ChromeExtMsgDoSnapshot {
	action: ChromeExternalMessagingAction.DO_SNAPSHOT;
	payload: {
		pageName?: string;
	};
}
export interface ChromeExtMsgDownload {
	action: ChromeExternalMessagingAction.DOWNLOAD;
}
export interface ChromeExtMsgHealthCheck {
	action: ChromeExternalMessagingAction.HEALTH_CHECK;
	protocol?: number;
}
export interface ChromeExtMsgStart {
	action: ChromeExternalMessagingAction.START;
	payload: {
		driver: AutomationDriver;
	};
}
export interface ChromeExtMsgUploadToAqa {
	action: ChromeExternalMessagingAction.UPLOAD;
	payload: {
		name: string;
		suite: string;
		team: string;
		xTeam: string;
		description?: string;
		testId?: string;
	};
}
export type ChromeExternalMessagePayload = ChromeExtMsgCreateFlow | ChromeExtMsgDoSnapshot | ChromeExtMsgDownload | ChromeExtMsgHealthCheck | ChromeExtMsgStart | ChromeExtMsgUploadToAqa;
export interface ChromeExtResponseSuccess {
	success: true;
}
export interface ChromeExtResponseError {
	success: false;
	error: string;
}
export interface ChromeExtResponseHealthCheck {
	success: true;
	protocol?: number;
	version?: string;
}
export type ChromeExtResponse = ChromeExtResponseError | ChromeExtResponseSuccess;
export type AQAPageCapturePluginOptions = Pick<ChromeExtMsgUploadToAqa["payload"], "suite" | "team" | "xTeam"> & {
	testId?: string;
	disarm?: boolean;
	ignoreErrors?: boolean;
};
export type DeviceLabel = PluginDeviceLabel;
export type ExtensionReply = ChromeExtResponse | ChromeExtResponseHealthCheck | null;
declare abstract class AQAPageCapturePluginCore {
	protected static readonly BRANDS_SCRIPT = "(navigator.userAgentData && navigator.userAgentData.brands || []).map(function (b) { return b.brand; })";
	protected static readonly PAGE_VIEWPORT_SCRIPT: string;
	readonly extensionID = "llaaiankjgnonjipogopofnpahaoccfo";
	version: string;
	readonly devices: Record<DeviceLabel, PresetDeviceId>;
	readonly errors: {
		CREATE_FLOW: string;
		CREATE_FLOW_WITH_NAME: string;
		CREATE_FLOW_MISSING_NAME: string;
		EXTENSION_NOT_FOUND: string;
		EXTENSION_NOT_ANSWERING: string;
		SNAPSHOT: string;
		UNABLE_TO_CONNECT: string;
		UPLOAD_ZIP: string;
	};
	ignoreErrors: boolean;
	disarm: boolean;
	uploadFlowData: ChromeExtMsgUploadToAqa["payload"];
	private flowViewport;
	protected abstract readonly driverName: AutomationDriver;
	protected abstract readonly headlessShellFix: string;
	constructor(options: AQAPageCapturePluginOptions);
	static nameTimeStamp(): string;
	static log(msg: string): void;
	throwError(message: string): void;
	createFlow(options: {
		name: string;
		description?: string;
		device?: DeviceLabel;
	}): Promise<void>;
	doSnapshot(pageName?: string): Promise<void>;
	uploadZip(): Promise<void>;
	downloadFlowSnapshot(): Promise<void>;
	protected connect(): Promise<void>;
	protected messageScript(message: ChromeExternalMessagePayload, resolve: string, timeoutMs?: number): string;
	protected abstract ensureViewport(viewport: Pick<DeviceViewport, "height" | "width">): Promise<void>;
	protected abstract readPageViewport(): Promise<PluginPageViewport>;
	protected abstract readBrands(): Promise<Array<string> | null>;
	protected abstract send(message: ChromeExternalMessagePayload, timeoutMs?: number): Promise<ExtensionReply>;
}
declare class AQAPageCapturePlugin extends AQAPageCapturePluginCore {
	protected readonly driverName: AutomationDriver;
	protected readonly headlessShellFix: string;
	private readonly driver;
	constructor(driver: Page, options: AQAPageCapturePluginOptions);
	static init(driver: Page, options: AQAPageCapturePluginOptions): Promise<AQAPageCapturePlugin>;
	protected send(message: ChromeExternalMessagePayload, timeoutMs?: number): Promise<ExtensionReply>;
	protected readBrands(): Promise<Array<string> | null>;
	protected ensureViewport({ width, height }: Pick<DeviceViewport, "height" | "width">): Promise<void>;
	protected readPageViewport(): Promise<PluginPageViewport>;
}

export {
	AQAPageCapturePlugin as default,
};

export {};

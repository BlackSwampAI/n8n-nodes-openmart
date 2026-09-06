import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { sleep as n8nSleep } from 'n8n-workflow';

export const OPENMART_API_ORIGIN = 'https://api.openmart.ai';
export const OPENMART_CREDENTIAL_TYPE = 'openmartApi';
export const MAX_SAFE_READ_ATTEMPTS = 3;
export const MAX_RETRY_DELAY_MS = 30_000;

export type OpenmartRequest = (
	credentialType: string,
	options: IHttpRequestOptions,
) => Promise<unknown>;
export type Sleep = (milliseconds: number) => Promise<void>;
export type RetryMode = 'safe-read' | 'none';

export interface OpenmartBalance extends IDataObject {
	period_start: string;
	period_end: string;
	balance: number;
}

interface RequestSettings {
	request: OpenmartRequest;
	operation: string;
	options: IHttpRequestOptions;
	retryMode: RetryMode;
	sleep?: Sleep;
	now?: () => number;
}

export class OpenmartRequestError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly category = 'request',
	) {
		super(message);
		this.name = 'OpenmartRequestError';
	}
}

const defaultSleep: Sleep = n8nSleep;

function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null
		? (value as Record<string, unknown>)
		: undefined;
}

function numericStatus(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isInteger(value)) return value;
	if (typeof value === 'string' && /^\d{3}$/.test(value)) return Number(value);
	return undefined;
}

export function getErrorStatus(error: unknown): number | undefined {
	const top = record(error);
	const response = record(top?.response);
	return (
		numericStatus(top?.httpCode) ??
		numericStatus(top?.statusCode) ??
		numericStatus(top?.status) ??
		numericStatus(response?.statusCode) ??
		numericStatus(response?.status)
	);
}

function getHeaders(error: unknown): Record<string, unknown> | undefined {
	const top = record(error);
	return record(record(top?.response)?.headers) ?? record(top?.headers);
}

export function retryAfterMilliseconds(
	error: unknown,
	now = Date.now(),
	maximum = MAX_RETRY_DELAY_MS,
): number | undefined {
	const headers = getHeaders(error);
	const raw = headers?.['retry-after'] ?? headers?.['Retry-After'];
	const value = Array.isArray(raw) ? raw[0] : raw;
	let milliseconds: number | undefined;
	if (typeof value === 'number' && Number.isFinite(value)) milliseconds = value * 1000;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (/^\d+(?:\.\d+)?$/.test(trimmed)) milliseconds = Number(trimmed) * 1000;
		else {
			const timestamp = Date.parse(trimmed);
			if (!Number.isNaN(timestamp)) milliseconds = Math.max(0, timestamp - now);
		}
	}
	return milliseconds === undefined ? undefined : Math.min(Math.max(0, milliseconds), maximum);
}

function isNetworkOrTimeout(error: unknown): boolean {
	const top = record(error);
	const code = typeof top?.code === 'string' ? top.code.toUpperCase() : '';
	return [
		'EAI_AGAIN',
		'ECONNRESET',
		'ECONNREFUSED',
		'ENOTFOUND',
		'ENETUNREACH',
		'EHOSTUNREACH',
		'ETIMEDOUT',
		'ESOCKETTIMEDOUT',
	].includes(code);
}

function isRetryable(error: unknown): boolean {
	const status = getErrorStatus(error);
	return (
		status === 429 ||
		(status !== undefined && status >= 500 && status <= 504) ||
		isNetworkOrTimeout(error)
	);
}

export function mapOpenmartError(error: unknown, operation: string): OpenmartRequestError {
	if (error instanceof OpenmartRequestError) return error;
	const status = getErrorStatus(error);
	const prefix = `Openmart ${operation} failed`;
	const messages: Record<number, [string, string]> = {
		400: ['The request was invalid', 'validation'],
		401: ['The API key is missing or invalid', 'authentication'],
		402: ['The account credit limit prevents this request', 'credit-limit'],
		403: ['The account does not have permission or entitlement for this request', 'permission'],
		404: ['The API route or version is unavailable', 'not-found'],
		422: ['The request failed Openmart validation', 'validation'],
		429: ['The API rate limit was reached after bounded retries', 'rate-limit'],
	};
	if (status !== undefined && messages[status]) {
		const [message, category] = messages[status];
		return new OpenmartRequestError(`${prefix} (HTTP ${status}): ${message}.`, status, category);
	}
	if (status !== undefined && status >= 500 && status <= 504) {
		return new OpenmartRequestError(
			`${prefix} (HTTP ${status}): Openmart is temporarily unavailable after bounded retries.`,
			status,
			'transient',
		);
	}
	if (isNetworkOrTimeout(error)) {
		return new OpenmartRequestError(
			`${prefix}: A network or timeout failure persisted after bounded retries.`,
			undefined,
			'network',
		);
	}
	return new OpenmartRequestError(
		`${prefix}: The request could not be completed safely.`,
		status,
		'unknown',
	);
}

export async function openmartRequest({
	request,
	operation,
	options,
	retryMode,
	sleep = defaultSleep,
	now = Date.now,
}: RequestSettings): Promise<unknown> {
	const maximumAttempts = retryMode === 'safe-read' ? MAX_SAFE_READ_ATTEMPTS : 1;
	for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
		try {
			return await request(OPENMART_CREDENTIAL_TYPE, options);
		} catch (error) {
			if (attempt >= maximumAttempts || retryMode === 'none' || !isRetryable(error)) {
				throw mapOpenmartError(error, operation);
			}
			const headerDelay = retryAfterMilliseconds(error, now());
			const fallbackDelay = Math.min(1000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
			await sleep(headerDelay ?? fallbackDelay);
		}
	}
	throw new OpenmartRequestError(`Openmart ${operation} failed safely.`, undefined, 'unknown');
}

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isRfc3339(value: unknown): value is string {
	return typeof value === 'string' && RFC3339.test(value) && !Number.isNaN(Date.parse(value));
}

export function parseCreditBalance(value: unknown): OpenmartBalance {
	const response = record(value);
	if (
		!response ||
		!Number.isInteger(response.balance) ||
		!isRfc3339(response.period_start) ||
		!isRfc3339(response.period_end)
	) {
		throw new OpenmartRequestError(
			'Openmart Get Credit Balance returned an invalid response: expected an integer balance and RFC3339 period_start and period_end strings.',
			undefined,
			'invalid-response',
		);
	}
	return response as OpenmartBalance;
}

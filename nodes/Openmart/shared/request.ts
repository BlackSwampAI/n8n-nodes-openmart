import type { IDataObject } from 'n8n-workflow';

export const OPENMART_API_ORIGIN = 'https://api.openmart.ai';

export interface OpenmartBalance extends IDataObject {
	period_start: string;
	period_end: string;
	balance: number;
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
		429: ['The API rate limit was reached', 'rate-limit'],
	};
	if (status !== undefined && messages[status]) {
		const [message, category] = messages[status];
		return new OpenmartRequestError(`${prefix} (HTTP ${status}): ${message}.`, status, category);
	}
	if (status !== undefined && status >= 500 && status <= 504) {
		return new OpenmartRequestError(
			`${prefix} (HTTP ${status}): Openmart is temporarily unavailable.`,
			status,
			'transient',
		);
	}
	if (isNetworkOrTimeout(error)) {
		return new OpenmartRequestError(
			`${prefix}: A network or timeout failure occurred.`,
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

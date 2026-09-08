import type { IDataObject } from 'n8n-workflow';
import { OpenmartRequestError } from './request';

export type InfoAccess = 'EMAIL' | 'PHONE';

export interface CreationInput {
	domain: unknown;
	companyName?: unknown;
	city?: unknown;
	state?: unknown;
	country?: unknown;
	trackingId?: unknown;
}

export interface PeopleSearchInput extends CreationInput {
	title: unknown;
	maxK: unknown;
	infoAccess: unknown;
}

function validationError(operation: string, message: string): OpenmartRequestError {
	return new OpenmartRequestError(
		`Openmart ${operation} validation failed: ${message}.`,
		undefined,
		'validation',
	);
}

function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function requiredString(value: unknown, label: string, operation: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw validationError(operation, `${label} is required and must be a nonblank string`);
	}
	return value.trim();
}

function optionalString(value: unknown, label: string, operation: string): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') {
		throw validationError(operation, `${label} must be a string when provided`);
	}
	return value.trim() || undefined;
}

export function normalizeDomain(value: unknown, operation: string): string {
	const input = requiredString(value, 'Domain', operation);
	if (input.includes('@')) throw validationError(operation, 'Domain must not be an email address');
	if (/^[a-z][a-z\d+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input)) {
		throw validationError(operation, 'Domain URL must use HTTP or HTTPS');
	}

	let parsed: URL;
	try {
		parsed = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
	} catch {
		throw validationError(operation, 'Domain must be a valid hostname or HTTP/HTTPS URL');
	}
	if (!['http:', 'https:'].includes(parsed.protocol)) {
		throw validationError(operation, 'Domain URL must use HTTP or HTTPS');
	}
	if (parsed.username || parsed.password) {
		throw validationError(operation, 'Domain URL must not contain credentials');
	}
	const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
	if (
		!hostname ||
		hostname === 'localhost' ||
		hostname.includes(':') ||
		/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
		!hostname.includes('.') ||
		hostname.length > 253 ||
		!hostname.split('.').every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))
	) {
		throw validationError(
			operation,
			'Domain must be a public hostname, not localhost or an IP address',
		);
	}
	return hostname;
}

function addOptionalContext(
	task: IDataObject,
	input: CreationInput,
	operation: string,
): IDataObject {
	for (const [parameter, apiName, label] of [
		['companyName', 'company_name', 'Company Name'],
		['city', 'city', 'City'],
		['state', 'state', 'State'],
		['country', 'country', 'Country'],
		['trackingId', 'tracking_id', 'Tracking ID'],
	] as const) {
		const normalized = optionalString(input[parameter], label, operation);
		if (normalized) task[apiName] = normalized;
	}
	return task;
}

export function buildPeopleSearchTask(input: PeopleSearchInput): IDataObject {
	const operation = 'People Search Create';
	const maxK = input.maxK;
	if (typeof maxK !== 'number' || !Number.isInteger(maxK) || maxK < 1 || maxK > 8) {
		throw validationError(operation, 'Max Contacts must be an integer from 1 through 8');
	}
	if (
		!Array.isArray(input.infoAccess) ||
		input.infoAccess.length === 0 ||
		input.infoAccess.some((value) => value !== 'EMAIL' && value !== 'PHONE')
	) {
		throw validationError(operation, 'Contact Information must include EMAIL, PHONE, or both');
	}
	const task: IDataObject = {
		domain: normalizeDomain(input.domain, operation),
		title: requiredString(input.title, 'Title', operation),
		max_k: maxK,
		info_access: [...new Set(input.infoAccess as InfoAccess[])],
	};
	return addOptionalContext(task, input, operation);
}

export function buildCompanyEmailTask(input: CreationInput): IDataObject {
	const operation = 'Company Email Create';
	const task: IDataObject = {
		domain: normalizeDomain(input.domain, operation),
		company_name: requiredString(input.companyName, 'Company Name', operation),
	};
	return addOptionalContext(task, { ...input, companyName: undefined }, operation);
}

export function parseBatchSubmission(value: unknown, operation: string): IDataObject {
	const response = record(value);
	const status = record(response?.status);
	const counts = ['processing', 'completed', 'errored', 'total'] as const;
	if (
		!response ||
		typeof response.batch_id !== 'string' ||
		!response.batch_id.trim() ||
		typeof response.submit_for !== 'string' ||
		!response.submit_for.trim() ||
		!status ||
		typeof status.batch_ready !== 'boolean' ||
		counts.some((name) => !Number.isInteger(status[name]) || (status[name] as number) < 0)
	) {
		throw new OpenmartRequestError(
			`Openmart ${operation} returned an invalid response: expected nonblank batch_id and submit_for strings plus nested status with batch_ready and nonnegative integer counts.`,
			undefined,
			'invalid-response',
		);
	}
	return response as IDataObject;
}

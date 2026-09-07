import type { IDataObject } from 'n8n-workflow';
import { OpenmartRequestError } from './request';

function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

export function requiredId(value: unknown, label: string): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new OpenmartRequestError(
			`${label} is required and must be a nonblank string.`,
			undefined,
			'validation',
		);
	}
	return value.trim();
}

export function encodedId(value: unknown, label: string): string {
	return encodeURIComponent(requiredId(value, label));
}

export function optionalStatus(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') {
		throw new OpenmartRequestError(
			'Status must be a string when provided.',
			undefined,
			'validation',
		);
	}
	return value.trim() || undefined;
}

export function parseBatchStatus(value: unknown): IDataObject {
	const response = record(value);
	const countNames = ['processing', 'completed', 'errored', 'total'] as const;
	if (
		!response ||
		typeof response.batch_ready !== 'boolean' ||
		countNames.some((name) => !Number.isInteger(response[name]) || (response[name] as number) < 0)
	) {
		throw new OpenmartRequestError(
			'Openmart Get Batch Status returned an invalid response: expected batch_ready as a boolean and nonnegative integer processing, completed, errored, and total counts.',
			undefined,
			'invalid-response',
		);
	}
	return response as IDataObject;
}

export function parseTaskIds(value: unknown): string[] {
	if (
		!Array.isArray(value) ||
		value.some((taskId) => typeof taskId !== 'string' || taskId.trim() === '')
	) {
		throw new OpenmartRequestError(
			'Openmart Get Task IDs returned an invalid response: expected a top-level array of nonblank task ID strings.',
			undefined,
			'invalid-response',
		);
	}
	return value.map((taskId) => (taskId as string).trim());
}

export function parseTask(value: unknown): IDataObject {
	const response = record(value);
	if (
		!response ||
		typeof response.task_id !== 'string' ||
		response.task_id.trim() === '' ||
		typeof response.status !== 'string' ||
		response.status.trim() === '' ||
		(response.tracking_id !== undefined &&
			response.tracking_id !== null &&
			typeof response.tracking_id !== 'string')
	) {
		throw new OpenmartRequestError(
			'Openmart Get Task returned an invalid response: expected nonblank task_id and status strings and an optional string or null tracking_id.',
			undefined,
			'invalid-response',
		);
	}
	return response as IDataObject;
}

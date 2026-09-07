import type { IDataObject } from 'n8n-workflow';
import { OpenmartRequestError } from './request';

const MAX_QUERY_LENGTH = 500;

export interface SearchInput {
	query: unknown;
	limit: unknown;
	location: unknown;
	filters: unknown;
}

export interface OpenmartSearchResult extends IDataObject {
	id: string;
	content: IDataObject;
}

function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function trimmedOptional(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validationError(message: string): OpenmartRequestError {
	return new OpenmartRequestError(
		`Openmart Search validation failed: ${message}.`,
		undefined,
		'validation',
	);
}

export function buildSearchBody({ query, limit, location, filters }: SearchInput): IDataObject {
	if (typeof query !== 'string' || !query.trim()) throw validationError('Query is required');
	const normalizedQuery = query.trim();
	if (normalizedQuery.length > MAX_QUERY_LENGTH)
		throw validationError(`Query must contain at most ${MAX_QUERY_LENGTH} characters`);
	if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 100)
		throw validationError('Limit must be an integer from 1 through 100');

	const body: IDataObject = { query: normalizedQuery, limit, estimate_total: false };
	const locationValues = record(record(location)?.locationValues);
	if (locationValues) {
		const normalizedLocation: IDataObject = {};
		for (const key of ['country', 'state', 'city'] as const) {
			const value = trimmedOptional(locationValues[key]);
			if (value) normalizedLocation[key] = value;
		}
		if (Object.keys(normalizedLocation).length) body.location = [normalizedLocation];
	}

	const filterValues = record(filters);
	if (filterValues) {
		const normalizedFilters: IDataObject = {};
		for (const key of ['has_website', 'has_valid_website', 'has_contact_info'] as const) {
			if (typeof filterValues[key] === 'boolean') normalizedFilters[key] = filterValues[key];
		}
		if (filterValues.min_locations !== undefined) {
			if (
				typeof filterValues.min_locations !== 'number' ||
				!Number.isInteger(filterValues.min_locations) ||
				filterValues.min_locations < 1
			)
				throw validationError('Minimum Locations must be a positive integer');
			normalizedFilters.min_locations = filterValues.min_locations;
		}
		Object.assign(body, normalizedFilters);
	}

	return body;
}

export function parseSearchResults(value: unknown): OpenmartSearchResult[] {
	if (!Array.isArray(value))
		throw new OpenmartRequestError(
			'Openmart Search returned an invalid response: expected a top-level array.',
			undefined,
			'invalid-response',
		);
	const results = value.map((candidate) => {
		const result = record(candidate);
		if (!result || typeof result.id !== 'string' || !result.id.trim() || !record(result.content)) {
			throw new OpenmartRequestError(
				'Openmart Search returned an invalid response: every result must have a non-empty string id and non-null object content.',
				undefined,
				'invalid-response',
			);
		}
		return result as OpenmartSearchResult;
	});
	return results;
}

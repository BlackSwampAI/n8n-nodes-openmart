import type { IExecuteSingleFunctions, IN8nHttpFullResponse } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { prepareSearch, receiveSearch } from '../nodes/Openmart/actions/routing';
import { buildSearchBody, parseSearchResults } from '../nodes/Openmart/shared/search';
import searchResults from './fixtures/search-results.json';

const context = (parameters: Record<string, unknown>) =>
	({ getNodeParameter: (name: string) => parameters[name] }) as unknown as IExecuteSingleFunctions;
const response = (body: unknown, statusCode = 200) =>
	({ body, statusCode, headers: {} }) as IN8nHttpFullResponse;
const minimal = { query: 'dentists', resultLimit: 10, location: {}, filters: {} };

describe('Openmart Business Search declarative hooks', () => {
	it('builds the minimal first-page request', async () => {
		await expect(
			prepareSearch.call(context(minimal), { method: 'POST', url: '/api/v1/search' }),
		).resolves.toEqual({
			method: 'POST',
			url: '/api/v1/search',
			body: { query: 'dentists', limit: 10, estimate_total: false },
		});
	});

	it('trims optional location and filters while omitting blanks', () => {
		expect(
			buildSearchBody({
				query: ' dental practices ',
				limit: 25,
				location: { locationValues: { country: ' USA ', state: ' Ohio ', city: ' ' } },
				filters: {
					has_website: true,
					has_valid_website: false,
					has_contact_info: true,
					min_locations: 2,
				},
			}),
		).toEqual({
			query: 'dental practices',
			limit: 25,
			estimate_total: false,
			location: [{ country: 'USA', state: 'Ohio' }],
			has_website: true,
			has_valid_website: false,
			has_contact_info: true,
			min_locations: 2,
		});
	});

	it.each([
		[{ ...minimal, query: ' ' }, 'Query is required'],
		[{ ...minimal, query: 'x'.repeat(501) }, 'at most 500'],
		[{ ...minimal, resultLimit: 0 }, 'Limit must be'],
		[{ ...minimal, resultLimit: 1.5 }, 'Limit must be'],
		[{ ...minimal, resultLimit: 101 }, 'Limit must be'],
		[{ ...minimal, filters: { min_locations: 0 } }, 'Minimum Locations'],
	] as const)('rejects invalid values in preSend', async (parameters, message) => {
		await expect(
			prepareSearch.call(context(parameters), { url: '/api/v1/search' }),
		).rejects.toThrow(message);
	});

	it('accepts trimmed maximum query and limit boundaries in preSend', async () => {
		const request = await prepareSearch.call(
			context({ ...minimal, query: ` ${'x'.repeat(500)} `, resultLimit: 100 }),
			{ method: 'POST', url: '/api/v1/search' },
		);
		expect(request.body).toMatchObject({ query: 'x'.repeat(500), limit: 100 });
	});

	it('emits one-to-many records and preserves empty arrays', async () => {
		await expect(receiveSearch.call(context({}), [], response(searchResults))).resolves.toEqual(
			searchResults.map((json) => ({ json })),
		);
		const emitted = await receiveSearch.call(context({}), [], response(searchResults));
		expect(emitted[0].json).toMatchObject({
			match_score: 0.91,
			match_highlights: ['Independent dental practice'],
			cursor: [0.91, 'store_101'],
			content: { store_phones: null },
		});
		await expect(receiveSearch.call(context({}), [], response([]))).resolves.toEqual([]);
	});

	it('rejects malformed 2xx payloads and sanitized HTTP failures', async () => {
		expect(() => parseSearchResults({ results: searchResults })).toThrow('top-level array');
		expect(() => parseSearchResults([searchResults[0], { id: '', content: {} }])).toThrow(
			'every result',
		);
		expect(() => parseSearchResults([{ id: 'business', content: null }])).toThrow('every result');
		const failure = await receiveSearch
			.call(context({}), [], response('Bearer secret private provider body', 503))
			.then(
				() => '',
				(error: unknown) => (error as Error).message,
			);
		expect(failure).toContain('HTTP 503');
		expect(failure).not.toContain('secret');
		expect(failure).not.toContain('provider body');
	});
});

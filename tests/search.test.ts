import type {
	DeclarativeRestApiSettings,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { paginateSearch, prepareSearch, receiveSearch } from '../nodes/Openmart/actions/routing';
import { buildSearchBody, parseSearchResults } from '../nodes/Openmart/shared/search';
import searchResults from './fixtures/search-results.json';

const context = (parameters: Record<string, unknown>) =>
	({ getNodeParameter: (name: string) => parameters[name] }) as unknown as IExecuteSingleFunctions;
const response = (body: unknown, statusCode = 200) =>
	({ body, statusCode, headers: {} }) as IN8nHttpFullResponse;
const minimal = {
	query: 'dentists',
	returnAll: false,
	resultLimit: 10,
	location: {},
	filters: {},
};
const requestOptions = (body: Record<string, unknown>) =>
	({
		options: { method: 'POST', url: '/api/v1/search', body },
		preSend: [],
		postReceive: [],
	}) as DeclarativeRestApiSettings.ResultOptions;

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
		[{ ...minimal, resultLimit: 1_001 }, 'Limit must be'],
		[{ ...minimal, filters: { min_locations: 0 } }, 'Minimum Locations'],
	] as const)('rejects invalid values in preSend', async (parameters, message) => {
		await expect(
			prepareSearch.call(context(parameters), { url: '/api/v1/search' }),
		).rejects.toThrow(message);
	});

	it('uses a 100-record page while applying a larger Limit across pages', async () => {
		const first = Array.from({ length: 100 }, (_, index) => ({
			json: { id: `first-${index}`, content: {}, ...(index === 99 ? { cursor: [1, 'next'] } : {}) },
		}));
		const second = Array.from({ length: 75 }, (_, index) => ({
			json: { id: `second-${index}`, content: {} },
		}));
		const requests: DeclarativeRestApiSettings.ResultOptions[] = [];
		const paginationContext = {
			getNodeParameter: (name: string) => ({ returnAll: false, resultLimit: 150 })[name],
			makeRoutingRequest: async (options: DeclarativeRestApiSettings.ResultOptions) => {
				requests.push(options);
				return requests.length === 1 ? first : second;
			},
		} as unknown as IExecutePaginationFunctions;
		const result = await paginateSearch.call(
			paginationContext,
			requestOptions({ query: 'dentists', limit: 100, estimate_total: false }),
		);
		expect(result).toHaveLength(150);
		expect(requests).toHaveLength(2);
		expect(requests[1]?.options.body).toEqual({
			query: 'dentists',
			limit: 50,
			estimate_total: false,
			cursor: [1, 'next'],
		});
	});

	it('stops on exhaustion and rejects repeated or malformed cursors and later-page failures', async () => {
		const run = async (pages: Array<unknown>) => {
			let call = 0;
			const paginationContext = {
				getNodeParameter: (name: string) => ({ returnAll: true, resultLimit: 10 })[name],
				makeRoutingRequest: async () => {
					const page = pages[call++];
					if (page instanceof Error) throw page;
					return page as Array<{ json: Record<string, unknown> }>;
				},
			} as unknown as IExecutePaginationFunctions;
			return paginateSearch.call(
				paginationContext,
				requestOptions({ query: 'dentists', limit: 100, estimate_total: false }),
			);
		};
		await expect(run([[{ json: { id: 'one', content: {} } }]])).resolves.toHaveLength(1);
		await expect(run([[]])).resolves.toEqual([]);
		await expect(
			run([
				[{ json: { id: 'one', content: {}, cursor: [1, 'same'] } }],
				[{ json: { id: 'two', content: {}, cursor: [1, 'same'] } }],
			]),
		).rejects.toThrow('repeated cursor');
		await expect(run([[{ json: { id: 'one', content: {}, cursor: 'bad' } }]])).rejects.toThrow(
			'invalid cursor',
		);
		await expect(run([[{ json: { id: 'one', content: {}, cursor: [1] } }]])).rejects.toThrow(
			'invalid cursor',
		);
		await expect(
			run([[{ json: { id: 'one', content: {}, cursor: [1, 'next'] } }], new Error('HTTP 503')]),
		).rejects.toThrow('HTTP 503');
	});

	it('bounds Return All pagination to 100 pages', async () => {
		let calls = 0;
		const paginationContext = {
			getNodeParameter: (name: string) => ({ returnAll: true, resultLimit: 10 })[name],
			makeRoutingRequest: async () => {
				calls += 1;
				return [{ json: { id: `id-${calls}`, content: {}, cursor: [calls, `id-${calls}`] } }];
			},
		} as unknown as IExecutePaginationFunctions;
		await expect(
			paginateSearch.call(
				paginationContext,
				requestOptions({ query: 'dentists', limit: 100, estimate_total: false }),
			),
		).rejects.toThrow('100-page safety limit');
		expect(calls).toBe(100);
	});

	it('accepts trimmed maximum query and limit boundaries in preSend', async () => {
		const request = await prepareSearch.call(
			context({ ...minimal, query: ` ${'x'.repeat(500)} `, resultLimit: 100 }),
			{ method: 'POST', url: '/api/v1/search' },
		);
		expect(request.body).toMatchObject({ query: 'x'.repeat(500), limit: 100 });
	});

	it('classifies an invalid total Limit as local validation', async () => {
		const error = await prepareSearch
			.call(context({ ...minimal, resultLimit: 1_001 }), { url: '/api/v1/search' })
			.then(
				() => undefined,
				(candidate: unknown) => candidate,
			);
		expect(error).toMatchObject({ name: 'OpenmartRequestError', category: 'validation' });
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

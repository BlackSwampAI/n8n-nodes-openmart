import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { Openmart } from '../nodes/Openmart/Openmart.node';
import { buildSearchBody, parseSearchResults } from '../nodes/Openmart/shared/search';
import searchResults from './fixtures/search-results.json';

type ParametersByItem = Array<Record<string, unknown>>;

function executionContext(
	parameters: ParametersByItem,
	request: ReturnType<typeof vi.fn>,
	continueOnFail = false,
): IExecuteFunctions {
	const inputs: INodeExecutionData[] = parameters.map((_, index) => ({ json: { source: index } }));
	return {
		getInputData: () => inputs,
		getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) =>
			parameters[itemIndex][name] ?? fallback,
		getNode: () => ({
			name: 'Openmart',
			type: 'openmart',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		continueOnFail: () => continueOnFail,
		helpers: { httpRequestWithAuthentication: request },
	} as unknown as IExecuteFunctions;
}

const minimalParameters = { resource: 'business', operation: 'search', query: 'dentists' };

describe('Openmart Business Search', () => {
	it('builds the minimal first-page request with documented stable shape', async () => {
		const request = vi.fn().mockResolvedValue(searchResults.slice(0, 1));
		const context = executionContext([minimalParameters], request);
		await new Openmart().execute.call(context);
		expect(request).toHaveBeenCalledTimes(1);
		expect(request).toHaveBeenCalledWith('openmartApi', {
			method: 'POST',
			url: 'https://api.openmart.ai/api/v1/search',
			body: { query: 'dentists', limit: 10, estimate_total: false },
			json: true,
		});
	});

	it('trims and maps optional location and initial filters while omitting blanks', () => {
		expect(
			buildSearchBody({
				query: '  dental practices  ',
				limit: 25,
				location: { locationValues: { country: ' USA ', state: ' Ohio ', city: '  ' } },
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
		['blank query', { ...minimalParameters, query: '   ' }, 'Query is required'],
		['too-long query', { ...minimalParameters, query: 'x'.repeat(501) }, 'at most 500'],
		['low limit', { ...minimalParameters, resultLimit: 0 }, 'Limit must be'],
		['fractional limit', { ...minimalParameters, resultLimit: 1.5 }, 'Limit must be'],
		['high limit', { ...minimalParameters, resultLimit: 101 }, 'Limit must be'],
		[
			'invalid minimum locations',
			{ ...minimalParameters, filters: { min_locations: 0 } },
			'Minimum Locations',
		],
	])('rejects %s before transport', async (_label, parameters, message) => {
		const request = vi.fn();
		await expect(
			new Openmart().execute.call(executionContext([parameters], request)),
		).rejects.toThrow(message);
		expect(request).not.toHaveBeenCalled();
	});

	it('accepts the 500-character and expression-resolved runtime boundaries', async () => {
		const request = vi.fn().mockResolvedValue([]);
		await new Openmart().execute.call(
			executionContext(
				[
					{
						...minimalParameters,
						query: ` ${'x'.repeat(500)} `,
						resultLimit: 100,
						location: { locationValues: { country: ' US ' } },
					},
				],
				request,
			),
		);
		expect(request.mock.calls[0][1].body).toMatchObject({
			query: 'x'.repeat(500),
			limit: 100,
			location: [{ country: 'US' }],
		});
	});

	it('preserves full provider records and one-to-many input pairing', async () => {
		const request = vi
			.fn()
			.mockResolvedValueOnce(searchResults)
			.mockResolvedValueOnce(searchResults.slice(1));
		const [results] = await new Openmart().execute.call(
			executionContext([minimalParameters, { ...minimalParameters, query: 'plumbers' }], request),
		);
		expect(results).toEqual([
			{ json: searchResults[0], pairedItem: 0 },
			{ json: searchResults[1], pairedItem: 0 },
			{ json: searchResults[1], pairedItem: 1 },
		]);
		expect(results[0].json).toMatchObject({
			match_score: 0.91,
			match_highlights: ['Independent dental practice'],
			cursor: [0.91, 'store_101'],
			content: { store_phones: null },
		});
	});

	it('emits no placeholder for an empty result array', async () => {
		const [results] = await new Openmart().execute.call(
			executionContext([minimalParameters], vi.fn().mockResolvedValue([])),
		);
		expect(results).toEqual([]);
	});

	it('validates the entire response atomically', () => {
		expect(() => parseSearchResults({ results: searchResults })).toThrow('top-level array');
		expect(() => parseSearchResults([searchResults[0], { id: '', content: {} }])).toThrow(
			'every result',
		);
		expect(() => parseSearchResults([{ id: 'biz', content: null }])).toThrow('every result');
	});

	it('continues with a paired sanitized malformed-response error', async () => {
		const request = vi.fn().mockResolvedValue({ results: [] });
		const [results] = await new Openmart().execute.call(
			executionContext([minimalParameters], request, true),
		);
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ json: { source: 0 }, pairedItem: 0 });
		expect(results[0].error?.message).toContain('expected a top-level array');
	});

	it('does not retry a transient Search failure', async () => {
		const request = vi.fn().mockRejectedValue({ statusCode: 503, body: 'private provider body' });
		await expect(
			new Openmart().execute.call(executionContext([minimalParameters], request)),
		).rejects.toThrow('HTTP 503');
		expect(request).toHaveBeenCalledTimes(1);
	});

	it('rejects unsupported resource and operation selections without transport', async () => {
		const request = vi.fn();
		await expect(
			new Openmart().execute.call(
				executionContext([{ resource: 'business', operation: 'unknown' }], request),
			),
		).rejects.toThrow('business/unknown');
		expect(request).not.toHaveBeenCalled();
	});
});

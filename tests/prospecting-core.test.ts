import type { IExecuteSingleFunctions, IN8nHttpFullResponse } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Openmart } from '../nodes/Openmart/Openmart.node';
import {
	prepareCompanyEnrich,
	prepareCompanySearch,
	prepareKnownPeople,
	receiveCompanyEnrich,
	receiveCompanySearch,
	receiveKnownPeople,
} from '../nodes/Openmart/actions/routing';
import { buildKnownPeopleTask } from '../nodes/Openmart/shared/creation';
import {
	buildCompanyEnrichBody,
	buildCompanySearchBody,
} from '../nodes/Openmart/shared/prospecting';

const context = (parameters: Record<string, unknown>) =>
	({ getNodeParameter: (name: string) => parameters[name] }) as unknown as IExecuteSingleFunctions;
const response = (body: unknown, statusCode = 200) =>
	({ body, statusCode, headers: {} }) as IN8nHttpFullResponse;
const companySearch = {
	companySearchTerm: 'coffee',
	companySearchLocation: {},
	ownershipType: [],
	storeCount: {},
	hasStaffInfo: '',
	hasBusinessEmail: '',
	hasBusinessPhone: '',
	companySearchLimit: 10,
};
const submission = {
	batch_id: 'batch',
	submit_for: 'lookup_people',
	status: { processing: 1, completed: 0, errored: 0, total: 1, batch_ready: false },
};
const known = {
	domain: 'Example.com',
	companyName: '',
	city: '',
	state: '',
	country: '',
	trackingId: '',
	people: { person: [{ firstName: ' Jane ', lastName: ' Doe ', linkedinUrl: '' }] },
	infoAccess: ['EMAIL'],
};

describe('prospecting core', () => {
	it('publishes the consolidated resources and exact new routes', () => {
		const description = new Openmart().description;
		const resources = description.properties.find(({ name }) => name === 'resource');
		expect(resources?.options).toEqual(
			expect.arrayContaining([
				{ name: 'Company', value: 'company' },
				{ name: 'Person', value: 'person' },
			]),
		);
		expect(JSON.stringify(resources)).not.toContain('companyEmail');
		expect(JSON.stringify(resources)).not.toContain('peopleSearch');
		const operations = description.properties.filter(({ name }) => name === 'operation');
		const forResource = (resource: string) =>
			operations.find(({ displayOptions }) => displayOptions?.show?.resource?.includes(resource));
		expect(forResource('company')?.options).toEqual([
			expect.objectContaining({
				value: 'findEmails',
				routing: expect.objectContaining({
					request: {
						method: 'POST',
						url: '/api/v1/task/batch/lookup_business_email',
						timeout: 90_000,
					},
				}),
			}),
			expect.objectContaining({
				value: 'search',
				routing: expect.objectContaining({
					request: { method: 'POST', url: '/api/v2/brands/search' },
				}),
			}),
			expect.objectContaining({
				value: 'enrich',
				routing: expect.objectContaining({
					request: { method: 'POST', url: '/api/v1/enrich_company' },
				}),
			}),
		]);
		expect(forResource('person')?.options).toEqual([
			expect.objectContaining({ value: 'findDecisionMakers' }),
			expect.objectContaining({
				value: 'enrich',
				routing: expect.objectContaining({
					request: { method: 'POST', url: '/api/v1/task/batch/lookup_people', timeout: 90_000 },
				}),
			}),
		]);
		expect(new Openmart()).not.toHaveProperty('execute');
	});

	it('publishes intentional controls, defaults, requirements, and isolated display branches', () => {
		const properties = new Openmart().description.properties;
		const visible = (resource: string, operation: string) =>
			properties.filter(
				(property) =>
					property.displayOptions?.show?.resource?.includes(resource) === true &&
					property.displayOptions.show.operation?.includes(operation) === true,
			);
		const names = (resource: string, operation: string) =>
			visible(resource, operation).map(({ name }) => name);
		const property = (resource: string, operation: string, name: string) =>
			visible(resource, operation).find((candidate) => candidate.name === name);
		const requiredNames = (resource: string, operation: string) =>
			visible(resource, operation)
				.filter(({ required }) => required === true)
				.map(({ name }) => name);

		expect(names('company', 'findEmails')).toEqual([
			'paidCreationNotice',
			'domain',
			'companyName',
			'city',
			'state',
			'country',
			'trackingId',
		]);
		expect(requiredNames('company', 'findEmails')).toEqual(['domain', 'companyName']);
		expect(property('company', 'findEmails', 'domain')).toMatchObject({ default: '' });
		expect(property('company', 'findEmails', 'companyName')).toMatchObject({ default: '' });

		expect(names('person', 'findDecisionMakers')).toEqual([
			'paidPersonNotice',
			'domain',
			'companyName',
			'title',
			'maxK',
			'infoAccess',
			'city',
			'state',
			'country',
			'trackingId',
		]);
		expect(requiredNames('person', 'findDecisionMakers')).toEqual([
			'domain',
			'title',
			'maxK',
			'infoAccess',
		]);
		expect(property('person', 'findDecisionMakers', 'title')).toMatchObject({
			default: 'Owner or decision maker',
		});
		expect(property('person', 'findDecisionMakers', 'maxK')).toMatchObject({
			default: 1,
			typeOptions: { minValue: 1, maxValue: 8 },
		});
		expect(property('person', 'findDecisionMakers', 'infoAccess')).toMatchObject({
			default: ['EMAIL'],
		});
		expect(names('company', 'findEmails')).not.toEqual(
			expect.arrayContaining(['title', 'maxK', 'infoAccess', 'people']),
		);
		expect(names('person', 'findDecisionMakers')).not.toEqual(
			expect.arrayContaining(['website', 'socialMediaLink', 'people']),
		);

		expect(names('company', 'search')).toEqual([
			'companySearchTerm',
			'companySearchLocation',
			'ownershipType',
			'storeCount',
			'hasStaffInfo',
			'hasBusinessEmail',
			'hasBusinessPhone',
			'companySearchLimit',
		]);
		expect(property('company', 'search', 'companySearchLimit')).toMatchObject({
			default: 10,
			typeOptions: { minValue: 1, maxValue: 100 },
		});
		expect(property('company', 'search', 'storeCount')).toMatchObject({
			type: 'collection',
			default: {},
			options: expect.arrayContaining([
				expect.objectContaining({ name: 'minimumStores', type: 'number' }),
				expect.objectContaining({ name: 'maximumStores', type: 'number' }),
			]),
		});
		expect(property('company', 'search', 'companySearchLocation')?.options?.[0]).toMatchObject({
			values: expect.arrayContaining([expect.objectContaining({ name: 'country', default: 'US' })]),
		});

		expect(names('company', 'enrich')).toEqual([
			'website',
			'socialMediaLink',
			'companyEnrichLocation',
			'companyEnrichLimit',
		]);
		expect(property('company', 'enrich', 'companyEnrichLimit')).toMatchObject({
			default: 10,
			typeOptions: { minValue: 1, maxValue: 50 },
		});

		expect(names('person', 'enrich')).toEqual([
			'paidPersonNotice',
			'domain',
			'companyName',
			'infoAccess',
			'city',
			'state',
			'country',
			'trackingId',
			'people',
		]);
		expect(property('person', 'enrich', 'domain')).toMatchObject({ required: true, default: '' });
		expect(property('person', 'enrich', 'people')).toMatchObject({
			required: true,
			default: {},
			typeOptions: { multipleValues: true },
		});
		expect(property('person', 'enrich', 'infoAccess')).toMatchObject({
			required: true,
			default: ['EMAIL'],
		});
		expect(names('company', 'enrich')).not.toEqual(expect.arrayContaining(['domain', 'people']));
		expect(names('person', 'enrich')).not.toEqual(
			expect.arrayContaining(['website', 'companyEnrichLocation']),
		);

		const stateControls: Array<Record<string, unknown>> = [];
		const collectStateControls = (value: unknown): void => {
			if (Array.isArray(value)) return value.forEach(collectStateControls);
			if (typeof value !== 'object' || value === null) return;
			const candidate = value as Record<string, unknown>;
			if (candidate.name === 'state') stateControls.push(candidate);
			Object.values(candidate).forEach(collectStateControls);
		};
		collectStateControls(properties);
		expect(stateControls).toHaveLength(5);
		for (const state of stateControls) {
			expect(state).toMatchObject({ placeholder: 'e.g. CA' });
			expect(state.description).toContain('two-letter state code');
		}
		for (const noticeName of ['paidCreationNotice', 'paidPersonNotice']) {
			const notice = properties.find(({ name }) => name === noticeName);
			expect(notice?.displayName).toContain('Batch Get Status → Batch Get Task IDs → Task Get');
		}
	});

	it('builds intentional company search requests and exposes the next cursor on each brand', async () => {
		await expect(
			prepareCompanySearch.call(context(companySearch), { url: '/search' }),
		).resolves.toEqual({
			url: '/search',
			body: {
				search_param: { search_term: 'coffee', location: [{ country: 'US' }] },
				pagination: { limit: 10 },
				estimate_total: false,
			},
		});
		const narrowed = buildCompanySearchBody({
			...companySearch,
			companySearchTerm: '',
			ownershipType: ['CHAIN'],
			storeCount: { minimumStores: 5, maximumStores: 20 },
			hasBusinessEmail: true,
			companySearchLimit: 100,
		});
		expect(narrowed).toMatchObject({
			search_param: {
				ownership_type: ['CHAIN'],
				num_stores: [{ ge: 5, le: 20 }],
				has_business_email: true,
			},
			pagination: { limit: 100 },
		});
		await expect(
			receiveCompanySearch.call(
				context({}),
				[],
				response({ encoded_cursor: 'next', data: [{ brand_id: 'brand', unknown: 1 }] }),
			),
		).resolves.toEqual([{ json: { brand_id: 'brand', unknown: 1, openmart_next_cursor: 'next' } }]);
		await expect(
			receiveCompanySearch.call(context({}), [], response({ encoded_cursor: '', data: [] })),
		).resolves.toEqual([]);
	});

	it('omits unintended store filters for an empty collection and preserves explicit zero', () => {
		expect(buildCompanySearchBody(companySearch).search_param).not.toHaveProperty('num_stores');
		expect(
			buildCompanySearchBody({
				...companySearch,
				storeCount: { maximumStores: 0 },
			}).search_param,
		).toMatchObject({ num_stores: [{ le: 0 }] });
	});

	it('matches the documented direct-HTTP brand search body for the live discrepancy case', async () => {
		await expect(
			prepareCompanySearch.call(
				context({
					...companySearch,
					companySearchTerm: 'coffee shop',
					companySearchLocation: {
						locationValues: { country: 'US', state: 'CA', city: 'San Francisco' },
					},
					companySearchLimit: 1,
				}),
				{ url: '/api/v2/brands/search' },
			),
		).resolves.toEqual({
			url: '/api/v2/brands/search',
			body: {
				search_param: {
					search_term: 'coffee shop',
					location: [{ country: 'US', state: 'CA', city: 'San Francisco' }],
				},
				pagination: { limit: 1 },
				estimate_total: false,
			},
		});
	});

	it.each([
		[{ ...companySearch, companySearchTerm: '' }, 'narrowing filter'],
		[{ ...companySearch, companySearchLimit: 101 }, 'Limit'],
		[{ ...companySearch, storeCount: { minimumStores: 10, maximumStores: 2 } }, 'must not exceed'],
		[{ ...companySearch, ownershipType: ['OTHER'] }, 'Ownership Type'],
	])('rejects unsafe company search %# before transport', async (parameters, message) => {
		await expect(
			prepareCompanySearch.call(context(parameters), { url: '/search' }),
		).rejects.toThrow(message);
	});

	it('builds and emits company enrich results', async () => {
		const input = {
			website: ' example.com ',
			socialMediaLink: '',
			companyEnrichLocation: { locationValues: { country: 'US', state: 'OH', city: '' } },
			companyEnrichLimit: 50,
		};
		expect(buildCompanyEnrichBody(input)).toEqual({
			website: 'example.com',
			location: [{ country: 'US', state: 'OH' }],
			limit: 50,
			estimate_total: false,
		});
		await expect(
			prepareCompanyEnrich.call(context(input), { url: '/enrich' }),
		).resolves.toHaveProperty('body');
		const item = { id: 'store', content: { name: 'Company' }, unknown: true };
		await expect(receiveCompanyEnrich.call(context({}), [], response([item]))).resolves.toEqual([
			{ json: item },
		]);
		await expect(receiveCompanyEnrich.call(context({}), [], response([]))).resolves.toEqual([]);
	});

	it.each([
		[
			{ website: '', socialMediaLink: '', companyEnrichLocation: {}, companyEnrichLimit: 10 },
			'Website or Social',
		],
		[
			{ website: 'x.com', socialMediaLink: '', companyEnrichLocation: {}, companyEnrichLimit: 0 },
			'Limit',
		],
		[
			{ website: 'x.com', socialMediaLink: '', companyEnrichLocation: {}, companyEnrichLimit: 51 },
			'Limit',
		],
	])('rejects invalid company enrich %#', (input, message) =>
		expect(() => buildCompanyEnrichBody(input)).toThrow(message),
	);

	it('submits one known-people task and preserves normalized context', async () => {
		expect(buildKnownPeopleTask(known)).toEqual({
			domain: 'example.com',
			people: [{ first_name: 'Jane', last_name: 'Doe' }],
			info_access: ['EMAIL'],
		});
		await expect(
			prepareKnownPeople.call(context(known), { url: '/people', timeout: 90_000 }),
		).resolves.toMatchObject({
			body: [
				{
					domain: 'example.com',
					people: [{ first_name: 'Jane', last_name: 'Doe' }],
					info_access: ['EMAIL'],
				},
			],
		});
		await expect(
			receiveKnownPeople.call(context(known), [], response(submission)),
		).resolves.toEqual([
			{
				json: {
					...submission,
					submitted: {
						domain: 'example.com',
						people: [{ first_name: 'Jane', last_name: 'Doe' }],
						info_access: ['EMAIL'],
					},
				},
			},
		]);
	});

	it.each([
		[{ ...known, people: {} }, '1 through 8'],
		[{ ...known, people: { person: [] } }, '1 through 8'],
		[
			{
				...known,
				people: { person: Array.from({ length: 9 }, () => ({ firstName: 'A', lastName: 'B' })) },
			},
			'1 through 8',
		],
		[{ ...known, people: { person: [{ firstName: '', lastName: 'Doe' }] } }, 'First Name'],
		[{ ...known, infoAccess: [] }, 'Contact Information'],
	])('rejects invalid known people %#', (input, message) =>
		expect(() => buildKnownPeopleTask(input)).toThrow(message),
	);

	it.each([
		[receiveCompanySearch, companySearch],
		[receiveCompanyEnrich, {}],
		[receiveKnownPeople, known],
	] as const)('sanitizes prospecting HTTP failures', async (hook, parameters) => {
		const message = await hook
			.call(context(parameters), [], response('Bearer secret body', 503))
			.then(
				() => '',
				(error: unknown) => (error as Error).message,
			);
		expect(message).toContain('HTTP 503');
		expect(message).not.toContain('secret');
	});
});

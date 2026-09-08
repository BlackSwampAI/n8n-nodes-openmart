import { describe, expect, it } from 'vitest';
import { Openmart } from '../nodes/Openmart/Openmart.node';
import {
	assertRequiredControls,
	normalizeResourceLocator,
	requireNonBlankDefaults,
} from './helpers/operation-contract';

describe('reusable node operation contracts', () => {
	it('checks the actual Account operation display contract', () => {
		const description = new Openmart().description;
		expect(() =>
			assertRequiredControls(description, {
				resource: 'account',
				operation: 'getCreditBalance',
				requiredControls: [],
			}),
		).not.toThrow();
		const operation = description.properties.find(
			({ name, displayOptions }) =>
				name === 'operation' && displayOptions?.show?.resource?.includes('account'),
		);
		expect(operation?.displayOptions?.show).toEqual({ resource: ['account'] });
	});

	it('checks the required Business Search query against actual display conditions', () => {
		const description = new Openmart().description;
		expect(() =>
			assertRequiredControls(description, {
				resource: 'business',
				operation: 'search',
				requiredControls: ['query'],
			}),
		).not.toThrow();
		const query = description.properties.find(({ name }) => name === 'query');
		expect(query?.displayOptions?.show).toEqual({
			resource: ['business'],
			operation: ['search'],
		});
	});

	it.each([
		['batch', 'getStatus', 'batchId'],
		['batch', 'getTaskIds', 'batchId'],
		['task', 'get', 'taskId'],
	])('checks required %s/%s controls and visibility', (resource, operation, control) => {
		const description = new Openmart().description;
		expect(() =>
			assertRequiredControls(description, {
				resource,
				operation,
				requiredControls: [control],
			}),
		).not.toThrow();
	});

	it('shows the optional status control only for Batch/Get Task IDs', () => {
		const status = new Openmart().description.properties.find(({ name }) => name === 'status');
		expect(status).toMatchObject({
			name: 'status',
			displayOptions: { show: { resource: ['batch'], operation: ['getTaskIds'] } },
		});
		expect(status?.required).not.toBe(true);
	});

	it.each([
		[
			'companyEmail',
			['domain', 'companyName'],
			['paidCreationNotice', 'domain', 'companyName', 'city', 'state', 'country', 'trackingId'],
		],
		[
			'peopleSearch',
			['domain', 'title', 'maxK', 'infoAccess'],
			[
				'paidCreationNotice',
				'domain',
				'companyName',
				'title',
				'maxK',
				'infoAccess',
				'city',
				'state',
				'country',
				'trackingId',
			],
		],
	] as const)(
		'checks the complete paid creation control surface for %s',
		(resource, requiredControls, visibleControls) => {
			const description = new Openmart().description;
			expect(() =>
				assertRequiredControls(description, {
					resource,
					operation: 'create',
					requiredControls: [...requiredControls],
				}),
			).not.toThrow();
			const visible = description.properties.filter(
				({ displayOptions }) =>
					displayOptions?.show?.resource?.includes(resource) &&
					displayOptions.show.operation?.includes('create'),
			);
			expect(visible.map(({ name }) => name)).toEqual(visibleControls);
			for (const property of visible) {
				expect(property.displayOptions?.show?.operation).toEqual(['create']);
			}
			const companyNameBranches = description.properties.filter(
				({ name }) => name === 'companyName',
			);
			expect(companyNameBranches).toHaveLength(2);
			expect(
				companyNameBranches.filter(({ displayOptions }) =>
					displayOptions?.show?.resource?.includes(resource),
				),
			).toHaveLength(1);
			const companyName = visible.find(({ name }) => name === 'companyName');
			expect(companyName?.required === true).toBe(resource === 'companyEmail');
		},
	);

	it('advertises the exact paid resource and operation identities', () => {
		const description = new Openmart().description;
		const resource = description.properties.find(({ name }) => name === 'resource');
		expect(resource?.options).toEqual(
			expect.arrayContaining([
				{ name: 'Company Email', value: 'companyEmail' },
				{ name: 'People Search', value: 'peopleSearch' },
			]),
		);
		for (const resourceName of ['companyEmail', 'peopleSearch']) {
			const operation = description.properties.find(
				({ name, displayOptions }) =>
					name === 'operation' && displayOptions?.show?.resource?.includes(resourceName),
			);
			expect(operation).toMatchObject({
				default: 'create',
				options: [expect.objectContaining({ name: 'Create', value: 'create' })],
			});
		}
	});

	it('defines safe paid-creation defaults and omits unsupported controls', () => {
		const properties = new Openmart().description.properties;
		expect(properties.find(({ name }) => name === 'title')?.default).toBe(
			'Owner or decision maker',
		);
		expect(properties.find(({ name }) => name === 'maxK')).toMatchObject({
			displayName: 'Max Contacts',
			default: 1,
			typeOptions: { minValue: 1, maxValue: 8 },
		});
		expect(properties.find(({ name }) => name === 'infoAccess')).toMatchObject({
			displayName: 'Contact Information',
			default: ['EMAIL'],
			type: 'multiOptions',
		});
		expect(
			properties.some(({ name }) => ['notify_url', 'notifyUrl', 'version'].includes(name)),
		).toBe(false);
	});

	it('normalizes manual and list-mode resource locator values', () => {
		expect(normalizeResourceLocator(' manual-id ', 'Example')).toBe('manual-id');
		expect(normalizeResourceLocator({ mode: 'list', value: ' listed-id ' }, 'Example')).toBe(
			'listed-id',
		);
		expect(() => normalizeResourceLocator({ mode: 'list' }, 'Example')).toThrow(
			'Example must contain a non-empty list or manual value',
		);
	});

	it('demonstrates a test-contract preflight before a mocked transport call', () => {
		let transportCalls = 0;
		const execute = () => {
			requireNonBlankDefaults({ name: '' }, ['name']);
			transportCalls += 1;
		};
		expect(execute).toThrow('name is required before transport');
		expect(transportCalls).toBe(0);
	});
});

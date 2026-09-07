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
		const operation = description.properties.find(({ name }) => name === 'operation');
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

import type { IExecuteSingleFunctions, IN8nHttpFullResponse } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import {
	prepareCompanyEmail,
	preparePeopleSearch,
	receiveCompanyEmail,
	receivePeopleSearch,
} from '../nodes/Openmart/actions/routing';
import {
	buildCompanyEmailTask,
	buildPeopleSearchTask,
	normalizeDomain,
	parseBatchSubmission,
} from '../nodes/Openmart/shared/creation';

const context = (parameters: Record<string, unknown>) =>
	({ getNodeParameter: (name: string) => parameters[name] }) as unknown as IExecuteSingleFunctions;
const response = (body: unknown, statusCode = 200) =>
	({ body, statusCode, headers: {} }) as IN8nHttpFullResponse;
const submission = {
	batch_id: 'batch_123',
	submit_for: 'legacy_or_current_provider_label',
	status: { processing: 1, completed: 0, errored: 0, total: 1, batch_ready: false },
	provider_extra: { preserved: true },
};
const common = { companyName: '', city: '', state: '', country: '', trackingId: '' };
const people = {
	...common,
	domain: 'Example.COM',
	title: 'Owner or decision maker',
	maxK: 1,
	infoAccess: ['EMAIL'],
};
const company = { ...common, domain: 'Example.COM', companyName: 'Example Inc' };

describe('paid asynchronous creation contracts', () => {
	it.each([
		['example.com', 'example.com'],
		['Sub.Example.com', 'sub.example.com'],
		[' https://Sub.Example.COM:8443/path?q=1#fragment ', 'sub.example.com'],
		['http://example.com/path', 'example.com'],
		['example.com:8443/path', 'example.com'],
		['https://Example.COM./path', 'example.com'],
	])('normalizes %s to %s', (input, expected) => {
		expect(normalizeDomain(input, 'Test')).toBe(expected);
	});

	it.each([
		'',
		'user@example.com',
		'ftp://example.com',
		'https://user:pass@example.com',
		'127.0.0.1',
		'https://[::1]/',
		'localhost',
		'not-a-host',
		'https://-bad.example.com',
	])('rejects invalid domain %j locally', (input) => {
		expect(() => normalizeDomain(input, 'Test')).toThrow('Openmart Test validation failed');
	});

	it('builds the minimum people request as exactly one task', async () => {
		await expect(
			preparePeopleSearch.call(context(people), {
				method: 'POST',
				url: '/api/v1/task/batch/find_people',
				timeout: 90_000,
			}),
		).resolves.toEqual({
			method: 'POST',
			url: '/api/v1/task/batch/find_people',
			timeout: 90_000,
			body: [
				{
					domain: 'example.com',
					title: 'Owner or decision maker',
					max_k: 1,
					info_access: ['EMAIL'],
				},
			],
		});
	});

	it('trims people context, supports boundaries, and removes duplicate info choices', () => {
		expect(
			buildPeopleSearchTask({
				domain: 'https://sub.example.com/path',
				title: ' Founder ',
				maxK: 8,
				infoAccess: ['PHONE', 'EMAIL', 'EMAIL'],
				companyName: ' Example Inc ',
				city: ' Cleveland ',
				state: ' OH ',
				country: ' US ',
				trackingId: ' run-1 ',
			}),
		).toEqual({
			domain: 'sub.example.com',
			title: 'Founder',
			max_k: 8,
			info_access: ['PHONE', 'EMAIL'],
			company_name: 'Example Inc',
			city: 'Cleveland',
			state: 'OH',
			country: 'US',
			tracking_id: 'run-1',
		});
	});

	it.each([
		[{ ...people, title: ' ' }, 'Title'],
		[{ ...people, maxK: 0 }, 'Max Contacts'],
		[{ ...people, maxK: 9 }, 'Max Contacts'],
		[{ ...people, maxK: 1.5 }, 'Max Contacts'],
		[{ ...people, infoAccess: [] }, 'Contact Information'],
		[{ ...people, infoAccess: ['EMAIL', 'OTHER'] }, 'Contact Information'],
		[{ ...people, city: 42 }, 'City'],
	] as const)('rejects invalid people values before transport', async (parameters, message) => {
		await expect(preparePeopleSearch.call(context(parameters), { url: '/people' })).rejects.toThrow(
			message,
		);
	});

	it('builds company email requests and omits blank optional context', async () => {
		await expect(
			prepareCompanyEmail.call(context(company), {
				method: 'POST',
				url: '/company',
				timeout: 90_000,
			}),
		).resolves.toEqual({
			method: 'POST',
			url: '/company',
			timeout: 90_000,
			body: [{ domain: 'example.com', company_name: 'Example Inc' }],
		});
		expect(
			buildCompanyEmailTask({
				domain: 'example.com',
				companyName: ' Example Inc ',
				city: ' Akron ',
				trackingId: ' lead-1 ',
			}),
		).toEqual({
			domain: 'example.com',
			company_name: 'Example Inc',
			city: 'Akron',
			tracking_id: 'lead-1',
		});
	});

	it.each([
		[{ ...company, domain: ' ' }, 'Domain'],
		[{ ...company, companyName: ' ' }, 'Company Name'],
		[{ ...company, trackingId: 42 }, 'Tracking ID'],
	] as const)('rejects invalid company values before transport', async (parameters, message) => {
		await expect(
			prepareCompanyEmail.call(context(parameters), { url: '/company' }),
		).rejects.toThrow(message);
	});

	it('preserves submission envelopes and adds normalized submitted context', async () => {
		await expect(
			receivePeopleSearch.call(context(people), [], response(submission)),
		).resolves.toEqual([
			{
				json: {
					...submission,
					submitted: {
						domain: 'example.com',
						title: 'Owner or decision maker',
						max_k: 1,
						info_access: ['EMAIL'],
					},
				},
			},
		]);
		await expect(
			receiveCompanyEmail.call(context(company), [], response(submission)),
		).resolves.toEqual([
			{
				json: {
					...submission,
					submitted: { domain: 'example.com', company_name: 'Example Inc' },
				},
			},
		]);
	});

	it.each([
		[null, 'batch_id'],
		[[], 'batch_id'],
		[{ batch_id: 'batch', submit_for: 'people' }, 'nested status'],
		[{ ...submission, batch_id: '' }, 'batch_id'],
		[{ ...submission, submit_for: '' }, 'submit_for'],
		[{ ...submission, status: { ...submission.status, completed: -1 } }, 'nested status'],
		[{ ...submission, status: { ...submission.status, total: 1.5 } }, 'nested status'],
		[{ ...submission, status: { ...submission.status, batch_ready: 'no' } }, 'nested status'],
	])('rejects malformed successful submission %#', (payload, message) => {
		expect(() => parseBatchSubmission(payload, 'Create')).toThrow(message);
	});

	it.each([
		[receivePeopleSearch, people],
		[receiveCompanyEmail, company],
	] as const)('sanitizes creation HTTP errors', async (hook, parameters) => {
		for (const status of [400, 401, 402, 429, 503]) {
			const message = await hook
				.call(context(parameters), [], response('Bearer secret provider body', status))
				.then(
					() => '',
					(error: unknown) => (error as Error).message,
				);
			expect(message).toContain(`HTTP ${status}`);
			expect(message).not.toContain('secret');
			expect(message).not.toContain('provider body');
		}
	});
});

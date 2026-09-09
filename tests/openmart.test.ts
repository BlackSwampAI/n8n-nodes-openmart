import type { IExecuteSingleFunctions, IN8nHttpFullResponse } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { OpenmartApi } from '../credentials/OpenmartApi.credentials';
import { Openmart } from '../nodes/Openmart/Openmart.node';
import {
	prepareBatchStatus,
	prepareCompanyEmail,
	preparePeopleSearch,
	prepareSearch,
	prepareTask,
	prepareTaskIds,
	receiveBatchStatus,
	receiveCompanyEmail,
	receiveCreditBalance,
	receiveSearch,
	receivePeopleSearch,
	receiveTask,
	receiveTaskIds,
} from '../nodes/Openmart/actions/routing';

const response = (body: unknown, statusCode = 200) =>
	({ body, statusCode, headers: {} }) as IN8nHttpFullResponse;

describe('Openmart node contract', () => {
	it('advertises the routed operations and fixed production transport', () => {
		const description = new Openmart().description;
		expect(description.icon).toEqual({
			light: 'file:openmart.png',
			dark: 'file:openmart.dark.png',
		});
		expect(new OpenmartApi().icon).toEqual({
			light: 'file:../nodes/Openmart/openmart.png',
			dark: 'file:../nodes/Openmart/openmart.dark.png',
		});
		expect(description.credentials).toEqual([{ name: 'openmartApi', required: true }]);
		expect(description.requestDefaults).toEqual({
			baseURL: 'https://api.openmart.ai',
			json: true,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});
		const advertised = description.properties
			.filter(({ name }) => name === 'operation')
			.flatMap(({ options }) => options ?? []);
		expect(advertised.map((option) => ('value' in option ? option.value : undefined))).toEqual([
			'getStatus',
			'getTaskIds',
			'getCreditBalance',
			'search',
			'get',
			'findEmails',
			'search',
			'enrich',
			'findDecisionMakers',
			'enrich',
		]);
		for (const operation of advertised) expect(operation).toHaveProperty('routing.request');
		const routeByValue = Object.fromEntries(
			advertised
				.slice(0, 5)
				.map((option) => [
					'value' in option ? option.value : '',
					'routing' in option ? option.routing : undefined,
				]),
		);
		expect(routeByValue).toEqual({
			getStatus: {
				request: { method: 'GET', url: '/api/v1/task/batch' },
				send: { preSend: [prepareBatchStatus] },
				output: { postReceive: [receiveBatchStatus] },
			},
			getTaskIds: {
				request: { method: 'GET', url: '/api/v1/task/batch' },
				send: { preSend: [prepareTaskIds] },
				output: { postReceive: [receiveTaskIds] },
			},
			getCreditBalance: {
				request: { method: 'GET', url: '/api/v2/credit-balance' },
				output: { postReceive: [receiveCreditBalance] },
			},
			search: {
				request: { method: 'POST', url: '/api/v1/search' },
				send: { preSend: [prepareSearch] },
				output: { postReceive: [receiveSearch] },
			},
			get: {
				request: { method: 'GET', url: '/api/v1/task' },
				send: { preSend: [prepareTask] },
				output: { postReceive: [receiveTask] },
			},
		});
		const creationRoutes = [advertised[5], advertised[8]].map((option) =>
			option && 'routing' in option ? option.routing : undefined,
		);
		expect(creationRoutes).toEqual([
			{
				request: {
					method: 'POST',
					url: '/api/v1/task/batch/lookup_business_email',
					timeout: 90_000,
				},
				send: { preSend: [prepareCompanyEmail] },
				output: { postReceive: [receiveCompanyEmail] },
			},
			{
				request: { method: 'POST', url: '/api/v1/task/batch/find_people', timeout: 90_000 },
				send: { preSend: [preparePeopleSearch] },
				output: { postReceive: [receivePeopleSearch] },
			},
		]);
		expect(new Openmart()).not.toHaveProperty('execute');
	});

	it('configures password Bearer credentials and harmless balance testing', () => {
		const credential = new OpenmartApi();
		expect(credential.properties).toEqual([
			expect.objectContaining({ name: 'apiKey', typeOptions: { password: true }, required: true }),
		]);
		expect(credential.authenticate).toEqual({
			type: 'generic',
			properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
		});
		expect(credential.test.request).toMatchObject({
			baseURL: 'https://api.openmart.ai',
			url: '/api/v2/credit-balance',
			method: 'GET',
		});
	});

	it('validates balance success and sanitized failures', async () => {
		const context = {} as IExecuteSingleFunctions;
		const balance = {
			period_start: '2026-09-01T00:00:00Z',
			period_end: '2026-10-01T00:00:00Z',
			balance: 0,
		};
		await expect(receiveCreditBalance.call(context, [], response(balance))).resolves.toEqual([
			{ json: balance },
		]);
		await expect(receiveCreditBalance.call(context, [], response({ balance: 0 }))).rejects.toThrow(
			'RFC3339',
		);
		const failure = await receiveCreditBalance
			.call(context, [], response('Bearer secret private provider body', 401))
			.then(
				() => '',
				(error: unknown) => (error as Error).message,
			);
		expect(failure).toContain('HTTP 401');
		expect(failure).not.toContain('secret');
		expect(failure).not.toContain('provider body');
	});
});

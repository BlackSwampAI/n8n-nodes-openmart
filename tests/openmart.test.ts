import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { OpenmartApi } from '../credentials/OpenmartApi.credentials';
import { Openmart } from '../nodes/Openmart/Openmart.node';

describe('Openmart Batch 1 contract', () => {
	it('advertises only Account Get Credit Balance and wires its credential', () => {
		const description = new Openmart().description;
		expect(description.credentials).toEqual([{ name: 'openmartApi', required: true }]);
		const resource = description.properties.find(({ name }) => name === 'resource');
		const operation = description.properties.find(({ name }) => name === 'operation');
		expect(resource?.options).toEqual([{ name: 'Account', value: 'account' }]);
		expect(operation?.options).toEqual([
			expect.objectContaining({ name: 'Get Credit Balance', value: 'getCreditBalance' }),
		]);
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
		expect(credential.test.rules).toBeUndefined();
	});

	it('returns a mocked zero balance unchanged and paired to its input', async () => {
		const input: INodeExecutionData[] = [{ json: { request: 'one' } }];
		const response = {
			period_start: '2026-09-01T00:00:00Z',
			period_end: '2026-10-01T00:00:00Z',
			balance: 0,
		};
		const request = vi.fn().mockResolvedValue(response);
		const context = {
			getInputData: () => input,
			helpers: { httpRequestWithAuthentication: request },
		} as unknown as IExecuteFunctions;

		await expect(new Openmart().execute.call(context)).resolves.toEqual([
			[{ json: response, pairedItem: 0 }],
		]);
		expect(request).toHaveBeenCalledWith('openmartApi', {
			method: 'GET',
			url: 'https://api.openmart.ai/api/v2/credit-balance',
			json: true,
		});
	});
});

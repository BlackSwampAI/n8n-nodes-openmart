import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { Openmart } from '../nodes/Openmart/Openmart.node';
import { parseBatchStatus, parseTask, parseTaskIds } from '../nodes/Openmart/shared/tasks';
import batchStatus from './fixtures/batch-status.json';
import taskResult from './fixtures/task-result.json';

function context(
	parameters: Array<Record<string, unknown>>,
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

describe('Openmart asynchronous retrieval', () => {
	it('gets trimmed batch status with an encoded single path segment and no body', async () => {
		const request = vi.fn().mockResolvedValue({ ...batchStatus, batch_id: 'provider-value' });
		const [results] = await new Openmart().execute.call(
			context([{ resource: 'batch', operation: 'getStatus', batchId: ' batch/a ' }], request),
		);
		expect(request).toHaveBeenCalledWith('openmartApi', {
			method: 'GET',
			url: 'https://api.openmart.ai/api/v1/task/batch/batch%2Fa/status',
			json: true,
		});
		expect(request.mock.calls[0][1]).not.toHaveProperty('body');
		expect(results).toEqual([{ json: { ...batchStatus, batch_id: 'batch/a' }, pairedItem: 0 }]);
	});

	it('gets task IDs with a trimmed optional status and one-to-many pairing', async () => {
		const request = vi.fn().mockResolvedValueOnce([' task_1 ', 'task_2']).mockResolvedValueOnce([]);
		const [results] = await new Openmart().execute.call(
			context(
				[
					{
						resource: 'batch',
						operation: 'getTaskIds',
						batchId: ' batch_1 ',
						status: ' COMPLETED ',
					},
					{ resource: 'batch', operation: 'getTaskIds', batchId: 'batch_2', status: '  ' },
				],
				request,
			),
		);
		expect(request.mock.calls[0][1]).toEqual({
			method: 'GET',
			url: 'https://api.openmart.ai/api/v1/task/batch/batch_1/task_ids',
			qs: { status: 'COMPLETED' },
			json: true,
		});
		expect(request.mock.calls[1][1]).not.toHaveProperty('qs');
		expect(results).toEqual([
			{ json: { task_id: 'task_1', batch_id: 'batch_1' }, pairedItem: 0 },
			{ json: { task_id: 'task_2', batch_id: 'batch_1' }, pairedItem: 0 },
		]);
	});

	it('gets a task while preserving optional/null and unknown fields', async () => {
		const request = vi.fn().mockResolvedValue(taskResult);
		const [results] = await new Openmart().execute.call(
			context([{ resource: 'task', operation: 'get', taskId: ' task/123 ' }], request),
		);
		expect(request).toHaveBeenCalledWith('openmartApi', {
			method: 'GET',
			url: 'https://api.openmart.ai/api/v1/task/task%2F123',
			json: true,
		});
		expect(results).toEqual([{ json: taskResult, pairedItem: 0 }]);
	});

	it.each([
		[{ resource: 'batch', operation: 'getStatus', batchId: ' ' }, 'Batch ID'],
		[{ resource: 'batch', operation: 'getTaskIds', batchId: 'batch', status: 42 }, 'Status'],
		[{ resource: 'task', operation: 'get', taskId: '' }, 'Task ID'],
	])('rejects invalid runtime parameters before transport', async (parameters, message) => {
		const request = vi.fn();
		await expect(new Openmart().execute.call(context([parameters], request))).rejects.toThrow(
			message,
		);
		expect(request).not.toHaveBeenCalled();
	});

	it('validates response collections atomically and permits missing task data', () => {
		expect(() => parseBatchStatus({ ...batchStatus, completed: -1 })).toThrow('nonnegative');
		expect(() => parseTaskIds(['task_1', ''])).toThrow('nonblank');
		expect(() => parseTaskIds({ task_ids: [] })).toThrow('top-level array');
		expect(parseTask({ task_id: 'task', status: 'PROCESSING' })).toEqual({
			task_id: 'task',
			status: 'PROCESSING',
		});
		expect(() => parseTask({ task_id: 'task', status: '', data: null })).toThrow('nonblank');
	});

	it('continues after a sanitized error and preserves later input pairing', async () => {
		const request = vi
			.fn()
			.mockRejectedValueOnce({ statusCode: 401, body: 'secret provider body' })
			.mockResolvedValueOnce(batchStatus);
		const [results] = await new Openmart().execute.call(
			context(
				[
					{ resource: 'batch', operation: 'getStatus', batchId: 'bad' },
					{ resource: 'batch', operation: 'getStatus', batchId: 'good' },
				],
				request,
				true,
			),
		);
		expect(results[0]).toMatchObject({ json: { source: 0 }, pairedItem: 0 });
		expect(results[0].error?.message).toContain('HTTP 401');
		expect(results[0].error?.message).not.toContain('secret provider body');
		expect(results[1]).toEqual({
			json: { ...batchStatus, batch_id: 'good' },
			pairedItem: 1,
		});
	});

	it('uses bounded safe-read retries for transient retrieval failures', async () => {
		const request = vi
			.fn()
			.mockRejectedValueOnce({ statusCode: 503, headers: { 'retry-after': '0' } })
			.mockResolvedValueOnce(batchStatus);
		await new Openmart().execute.call(
			context([{ resource: 'batch', operation: 'getStatus', batchId: 'batch' }], request),
		);
		expect(request).toHaveBeenCalledTimes(2);
	});
});

import type { IExecuteSingleFunctions, IN8nHttpFullResponse, PreSendAction } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import {
	prepareBatchStatus,
	prepareTask,
	prepareTaskIds,
	receiveBatchStatus,
	receiveTask,
	receiveTaskIds,
} from '../nodes/Openmart/actions/routing';
import { parseBatchStatus, parseTask, parseTaskIds } from '../nodes/Openmart/shared/tasks';
import batchStatus from './fixtures/batch-status.json';
import taskResult from './fixtures/task-result.json';

const context = (parameters: Record<string, unknown>) =>
	({ getNodeParameter: (name: string) => parameters[name] }) as unknown as IExecuteSingleFunctions;
const response = (body: unknown, statusCode = 200) =>
	({ body, statusCode, headers: {} }) as IN8nHttpFullResponse;

describe('Openmart asynchronous retrieval declarative hooks', () => {
	it('assembles trimmed, encoded paths and optional status', async () => {
		await expect(
			prepareBatchStatus.call(context({ batchId: ' batch/a ' }), {
				method: 'GET',
				url: '/api/v1/task/batch',
			}),
		).resolves.toEqual({ method: 'GET', url: '/api/v1/task/batch/batch%2Fa/status' });
		await expect(
			prepareTaskIds.call(context({ batchId: ' batch ', status: ' COMPLETED ' }), {
				method: 'GET',
				url: '/api/v1/task/batch',
			}),
		).resolves.toEqual({
			method: 'GET',
			url: '/api/v1/task/batch/batch/task_ids',
			qs: { status: 'COMPLETED' },
		});
		await expect(
			prepareTask.call(context({ taskId: ' task/123 ' }), { method: 'GET', url: '/api/v1/task' }),
		).resolves.toEqual({ method: 'GET', url: '/api/v1/task/task%2F123' });
		for (const request of [
			await prepareBatchStatus.call(context({ batchId: 'batch' }), { method: 'GET', url: '/base' }),
			await prepareTaskIds.call(context({ batchId: 'batch', status: ' ' }), {
				method: 'GET',
				url: '/base',
			}),
			await prepareTask.call(context({ taskId: 'task' }), { method: 'GET', url: '/base' }),
		]) {
			expect(request).not.toHaveProperty('body');
		}
		await expect(
			prepareTaskIds.call(context({ batchId: 'batch', status: ' ' }), {
				method: 'GET',
				url: '/api/v1/task/batch',
			}),
		).resolves.toEqual({ method: 'GET', url: '/api/v1/task/batch/batch/task_ids' });
	});

	it.each([
		[prepareBatchStatus, { batchId: ' ' }, 'Batch ID'],
		[prepareTaskIds, { batchId: 'batch', status: 42 }, 'Status'],
		[prepareTask, { taskId: '' }, 'Task ID'],
	] as Array<[PreSendAction, Record<string, unknown>, string]>)(
		'rejects invalid runtime values in preSend',
		async (hook, parameters, message) => {
			await expect(hook.call(context(parameters), { url: '/base' })).rejects.toThrow(message);
		},
	);

	it('validates and shapes all retrieval responses including empty IDs', async () => {
		await expect(
			receiveBatchStatus.call(context({ batchId: ' batch/a ' }), [], response(batchStatus)),
		).resolves.toEqual([{ json: { ...batchStatus, batch_id: 'batch/a' } }]);
		await expect(
			receiveTaskIds.call(context({ batchId: 'batch' }), [], response([' task_1 ', 'task_2'])),
		).resolves.toEqual([
			{ json: { task_id: 'task_1', batch_id: 'batch' } },
			{ json: { task_id: 'task_2', batch_id: 'batch' } },
		]);
		await expect(
			receiveTaskIds.call(context({ batchId: 'batch' }), [], response([])),
		).resolves.toEqual([]);
		await expect(receiveTask.call(context({}), [], response(taskResult))).resolves.toEqual([
			{ json: taskResult },
		]);
	});

	it('validates payloads atomically and sanitizes HTTP errors', async () => {
		expect(() => parseBatchStatus({ ...batchStatus, completed: -1 })).toThrow('nonnegative');
		expect(() => parseTaskIds(['task_1', ''])).toThrow('nonblank');
		expect(() => parseTaskIds({ task_ids: [] })).toThrow('top-level array');
		expect(parseTask({ task_id: 'task', status: 'PROCESSING' })).toEqual({
			task_id: 'task',
			status: 'PROCESSING',
		});
		expect(() => parseTask({ task_id: 'task', status: ' ' })).toThrow('nonblank');
		const failure = await receiveTask
			.call(context({}), [], response('Bearer secret private provider body', 401))
			.then(
				() => '',
				(error: unknown) => (error as Error).message,
			);
		expect(failure).toContain('HTTP 401');
		expect(failure).not.toContain('secret');
		expect(failure).not.toContain('provider body');
	});
});

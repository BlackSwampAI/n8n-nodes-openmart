import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { mapOpenmartError, parseCreditBalance } from '../shared/request';
import { buildSearchBody, parseSearchResults } from '../shared/search';
import {
	encodedId,
	optionalStatus,
	parseBatchStatus,
	parseTask,
	parseTaskIds,
	requiredId,
} from '../shared/tasks';

function assertSuccessful(response: IN8nHttpFullResponse, operation: string): void {
	if (response.statusCode < 200 || response.statusCode >= 300) {
		throw mapOpenmartError({ statusCode: response.statusCode }, operation);
	}
}

function output(json: IDataObject): INodeExecutionData {
	return { json };
}

export async function prepareSearch(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.body = buildSearchBody({
		query: this.getNodeParameter('query'),
		limit: this.getNodeParameter('resultLimit'),
		location: this.getNodeParameter('location'),
		filters: this.getNodeParameter('filters'),
	});
	return request;
}

export async function receiveSearch(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Search');
	return parseSearchResults(response.body).map(output);
}

export async function prepareBatchStatus(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.url = `${request.url}/${encodedId(this.getNodeParameter('batchId'), 'Batch ID')}/status`;
	return request;
}

export async function receiveBatchStatus(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Get Batch Status');
	const batchId = requiredId(this.getNodeParameter('batchId'), 'Batch ID');
	return [output({ ...parseBatchStatus(response.body), batch_id: batchId })];
}

export async function prepareTaskIds(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.url = `${request.url}/${encodedId(this.getNodeParameter('batchId'), 'Batch ID')}/task_ids`;
	const status = optionalStatus(this.getNodeParameter('status'));
	if (status) request.qs = { ...request.qs, status };
	return request;
}

export async function receiveTaskIds(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Get Task IDs');
	const batchId = requiredId(this.getNodeParameter('batchId'), 'Batch ID');
	return parseTaskIds(response.body).map((taskId) =>
		output({ task_id: taskId, batch_id: batchId }),
	);
}

export async function prepareTask(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.url = `${request.url}/${encodedId(this.getNodeParameter('taskId'), 'Task ID')}`;
	return request;
}

export async function receiveTask(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Get Task');
	return [output(parseTask(response.body))];
}

export async function receiveCreditBalance(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Get Credit Balance');
	return [output(parseCreditBalance(response.body))];
}

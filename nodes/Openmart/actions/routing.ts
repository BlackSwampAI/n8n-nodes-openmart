import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { mapOpenmartError, parseCreditBalance } from '../shared/request';
import {
	buildCompanyEmailTask,
	buildKnownPeopleTask,
	buildPeopleSearchTask,
	parseBatchSubmission,
} from '../shared/creation';
import {
	buildCompanyEnrichBody,
	buildCompanySearchBody,
	parseCompanyEnrich,
	parseCompanySearch,
} from '../shared/prospecting';
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

function creationContext(this: IExecuteSingleFunctions) {
	return {
		domain: this.getNodeParameter('domain'),
		companyName: this.getNodeParameter('companyName'),
		city: this.getNodeParameter('city'),
		state: this.getNodeParameter('state'),
		country: this.getNodeParameter('country'),
		trackingId: this.getNodeParameter('trackingId'),
	};
}

export async function preparePeopleSearch(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.body = [
		buildPeopleSearchTask({
			...creationContext.call(this),
			title: this.getNodeParameter('title'),
			maxK: this.getNodeParameter('maxK'),
			infoAccess: this.getNodeParameter('infoAccess'),
		}),
	];
	return request;
}

export async function receivePeopleSearch(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Person Find Decision Makers');
	const submitted = buildPeopleSearchTask({
		...creationContext.call(this),
		title: this.getNodeParameter('title'),
		maxK: this.getNodeParameter('maxK'),
		infoAccess: this.getNodeParameter('infoAccess'),
	});
	return [
		output({ ...parseBatchSubmission(response.body, 'Person Find Decision Makers'), submitted }),
	];
}

export async function prepareCompanyEmail(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.body = [buildCompanyEmailTask(creationContext.call(this))];
	return request;
}

export async function receiveCompanyEmail(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Company Find Emails');
	const submitted = buildCompanyEmailTask(creationContext.call(this));
	return [output({ ...parseBatchSubmission(response.body, 'Company Find Emails'), submitted })];
}

export async function prepareCompanySearch(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.body = buildCompanySearchBody({
		companySearchTerm: this.getNodeParameter('companySearchTerm'),
		companySearchLocation: this.getNodeParameter('companySearchLocation'),
		ownershipType: this.getNodeParameter('ownershipType'),
		storeCount: this.getNodeParameter('storeCount'),
		hasStaffInfo: this.getNodeParameter('hasStaffInfo'),
		hasBusinessEmail: this.getNodeParameter('hasBusinessEmail'),
		hasBusinessPhone: this.getNodeParameter('hasBusinessPhone'),
		companySearchLimit: this.getNodeParameter('companySearchLimit'),
	});
	return request;
}

export async function receiveCompanySearch(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Company Search');
	return parseCompanySearch(response.body).map(output);
}

export async function prepareCompanyEnrich(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.body = buildCompanyEnrichBody({
		website: this.getNodeParameter('website'),
		socialMediaLink: this.getNodeParameter('socialMediaLink'),
		companyEnrichLocation: this.getNodeParameter('companyEnrichLocation'),
		companyEnrichLimit: this.getNodeParameter('companyEnrichLimit'),
	});
	return request;
}

export async function receiveCompanyEnrich(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Company Enrich');
	return parseCompanyEnrich(response.body).map(output);
}

function knownPeopleContext(this: IExecuteSingleFunctions) {
	return {
		domain: this.getNodeParameter('domain'),
		companyName: this.getNodeParameter('companyName'),
		city: this.getNodeParameter('city'),
		state: this.getNodeParameter('state'),
		country: this.getNodeParameter('country'),
		trackingId: this.getNodeParameter('trackingId'),
		people: this.getNodeParameter('people'),
		infoAccess: this.getNodeParameter('infoAccess'),
	};
}

export async function prepareKnownPeople(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	request.body = [buildKnownPeopleTask(knownPeopleContext.call(this))];
	return request;
}

export async function receiveKnownPeople(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccessful(response, 'Person Enrich');
	const submitted = buildKnownPeopleTask(knownPeopleContext.call(this));
	return [output({ ...parseBatchSubmission(response.body, 'Person Enrich'), submitted })];
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

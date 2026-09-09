import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { mapOpenmartError, OpenmartRequestError, parseCreditBalance } from '../shared/request';
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

const SEARCH_PAGE_SIZE = 100;
const MAX_SEARCH_RESULTS = 1_000;
const MAX_SEARCH_PAGES = 100;

function paginationError(operation: string, message: string): OpenmartRequestError {
	return new OpenmartRequestError(
		`Openmart ${operation} pagination failed: ${message}.`,
		undefined,
		'invalid-response',
	);
}

function paginationValidationError(operation: string, message: string): OpenmartRequestError {
	return new OpenmartRequestError(
		`Openmart ${operation} validation failed: ${message}.`,
		undefined,
		'validation',
	);
}

function totalSearchLimit(
	context: IExecuteSingleFunctions,
	parameter: 'resultLimit' | 'companySearchLimit',
	operation: string,
): number | undefined {
	if (context.getNodeParameter('returnAll') === true) return undefined;
	const value = context.getNodeParameter(parameter);
	if (
		typeof value !== 'number' ||
		!Number.isInteger(value) ||
		value < 1 ||
		value > MAX_SEARCH_RESULTS
	) {
		throw paginationValidationError(
			operation,
			`Limit must be an integer from 1 through ${MAX_SEARCH_RESULTS}`,
		);
	}
	return value;
}

function pageSize(total: number | undefined, emitted = 0): number {
	return Math.min(SEARCH_PAGE_SIZE, total === undefined ? SEARCH_PAGE_SIZE : total - emitted);
}

function requestWithBody(
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
	body: IDataObject,
): DeclarativeRestApiSettings.ResultOptions {
	return { ...requestOptions, options: { ...requestOptions.options, body } };
}

function cursorKey(cursor: unknown, operation: string): string | undefined {
	if (cursor === undefined || cursor === null || cursor === '') return undefined;
	if (Array.isArray(cursor) && cursor.length === 0) return undefined;
	if ((typeof cursor !== 'string' || !cursor.trim()) && !Array.isArray(cursor)) {
		throw paginationError(operation, 'the API returned an invalid cursor');
	}
	return JSON.stringify(cursor);
}

function businessCursor(items: INodeExecutionData[]): unknown {
	const cursor = items[items.length - 1]?.json.cursor;
	if (cursor === undefined || cursor === null || (Array.isArray(cursor) && cursor.length === 0)) {
		return undefined;
	}
	if (
		!Array.isArray(cursor) ||
		cursor.length !== 2 ||
		typeof cursor[0] !== 'number' ||
		!Number.isFinite(cursor[0]) ||
		typeof cursor[1] !== 'string' ||
		!cursor[1].trim()
	) {
		throw paginationError('Business Search', 'the API returned an invalid cursor');
	}
	return cursor;
}

function companyCursor(items: INodeExecutionData[]): unknown {
	const cursor = items[items.length - 1]?.json.openmart_next_cursor;
	if (cursor === undefined || cursor === null || cursor === '') return undefined;
	if (typeof cursor !== 'string') {
		throw paginationError('Company Search', 'the API returned an invalid cursor');
	}
	return cursor.trim() ? cursor : undefined;
}

async function paginateCursorSearch(
	context: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
	total: number | undefined,
	operation: string,
	nextCursor: (items: INodeExecutionData[]) => unknown,
	nextBody: (body: IDataObject, cursor: unknown, limit: number) => IDataObject,
	identity: (item: INodeExecutionData) => unknown,
): Promise<INodeExecutionData[]> {
	const emitted: INodeExecutionData[] = [];
	const seen = new Set<string>();
	const emittedIds = new Set<string>();
	let current = requestOptions;
	let pages = 0;
	while (true) {
		pages += 1;
		const page = await context.makeRoutingRequest(current);
		if (page.length === 0) return emitted;
		for (const item of page) {
			const candidateId = identity(item);
			const id = typeof candidateId === 'string' && candidateId ? candidateId : undefined;
			if (id && emittedIds.has(id)) continue;
			if (id) emittedIds.add(id);
			emitted.push(item);
			if (total !== undefined && emitted.length >= total) break;
		}
		if (total !== undefined && emitted.length >= total) return emitted;
		const cursor = nextCursor(page);
		const key = cursorKey(cursor, operation);
		if (key === undefined) return emitted;
		if (seen.has(key)) throw paginationError(operation, 'the API returned a repeated cursor');
		seen.add(key);
		if (pages >= MAX_SEARCH_PAGES) {
			throw paginationError(operation, `the ${MAX_SEARCH_PAGES}-page safety limit was reached`);
		}
		const body = current.options.body;
		if (typeof body !== 'object' || body === null || Array.isArray(body)) {
			throw paginationError(operation, 'the next request body could not be constructed');
		}
		current = requestWithBody(
			current,
			nextBody(body as IDataObject, cursor, pageSize(total, emitted.length)),
		);
	}
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
	const limit = totalSearchLimit(this, 'companySearchLimit', 'Company Search');
	request.body = buildCompanySearchBody({
		companySearchTerm: this.getNodeParameter('companySearchTerm'),
		companySearchLocation: this.getNodeParameter('companySearchLocation'),
		ownershipType: this.getNodeParameter('ownershipType'),
		storeCount: this.getNodeParameter('storeCount'),
		hasStaffInfo: this.getNodeParameter('hasStaffInfo'),
		hasBusinessEmail: this.getNodeParameter('hasBusinessEmail'),
		hasBusinessPhone: this.getNodeParameter('hasBusinessPhone'),
		companySearchLimit: pageSize(limit),
	});
	return request;
}

export async function paginateCompanySearch(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const total = totalSearchLimit(this, 'companySearchLimit', 'Company Search');
	return paginateCursorSearch(
		this,
		requestOptions,
		total,
		'Company Search',
		companyCursor,
		(body, cursor, limit) => ({
			...body,
			pagination: {
				...((body.pagination as IDataObject | undefined) ?? {}),
				limit,
				encoded_cursor: cursor as IDataObject[string],
			},
		}),
		(item) => item.json.brand_id,
	);
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
	const limit = totalSearchLimit(this, 'resultLimit', 'Business Search');
	request.body = buildSearchBody({
		query: this.getNodeParameter('query'),
		limit: pageSize(limit),
		location: this.getNodeParameter('location'),
		filters: this.getNodeParameter('filters'),
	});
	return request;
}

export async function paginateSearch(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const total = totalSearchLimit(this, 'resultLimit', 'Business Search');
	return paginateCursorSearch(
		this,
		requestOptions,
		total,
		'Business Search',
		businessCursor,
		(body, cursor, limit) => ({ ...body, limit, cursor: cursor as IDataObject[string] }),
		(item) => item.json.id,
	);
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

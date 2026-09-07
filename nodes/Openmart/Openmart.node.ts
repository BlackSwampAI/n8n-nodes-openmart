import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { OPENMART_API_ORIGIN, openmartRequest, parseCreditBalance } from './shared/request';
import { buildSearchBody, parseSearchResults } from './shared/search';
import {
	encodedId,
	optionalStatus,
	parseBatchStatus,
	parseTask,
	parseTaskIds,
	requiredId,
} from './shared/tasks';

export class Openmart implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Openmart',
		name: 'openmart',
		icon: { light: 'file:openmart.svg', dark: 'file:openmart.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the Openmart API',
		defaults: { name: 'Openmart' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'openmartApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Batch', value: 'batch' },
					{ name: 'Business', value: 'business' },
					{ name: 'Task', value: 'task' },
				],
				default: 'account',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['batch'] } },
				options: [
					{
						name: 'Get Status',
						value: 'getStatus',
						description: 'Get progress counts and readiness for an existing batch',
						action: 'Get batch status',
					},
					{
						name: 'Get Task IDs',
						value: 'getTaskIds',
						description: 'Get task IDs from an existing batch',
						action: 'Get tasks from a batch',
					},
				],
				default: 'getStatus',
			},
			{
				displayName: 'Batch ID',
				name: 'batchId',
				type: 'string',
				default: '',
				required: true,
				description: 'ID of the existing Openmart batch',
				displayOptions: {
					show: { resource: ['batch'], operation: ['getStatus', 'getTaskIds'] },
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Optional task status filter, for example COMPLETED',
				displayOptions: { show: { resource: ['batch'], operation: ['getTaskIds'] } },
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get Credit Balance',
						value: 'getCreditBalance',
						description: 'Get the current credit balance and billing period',
						action: 'Get credit balance',
					},
				],
				default: 'getCreditBalance',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['business'] } },
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Find businesses matching a query',
						action: 'Search businesses',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['task'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get an existing task and its result data',
						action: 'Get a task',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
				required: true,
				description: 'ID of the existing Openmart task',
				displayOptions: { show: { resource: ['task'], operation: ['get'] } },
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				description: 'Natural-language description of businesses to find',
				displayOptions: { show: { resource: ['business'], operation: ['search'] } },
			},
			{
				displayName: 'Limit',
				name: 'resultLimit',
				type: 'number',
				default: 10,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Maximum number of businesses to return for this input item',
				displayOptions: { show: { resource: ['business'], operation: ['search'] } },
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Location',
				typeOptions: { multipleValues: false },
				displayOptions: { show: { resource: ['business'], operation: ['search'] } },
				options: [
					{
						displayName: 'Location',
						name: 'locationValues',
						values: [
							{ displayName: 'Country', name: 'country', type: 'string', default: '' },
							{ displayName: 'State', name: 'state', type: 'string', default: '' },
							{ displayName: 'City', name: 'city', type: 'string', default: '' },
						],
					},
				],
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				default: {},
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['business'], operation: ['search'] } },
				options: [
					{
						displayName: 'Has Contact Info',
						name: 'has_contact_info',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Has Valid Website',
						name: 'has_valid_website',
						type: 'boolean',
						default: true,
					},
					{ displayName: 'Has Website', name: 'has_website', type: 'boolean', default: true },
					{
						displayName: 'Minimum Locations',
						name: 'min_locations',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1 },
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const request = (credentialType: string, options: IHttpRequestOptions) =>
					this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);
				if (resource === 'batch' && (operation === 'getStatus' || operation === 'getTaskIds')) {
					const batchId = requiredId(this.getNodeParameter('batchId', itemIndex), 'Batch ID');
					const path = encodedId(batchId, 'Batch ID');
					const status =
						operation === 'getTaskIds'
							? optionalStatus(this.getNodeParameter('status', itemIndex, ''))
							: undefined;
					const response = await openmartRequest({
						request,
						operation: operation === 'getStatus' ? 'Get Batch Status' : 'Get Task IDs',
						options: {
							method: 'GET',
							url: `${OPENMART_API_ORIGIN}/api/v1/task/batch/${path}/${operation === 'getStatus' ? 'status' : 'task_ids'}`,
							...(status ? { qs: { status } } : {}),
							json: true,
						},
						retryMode: 'safe-read',
					});
					if (operation === 'getStatus') {
						results.push({
							json: { ...parseBatchStatus(response), batch_id: batchId },
							pairedItem: itemIndex,
						});
					} else {
						for (const taskId of parseTaskIds(response))
							results.push({ json: { task_id: taskId, batch_id: batchId }, pairedItem: itemIndex });
					}
					continue;
				}
				if (resource === 'task' && operation === 'get') {
					const taskId = encodedId(this.getNodeParameter('taskId', itemIndex), 'Task ID');
					const response = await openmartRequest({
						request,
						operation: 'Get Task',
						options: {
							method: 'GET',
							url: `${OPENMART_API_ORIGIN}/api/v1/task/${taskId}`,
							json: true,
						},
						retryMode: 'safe-read',
					});
					results.push({ json: parseTask(response), pairedItem: itemIndex });
					continue;
				}
				if (resource === 'business' && operation === 'search') {
					const body = buildSearchBody({
						query: this.getNodeParameter('query', itemIndex),
						limit: this.getNodeParameter('resultLimit', itemIndex, 10),
						location: this.getNodeParameter('location', itemIndex, {}),
						filters: this.getNodeParameter('filters', itemIndex, {}),
					});
					const response = await openmartRequest({
						request,
						operation: 'Search',
						options: {
							method: 'POST',
							url: `${OPENMART_API_ORIGIN}/api/v1/search`,
							body,
							json: true,
						},
						retryMode: 'none',
					});
					for (const business of parseSearchResults(response))
						results.push({ json: business, pairedItem: itemIndex });
					continue;
				}
				if (resource !== 'account' || operation !== 'getCreditBalance') {
					throw new NodeOperationError(
						this.getNode(),
						`Openmart operation is not supported: ${resource}/${operation}.`,
						{ itemIndex },
					);
				}
				const response = await openmartRequest({
					request,
					operation: 'Get Credit Balance',
					options: {
						method: 'GET',
						url: `${OPENMART_API_ORIGIN}/api/v2/credit-balance`,
						json: true,
					},
					retryMode: 'safe-read',
				});
				results.push({ json: parseCreditBalance(response), pairedItem: itemIndex });
			} catch (error) {
				const nodeError =
					error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex });
				if (!this.continueOnFail()) throw nodeError;
				results.push({ json: items[itemIndex].json, error: nodeError, pairedItem: itemIndex });
			}
		}

		return [results];
	}
}

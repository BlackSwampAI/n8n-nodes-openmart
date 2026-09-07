import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { OPENMART_API_ORIGIN, openmartRequest, parseCreditBalance } from './shared/request';
import { buildSearchBody, parseSearchResults } from './shared/search';

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
					{ name: 'Business', value: 'business' },
				],
				default: 'account',
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
				if (resource === 'business' && operation === 'search') {
					const body = buildSearchBody({
						query: this.getNodeParameter('query', itemIndex),
						limit: this.getNodeParameter('resultLimit', itemIndex, 10),
						location: this.getNodeParameter('location', itemIndex, {}),
						filters: this.getNodeParameter('filters', itemIndex, {}),
					});
					const response = await openmartRequest({
						request: (credentialType, options) =>
							this.helpers.httpRequestWithAuthentication.call(this, credentialType, options),
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
					request: (credentialType, options) =>
						this.helpers.httpRequestWithAuthentication.call(this, credentialType, options),
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

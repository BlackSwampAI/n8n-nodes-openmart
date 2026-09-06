import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { OPENMART_API_ORIGIN, openmartRequest, parseCreditBalance } from './shared/request';

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
				options: [{ name: 'Account', value: 'account' }],
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
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
				const nodeError = new NodeOperationError(this.getNode(), error as Error, { itemIndex });
				if (!this.continueOnFail()) throw nodeError;
				results.push({ json: items[itemIndex].json, error: nodeError, pairedItem: itemIndex });
			}
		}

		return [results];
	}
}

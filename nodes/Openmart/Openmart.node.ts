import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const API_ORIGIN = 'https://api.openmart.ai';

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
			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'openmartApi', {
				method: 'GET',
				url: `${API_ORIGIN}/api/v2/credit-balance`,
				json: true,
			});
			results.push({ json: response as IDataObject, pairedItem: itemIndex });
		}

		return [results];
	}
}

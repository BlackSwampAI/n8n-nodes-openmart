import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OpenmartApi implements ICredentialType {
	name = 'openmartApi';

	displayName = 'Openmart API';

	icon: Icon = {
		light: 'file:../nodes/Openmart/openmart.png',
		dark: 'file:../nodes/Openmart/openmart.dark.png',
	};

	documentationUrl = 'https://app.openmart.com/api-docs/quickstart';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.openmart.ai',
			url: '/api/v2/credit-balance',
			method: 'GET',
		},
	};
}

/* eslint-disable @n8n/community-nodes/no-restricted-imports -- opt-in disposable n8n integration probe */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @n8n/community-nodes/no-restricted-globals -- explicit opt-in test guard
const externalN8nPath = process.env.OPENMART_N8N_PACKAGE_PATH;
const integrationIt = externalN8nPath ? it : it.skip;

interface ActualHelperModule {
	httpRequestWithAuthentication: (
		this: Record<string, unknown>,
		credentialType: string,
		options: Record<string, unknown>,
		workflow: Record<string, unknown>,
		node: Record<string, unknown>,
		additionalData: Record<string, unknown>,
	) => Promise<unknown>;
}

describe('n8n 2.37.10 authenticated GET-body integration', () => {
	integrationIt('applies Bearer authentication but drops the GET body', async () => {
		if (!externalN8nPath) throw new Error('OPENMART_N8N_PACKAGE_PATH guard was not applied');
		const require = createRequire(import.meta.url);
		const packageJson = require(join(externalN8nPath, 'package.json')) as { version: string };
		expect(packageJson.version).toBe('2.37.10');
		const n8nCorePath = join(
			dirname(externalN8nPath),
			'n8n-core/dist/execution-engine/node-execution-context/utils/request-helpers/authentication.js',
		);
		const { httpRequestWithAuthentication } = require(n8nCorePath) as ActualHelperModule;

		const recorded = new Promise<{ method?: string; body: string; authorization?: string }>(
			(resolve, reject) => {
				const server = createServer((incoming, outgoing) => {
					let body = '';
					incoming.setEncoding('utf8');
					incoming.on('data', (chunk: string) => (body += chunk));
					incoming.on('end', () => {
						resolve({
							method: incoming.method,
							body,
							authorization: incoming.headers.authorization,
						});
						outgoing.setHeader('content-type', 'application/json');
						outgoing.end('{}');
						server.close();
					});
				});
				server.on('error', reject);
				server.listen(0, '127.0.0.1', async () => {
					const address = server.address();
					if (!address || typeof address === 'string')
						return reject(new Error('Expected TCP address'));
					const node = {
						name: 'Openmart probe',
						type: 'openmart',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					};
					const context = {
						helpers: {},
						getCredentials: async () => ({ apiKey: 'fake-loopback-key' }),
						getNode: () => node,
					};
					const additionalData = {
						credentialsHelper: {
							getParentTypes: () => [],
							preAuthentication: async () => undefined,
							authenticate: async (
								credentials: { apiKey: string },
								_credentialType: string,
								requestOptions: { headers?: Record<string, string> },
							) => ({
								...requestOptions,
								headers: {
									...requestOptions.headers,
									Authorization: `Bearer ${credentials.apiKey}`,
								},
							}),
						},
					};
					try {
						await httpRequestWithAuthentication.call(
							context,
							'openmartApi',
							{
								method: 'GET',
								url: `http://127.0.0.1:${address.port}/record`,
								body: ['openmart-id-1'],
								json: true,
							},
							{},
							node,
							additionalData,
						);
					} catch (error) {
						server.close();
						reject(error);
					}
				});
			},
		);

		await expect(recorded).resolves.toEqual({
			method: 'GET',
			body: '',
			authorization: 'Bearer fake-loopback-key',
		});
	});
});

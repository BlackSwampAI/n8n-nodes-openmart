/* eslint-disable @n8n/community-nodes/no-restricted-imports -- loopback wire-level probe */
import { createServer, request } from 'node:http';
import { describe, expect, it } from 'vitest';

describe('GET JSON-array body wire probe', () => {
	it('records the array body sent by the Node HTTP client', async () => {
		const received = new Promise<{ method?: string; body: string }>((resolve, reject) => {
			const server = createServer((incoming, outgoing) => {
				let body = '';
				incoming.setEncoding('utf8');
				incoming.on('data', (chunk: string) => (body += chunk));
				incoming.on('end', () => {
					resolve({ method: incoming.method, body });
					outgoing.end('ok');
					server.close();
				});
			});
			server.on('error', reject);
			server.listen(0, '127.0.0.1', () => {
				const address = server.address();
				if (!address || typeof address === 'string') throw new Error('Expected TCP address');
				const body = JSON.stringify(['openmart-id-1']);
				const outgoing = request({
					host: '127.0.0.1',
					port: address.port,
					path: '/record',
					method: 'GET',
					headers: {
						'content-type': 'application/json',
						'content-length': Buffer.byteLength(body),
					},
				});
				outgoing.end(body);
			});
		});

		await expect(received).resolves.toEqual({ method: 'GET', body: '["openmart-id-1"]' });
	});
});

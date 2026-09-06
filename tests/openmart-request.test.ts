import { describe, expect, it, vi } from 'vitest';
import {
	MAX_RETRY_DELAY_MS,
	mapOpenmartError,
	openmartRequest,
	parseCreditBalance,
	retryAfterMilliseconds,
} from '../nodes/Openmart/shared/request';

const options = { method: 'GET' as const, url: 'https://api.openmart.ai/api/v2/credit-balance' };

describe('Openmart request hardening', () => {
	it('accepts a valid zero balance and rejects malformed successful payloads', () => {
		expect(
			parseCreditBalance({
				period_start: '2026-09-01T00:00:00Z',
				period_end: '2026-10-01T00:00:00+00:00',
				balance: 0,
			}),
		).toMatchObject({ balance: 0 });
		for (const malformed of [
			{ period_start: 'bad', period_end: '2026-10-01T00:00:00Z', balance: 1 },
			{ period_start: '2026-09-01T00:00:00Z', period_end: 4, balance: 1 },
			{ period_start: '2026-09-01T00:00:00Z', period_end: '2026-10-01T00:00:00Z', balance: 0.5 },
		]) {
			expect(() => parseCreditBalance(malformed)).toThrow('expected an integer balance');
		}
	});

	it.each([
		[400, 'validation'],
		[401, 'authentication'],
		[402, 'credit-limit'],
		[403, 'permission'],
		[404, 'not-found'],
		[422, 'validation'],
	])('does not retry permanent HTTP %i failures', async (status, category) => {
		const secret = 'Bearer super-secret-key';
		const request = vi.fn().mockRejectedValue({
			statusCode: status,
			message: `${secret} raw provider body`,
			response: { body: { secret }, headers: { Authorization: secret } },
		});
		const caught = await openmartRequest({
			request,
			operation: 'Get Credit Balance',
			options,
			retryMode: 'safe-read',
			sleep: vi.fn(),
		}).catch((error: unknown) => error);
		expect(request).toHaveBeenCalledTimes(1);
		expect(caught).toMatchObject({ statusCode: status, category });
		expect(String(caught)).not.toContain('super-secret-key');
		expect(String(caught)).not.toContain('raw provider body');
	});

	it('retries safe reads up to three total attempts and can recover', async () => {
		const request = vi
			.fn()
			.mockRejectedValueOnce({ statusCode: 500 })
			.mockRejectedValueOnce({ code: 'ETIMEDOUT' })
			.mockResolvedValue({ balance: 0 });
		const sleep = vi.fn().mockResolvedValue(undefined);
		await expect(
			openmartRequest({
				request,
				operation: 'Get Credit Balance',
				options,
				retryMode: 'safe-read',
				sleep,
			}),
		).resolves.toEqual({ balance: 0 });
		expect(request).toHaveBeenCalledTimes(3);
		expect(sleep).toHaveBeenCalledTimes(2);
	});

	it('reports exhaustion after bounded transient retries', async () => {
		const request = vi.fn().mockRejectedValue({ response: { status: 503 } });
		await expect(
			openmartRequest({
				request,
				operation: 'Get Credit Balance',
				options,
				retryMode: 'safe-read',
				sleep: vi.fn(),
			}),
		).rejects.toMatchObject({ statusCode: 503, category: 'transient' });
		expect(request).toHaveBeenCalledTimes(3);
	});

	it('supports explicit non-retry mode for future side-effecting calls', async () => {
		const request = vi.fn().mockRejectedValue({ statusCode: 503 });
		await expect(
			openmartRequest({ request, operation: 'Create', options, retryMode: 'none', sleep: vi.fn() }),
		).rejects.toMatchObject({ statusCode: 503 });
		expect(request).toHaveBeenCalledTimes(1);
	});

	it('honors Retry-After seconds and dates with a cap', () => {
		expect(retryAfterMilliseconds({ response: { headers: { 'retry-after': '2.5' } } })).toBe(2500);
		expect(
			retryAfterMilliseconds(
				{ response: { headers: { 'Retry-After': 'Wed, 21 Oct 2037 07:28:00 GMT' } } },
				0,
			),
		).toBe(MAX_RETRY_DELAY_MS);
	});

	it('uses the capped Retry-After delay during safe-read retries', async () => {
		const request = vi
			.fn()
			.mockRejectedValueOnce({ statusCode: 429, response: { headers: { 'retry-after': '99' } } })
			.mockResolvedValue({ balance: 0 });
		const sleep = vi.fn().mockResolvedValue(undefined);
		await openmartRequest({
			request,
			operation: 'Get Credit Balance',
			options,
			retryMode: 'safe-read',
			sleep,
		});
		expect(sleep).toHaveBeenCalledWith(MAX_RETRY_DELAY_MS);
	});

	it('maps unknown errors without exposing implementation text', () => {
		const mapped = mapOpenmartError(new Error('Authorization: Bearer secret stack'), 'Balance');
		expect(mapped.message).toBe(
			'Openmart Balance failed: The request could not be completed safely.',
		);
		expect(mapped.stack).not.toContain('Bearer secret');
	});
});

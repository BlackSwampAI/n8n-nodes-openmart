import { describe, expect, it } from 'vitest';
import { mapOpenmartError, parseCreditBalance } from '../nodes/Openmart/shared/request';

describe('Openmart response hardening', () => {
	it('accepts zero balances and rejects malformed payloads', () => {
		expect(
			parseCreditBalance({
				period_start: '2026-09-01T00:00:00Z',
				period_end: '2026-10-01T00:00:00+00:00',
				balance: 0,
			}),
		).toMatchObject({ balance: 0 });
		expect(() => parseCreditBalance({ balance: 0, period_start: 'bad' })).toThrow(
			'expected an integer balance',
		);
	});

	it.each([
		[400, 'validation'],
		[401, 'authentication'],
		[402, 'credit-limit'],
		[403, 'permission'],
		[404, 'not-found'],
		[422, 'validation'],
		[429, 'rate-limit'],
		[503, 'transient'],
	] as const)('maps HTTP %i without exposing provider data', (status, category) => {
		const mapped = mapOpenmartError(
			{ statusCode: status, body: 'Bearer super-secret provider body' },
			'Balance',
		);
		expect(mapped).toMatchObject({ statusCode: status, category });
		expect(mapped.message).not.toContain('super-secret');
		expect(mapped.message).not.toContain('provider body');
	});

	it('maps unknown failures without exposing implementation text', () => {
		const mapped = mapOpenmartError(new Error('Authorization: Bearer secret stack'), 'Balance');
		expect(mapped.message).toBe(
			'Openmart Balance failed: The request could not be completed safely.',
		);
		expect(mapped.stack).not.toContain('Bearer secret');
	});
});

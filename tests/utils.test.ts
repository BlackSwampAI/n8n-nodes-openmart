import { describe, expect, it } from 'vitest';
import { Openmart } from '../nodes/Openmart/Openmart.node';

describe('Openmart fixed transport surface', () => {
	it('does not expose an arbitrary base URL', () => {
		const description = new Openmart().description;
		expect(description.properties.map(({ name }) => name)).toEqual([
			'resource',
			'operation',
			'batchId',
			'status',
			'operation',
			'operation',
			'operation',
			'operation',
			'operation',
			'paidCreationNotice',
			'domain',
			'companyName',
			'companyName',
			'title',
			'maxK',
			'infoAccess',
			'city',
			'state',
			'country',
			'trackingId',
			'taskId',
			'query',
			'resultLimit',
			'location',
			'filters',
		]);
		expect(JSON.stringify(description)).not.toContain('baseUrl');
	});
});

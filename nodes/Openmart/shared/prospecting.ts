import type { IDataObject } from 'n8n-workflow';
import { OpenmartRequestError } from './request';
import { parseSearchResults } from './search';

function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function error(operation: string, message: string): OpenmartRequestError {
	return new OpenmartRequestError(
		`Openmart ${operation} validation failed: ${message}.`,
		undefined,
		'validation',
	);
}

function optional(value: unknown, label: string, operation: string): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') throw error(operation, `${label} must be a string`);
	return value.trim() || undefined;
}

function integer(
	value: unknown,
	label: string,
	minimum: number,
	maximum: number,
	operation: string,
): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
		throw error(operation, `${label} must be an integer from ${minimum} through ${maximum}`);
	}
	return value;
}

function location(
	value: unknown,
	operation: string,
	defaultCountry?: string,
): IDataObject | undefined {
	const values = record(record(value)?.locationValues);
	const country = optional(values?.country, 'Country', operation) ?? defaultCountry;
	const state = optional(values?.state, 'State', operation);
	const city = optional(values?.city, 'City', operation);
	if (!country && !state && !city) return undefined;
	if (!country) throw error(operation, 'Country is required when location is provided');
	return { country, ...(state ? { state } : {}), ...(city ? { city } : {}) };
}

function triState(value: unknown, label: string, operation: string): boolean | undefined {
	if (value === '' || value === undefined || value === null) return undefined;
	if (value === true || value === false) return value;
	throw error(operation, `${label} must be Any, Yes, or No`);
}

export function buildCompanySearchBody(input: Record<string, unknown>): IDataObject {
	const operation = 'Company Search';
	const searchTerm = optional(input.companySearchTerm, 'Search Term', operation);
	const place = location(input.companySearchLocation, operation, 'US') as IDataObject;
	const ownership = input.ownershipType;
	if (
		!Array.isArray(ownership) ||
		ownership.some((v) => !['INDEPENDENT', 'FAMILY', 'FRANCHISE', 'CHAIN'].includes(String(v)))
	) {
		throw error(operation, 'Ownership Type contains an unsupported value');
	}
	const storeCount = record(input.storeCount);
	const optionalStoreCount = (value: unknown): unknown =>
		value === '' || value === undefined || value === null ? undefined : value;
	const minimum = optionalStoreCount(storeCount?.minimumStores);
	const maximum = optionalStoreCount(storeCount?.maximumStores);
	if (minimum !== undefined)
		integer(minimum, 'Minimum Store Count', 0, Number.MAX_SAFE_INTEGER, operation);
	if (maximum !== undefined)
		integer(maximum, 'Maximum Store Count', 0, Number.MAX_SAFE_INTEGER, operation);
	if (typeof minimum === 'number' && typeof maximum === 'number' && minimum > maximum) {
		throw error(operation, 'Minimum Store Count must not exceed Maximum Store Count');
	}
	const tri = {
		has_staff_info: triState(input.hasStaffInfo, 'Has Staff Info', operation),
		has_business_email: triState(input.hasBusinessEmail, 'Has Business Email', operation),
		has_business_phone_number: triState(input.hasBusinessPhone, 'Has Business Phone', operation),
	};
	const narrowed = Boolean(
		searchTerm ||
		ownership.length ||
		minimum !== undefined ||
		maximum !== undefined ||
		Object.values(tri).some((v) => v !== undefined) ||
		place.country !== 'US' ||
		place.state ||
		place.city,
	);
	if (!narrowed)
		throw error(
			operation,
			'enter a Search Term or at least one narrowing filter beyond the default country',
		);
	const searchParam: IDataObject = { location: [place] };
	if (searchTerm) searchParam.search_term = searchTerm;
	if (ownership.length) searchParam.ownership_type = ownership;
	if (minimum !== undefined || maximum !== undefined)
		searchParam.num_stores = [
			{
				...(minimum !== undefined ? { ge: minimum } : {}),
				...(maximum !== undefined ? { le: maximum } : {}),
			},
		];
	for (const [key, value] of Object.entries(tri)) if (value !== undefined) searchParam[key] = value;
	return {
		search_param: searchParam,
		pagination: { limit: integer(input.companySearchLimit, 'Limit', 1, 100, operation) },
		estimate_total: false,
	};
}

export function parseCompanySearch(value: unknown): IDataObject[] {
	const wrapper = record(value);
	if (
		!wrapper ||
		!Array.isArray(wrapper.data) ||
		(wrapper.encoded_cursor !== undefined && typeof wrapper.encoded_cursor !== 'string')
	) {
		throw new OpenmartRequestError(
			'Openmart Company Search returned an invalid response: expected an object with data array and optional encoded_cursor string.',
			undefined,
			'invalid-response',
		);
	}
	if (wrapper.data.some((entry) => !record(entry)))
		throw new OpenmartRequestError(
			'Openmart Company Search returned an invalid response: every data item must be an object.',
			undefined,
			'invalid-response',
		);
	return wrapper.data.map((entry) => ({
		...(entry as IDataObject),
		...(wrapper.encoded_cursor ? { openmart_next_cursor: wrapper.encoded_cursor } : {}),
	}));
}

export function buildCompanyEnrichBody(input: Record<string, unknown>): IDataObject {
	const operation = 'Company Enrich';
	const website = optional(input.website, 'Website', operation);
	const social = optional(input.socialMediaLink, 'Social Media Link', operation);
	if (!website && !social) throw error(operation, 'Website or Social Media Link is required');
	const place = location(input.companyEnrichLocation, operation);
	return {
		...(website ? { website } : {}),
		...(social ? { social_media_link: social } : {}),
		...(place ? { location: [place] } : {}),
		limit: integer(input.companyEnrichLimit, 'Limit', 1, 50, operation),
		estimate_total: false,
	};
}

export function parseCompanyEnrich(value: unknown): IDataObject[] {
	return parseSearchResults(value);
}

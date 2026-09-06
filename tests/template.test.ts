// Template invariant tests intentionally inspect repository files.
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadBrandingDocument } from '../scripts/release-check.mjs';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('generated package safety and tooling', () => {
	it('uses final identity and registers only Openmart', async () => {
		const packageJson = JSON.parse(await read('package.json')) as {
			name: string;
			packageManager?: string;
			engines: { node: string };
			devDependencies: Record<string, string>;
			n8n: { nodes: string[]; credentials: string[] };
		};
		expect(packageJson.name).toBe('@blackswampai/n8n-nodes-openmart');
		expect(packageJson.packageManager).toBe('npm@11.19.0');
		expect(packageJson.engines.node).toBe('>=22.22.0');
		expect(packageJson.devDependencies).toMatchObject({
			'@n8n/node-cli': '0.46.4',
			'@n8n/scan-community-package': '0.34.0',
			eslint: '9.39.4',
			prettier: '3.8.3',
			'release-it': '20.2.0',
			typescript: '5.9.3',
			vitest: '4.1.11',
		});
		expect(packageJson.n8n.nodes).toEqual(['dist/nodes/Openmart/Openmart.node.js']);
		expect(packageJson.n8n.credentials).toEqual(['dist/credentials/OpenmartApi.credentials.js']);
	});

	it('uses strict TypeScript and Vitest tests', async () => {
		const [testConfig, agents] = await Promise.all([read('tsconfig.test.json'), read('AGENTS.md')]);
		expect(testConfig).not.toMatch(/noImplicitAny.*false|noUnusedLocals.*false/);
		expect(agents).toContain('`*.test.ts`');
		expect(agents).toContain('Vitest');
	});

	it('tracks the adopted reusable template baseline', async () => {
		const marker = JSON.parse(await read('.blackswamp/template.json')) as {
			schemaVersion: number;
			templateVersion: string;
			sourceRepository: string;
		};
		expect(marker).toEqual({
			schemaVersion: 1,
			templateVersion: '2.0.1',
			sourceRepository: 'https://github.com/christopherjnelson/n8n-community-node-template',
		});
		const migrations = await read('docs/TEMPLATE_MIGRATIONS.md');
		expect(migrations).toContain('Generated repositories do not inherit later template changes');
	});

	it('has finalized generated documentation', async () => {
		const [releaseCheck, readme] = await Promise.all([
			read('scripts/release-check.mjs'),
			read('README.md'),
		]);
		for (const path of ['docs/api-matrix.md', 'docs/testing.md', 'docs/branding.md']) {
			expect(releaseCheck).toContain(path);
			expect(readme).toContain(path);
		}
		expect(releaseCheck).toContain('still contains template placeholders');
		expect(releaseCheck).toContain('remove template source document');
		expect(releaseCheck).toContain('raw template must retain');
		expect(readme).toContain('Distribution is unavailable');
		expect(readme).toContain('https://blackswampai.com/n8n-nodes/openmart/');
	});

	it('keeps release and publish safeguards', async () => {
		const [releaseCheck, publish, ci, packageJsonText] = await Promise.all([
			read('scripts/release-check.mjs'),
			read('.github/workflows/publish.yml'),
			read('.github/workflows/ci.yml'),
			read('package.json'),
		]);
		expect(releaseCheck).toContain('TEMPLATE_ORIGIN');
		expect(releaseCheck).toContain('replace(/^ssh:\\/\\/git@github\\.com\\//');
		expect(releaseCheck).toContain('/<[A-Z][A-Z0-9_ -]*>/');
		expect(releaseCheck).toContain('/\\b(?:TODO|CHANGEME)\\b/i');
		expect(releaseCheck).not.toContain('/TODO|CHANGEME/i');
		expect(releaseCheck).toContain('/YOUR[-_][A-Z0-9_-]+/');
		expect(releaseCheck).toContain(
			'id-token: write must be scoped to the publish job, not the workflow',
		);
		expect(releaseCheck).not.toContain('YOUR[-_ ][A-Z0-9_-]*');
		expect(releaseCheck).not.toContain('<[^>]+>');
		expect(releaseCheck).not.toContain('_[a-z][^_]*_');
		expect(publish).toContain('id-token: write');
		expect(publish).toContain("'v*.*.*'");
		const [publishJob, verifyPublishedJob = ''] = publish.split(/\n {2}verify-published:\s*\n/);
		expect(verifyPublishedJob).toMatch(/needs:\s*publish/);
		expect(verifyPublishedJob).toContain('npm ci');
		expect(verifyPublishedJob).toContain('npm run scan:published');
		expect(verifyPublishedJob).not.toContain('npm run release');
		expect(verifyPublishedJob).not.toContain('id-token: write');
		expect(publishJob).not.toContain('npm run scan:published');
		expect(ci).toMatch(/timeout-minutes:\s*20/);
		expect(publish).toMatch(/timeout-minutes:\s*30/);
		expect(publish).toContain('npm install --global npm@11.19.0');
		expect(ci).toContain('npm install --global npm@11.19.0');
		for (const workflow of [publish, ci]) {
			expect(workflow.indexOf('npm run build')).toBeLessThan(
				workflow.indexOf('npm run scan:source'),
			);
			expect(workflow.indexOf('npm run scan:source')).toBeLessThan(
				workflow.indexOf('npm run package:check'),
			);
			expect(workflow).toContain('npm run smoke:install');
		}
		expect(publish).toContain('node scripts/prepare-npm-auth.mjs');
		expect(packageJsonText).toContain('"scan:source"');
		expect(await read('scripts/node-load-smoke.mjs')).toContain(
			'Packaged SVG icon needs a usable viewBox',
		);
		expect(await read('docs/branding.md')).toContain('Creator Portal card version and logo');
	});

	it('selects branding guidance for both document lifecycle paths', async () => {
		const files = new Map([
			['/fixture/docs/BRANDING_TEMPLATE.md', 'raw guidance'],
			['/fixture/docs/branding.md', 'generated guidance'],
		]);
		const exists = (path: Parameters<typeof import('node:fs').existsSync>[0]) =>
			files.has(String(path));
		const load = (path: string) => files.get(path) ?? '';
		expect(loadBrandingDocument(true, '/fixture', exists, load)).toEqual({
			path: 'docs/BRANDING_TEMPLATE.md',
			contents: 'raw guidance',
		});
		expect(loadBrandingDocument(false, '/fixture', exists, load)).toEqual({
			path: 'docs/branding.md',
			contents: 'generated guidance',
		});
		expect(loadBrandingDocument(false, '/missing', () => false, load)).toEqual({
			path: 'docs/branding.md',
			contents: '',
		});
	});
});

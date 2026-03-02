import { query } from '$app/server';
import { env } from '$env/dynamic/private';

import { z } from 'zod';
import { Result } from './result';
import { Version } from '$lib/utils/version';

const GitHubReleaseAssetSchema = z.object({
	url: z.string(),
	browser_download_url: z.string(),
	id: z.number(),
	node_id: z.string(),
	name: z.string(),
	label: z.string().nullable().optional(),
	state: z.string().optional(),
	content_type: z.string().optional(),
	size: z.number().optional(),
	digest: z.string().optional(),
	download_count: z.number().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional()
});

const GitHubReleaseSchema = z.object({
	url: z.string(),
	html_url: z.string().optional(),
	assets_url: z.string().optional(),
	upload_url: z.string().optional(),
	tarball_url: z.string().optional(),
	zipball_url: z.string().optional(),
	discussion_url: z.string().optional(),
	id: z.number(),
	node_id: z.string(),
	tag_name: z.string(),
	target_commitish: z.string().optional(),
	name: z.string().optional(),
	body: z.string().nullable().optional(),
	draft: z.boolean().optional(),
	prerelease: z.boolean().optional(),
	immutable: z.boolean().optional(),
	created_at: z.string().optional(),
	published_at: z.string().optional(),
	assets: z.array(GitHubReleaseAssetSchema).default([])
});

async function getLatestGithubApkRelease() {
	try {
		const res = await fetch('https://api.github.com/repos/Neo-Ciber94/etoshokan/releases/latest', {
			headers: {
				Authorization: `Bearer ${env.GITHUB_TOKEN}`
			}
		});

		if (!res.ok) {
			const error = await res.text();
			console.error(error);
			return Result.err(`Failed to fetch latest release: ${res.status}`);
		}

		const raw = await res.json();
		const data = GitHubReleaseSchema.parse(raw);
		return Result.ok(data);
	} catch (err) {
		console.error(err);
		return Result.err(err);
	}
}

export const getLatestAppRelease = query(async () => {
	const result = await getLatestGithubApkRelease();

	if (!result.success) {
		return result;
	}

	const assets = result.data.assets;
	const apkAsset = assets[0];

	if (apkAsset == null) {
		return Result.err('No release asset found');
	}

	const versionString = apkAsset.name.replace('etoshokan-', '').replace('.apk', '');
	const version = Version.parse(versionString);
	return Result.ok({
		downloadUrl: apkAsset.browser_download_url,
		version: version.toJSON()
	});
});

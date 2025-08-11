import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GITHUB_TOKEN } from '$env/static/private';
import { getTheme } from '$lib/themes';
import { generateSVG, type GitHubUser, type GitHubStats, type ScoreBreakdown } from '$lib/svg-generator';

interface GitHubRepo {
	name: string;
	language: string;
	stargazers_count: number;
	forks_count: number;
	size: number;
}

// GitHub API リクエストのヘッダー設定
function getHeaders() {
	const headers: Record<string, string> = {
		'User-Agent': 'GitHub-Stats-Generator/1.0'
	};

	if (GITHUB_TOKEN) {
		headers['Authorization'] = `token ${GITHUB_TOKEN}`;
	}

	return headers;
}

async function fetchGitHubUser(username: string): Promise<GitHubUser> {
	try {
		const response = await fetch(`https://api.github.com/users/${username}`, {
			headers: getHeaders()
		});
		
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`GitHub user '${username}' not found`);
			}
			if (response.status === 403) {
				throw new Error('GitHub API rate limit exceeded');
			}
			throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
		}
		
		return response.json();
	} catch (err) {
		if (err instanceof Error) {
			throw err;
		}
		throw new Error(`Failed to fetch user ${username}: ${String(err)}`);
	}
}

async function fetchUserRepos(username: string): Promise<GitHubRepo[]> {
	const repos: GitHubRepo[] = [];
	let page = 1;
	
	while (true) {
		try {
			const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}`, {
				headers: getHeaders()
			});
			
			if (!response.ok) {
				if (response.status === 403) {
					console.warn('GitHub API rate limit exceeded when fetching repositories');
					break; // レート制限時は取得済みのリポジトリで処理を続行
				} else if (response.status === 404) {
					throw new Error('User not found');
				} else {
					console.warn(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
					break;
				}
			}
			
			const pageRepos = await response.json();
			if (pageRepos.length === 0) break;
			
			repos.push(...pageRepos);
			page++;
		} catch (error) {
			console.error('Error fetching repositories:', error);
			if (error instanceof Error && error.message === 'User not found') {
				throw error; // ユーザーが見つからない場合は再スロー
			}
			break; // その他のエラーは処理を続行
		}
	}
	
	return repos;
}

async function fetchCommitCount(username: string): Promise<number> {
	try {
		// GitHub Search APIを使用してコミット数の概算を取得
		const response = await fetch(`https://api.github.com/search/commits?q=author:${username}`, {
			headers: getHeaders()
		});
		
		if (response.status === 403) {
			console.warn('GitHub API rate limit exceeded when fetching commit count');
			return 0; // レート制限時は0を返して処理を続行
		}
		
		if (response.ok) {
			const data = await response.json();
			return data.total_count || 0;
		} else {
			console.warn(`Failed to fetch commit count: ${response.status} ${response.statusText}`);
		}
	} catch (error) {
		console.error('Failed to fetch commit count:', error);
	}
	return 0;
}

async function fetchPRCount(username: string): Promise<number> {
	try {
		// GitHub Search APIを使用してPR数の概算を取得
		const response = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:pr`, {
			headers: getHeaders()
		});
		
		if (response.status === 403) {
			console.warn('GitHub API rate limit exceeded when fetching PR count');
			return 0; // レート制限時は0を返して処理を続行
		}
		
		if (response.ok) {
			const data = await response.json();
			return data.total_count || 0;
		} else {
			console.warn(`Failed to fetch PR count: ${response.status} ${response.statusText}`);
		}
	} catch (error) {
		console.error('Failed to fetch PR count:', error);
	}
	return 0;
}

async function estimateCodeLines(repos: GitHubRepo[]): Promise<number> {
	let totalLines = 0;
	
	// 各リポジトリのサイズ（KB）を基にコード行数を推定
	// 一般的に1KB ≈ 15-20行程度と仮定
	for (const repo of repos) {
		if (repo.size > 0) {
			// フォークされたリポジトリは除外
			// サイズベースでの行数推定（1KB ≈ 18行と仮定）
			totalLines += repo.size * 18;
		}
	}
	
	return Math.round(totalLines);
}

async function fetchAvatarAsBase64(avatarUrl: string): Promise<string | null> {
	try {
		const response = await fetch(avatarUrl);
		if (!response.ok) {
			console.warn('Failed to fetch avatar image');
			return null;
		}
		
		const buffer = await response.arrayBuffer();
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		const base64 = btoa(binary);
		const contentType = response.headers.get('content-type') || 'image/png';
		
		return `data:${contentType};base64,${base64}`;
	} catch (error) {
		console.error('Error fetching avatar:', error);
		return null;
	}
}

function calculateScore(stats: Omit<GitHubStats, 'score' | 'scoreBreakdown'>): { score: number; scoreBreakdown: ScoreBreakdown } {
	// スコア計算の重み付け（行数を最重視）
	const weights = {
		lines: 0.4,      // 40% - 最重要
		stars: 0.2,      // 20%
		followers: 0.15, // 15%
		commits: 0.15,   // 15%
		repos: 0.1       // 10%
	};
	
	// 各項目の正規化（対数スケール使用で極端な値を調整）
	const linesScore = Math.min(100, Math.log10(Math.max(1, stats.totalLines*0.003)) * 20);
	const starsScore = Math.min(100, Math.log10(Math.max(1, stats.totalStars)) * 25);
	const followersScore = Math.min(100, Math.log10(Math.max(1, stats.user.followers)) * 30);
	const commitsScore = Math.min(100, Math.log10(Math.max(1, stats.totalCommits)) * 22);
	const reposScore = Math.min(100, Math.log10(Math.max(1, stats.user.public_repos)) * 35);
	
	// 重み付きスコア計算
	const totalScore = Math.round(
		linesScore * weights.lines +
		starsScore * weights.stars +
		followersScore * weights.followers +
		commitsScore * weights.commits +
		reposScore * weights.repos
	);
	
	const scoreBreakdown: ScoreBreakdown = {
		linesScore: Math.round(linesScore),
		starsScore: Math.round(starsScore),
		followersScore: Math.round(followersScore),
		commitsScore: Math.round(commitsScore),
		reposScore: Math.round(reposScore),
		totalScore
	};
	
	return { score: totalScore, scoreBreakdown };
}

export const GET: RequestHandler = async ({ params, url }) => {
	const { username } = params;
	
	if (!username) {
		throw error(400, 'Username is required');
	}
	
	try {
		// GitHubユーザー情報を取得
		const user = await fetchGitHubUser(username);
		
		// リポジトリ情報を取得
		const repos = await fetchUserRepos(username);
		
		// 統計を計算
		const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
		const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
		
		// 言語統計
		const languages: Record<string, number> = {};
		repos.forEach(repo => {
			if (repo.language) {
				languages[repo.language] = (languages[repo.language] || 0) + repo.stargazers_count + 1;
			}
		});
		
		// コミット数を取得（概算）
		const totalCommits = await fetchCommitCount(username);
		
		// PR数を取得（概算）
		const totalPRs = await fetchPRCount(username);
		
		// コード行数を推定
		const totalLines = await estimateCodeLines(repos);
		
		// 一時的な統計オブジェクト（スコア計算前）
		const tempStats = {
			user,
			totalStars,
			totalForks,
			languages,
			totalCommits,
			totalPRs,
			totalLines
		};
		
		// スコア計算
		const { score, scoreBreakdown } = calculateScore(tempStats);
		
		// アバター画像を取得
		const avatarBase64 = await fetchAvatarAsBase64(user.avatar_url);
		
		const stats: GitHubStats = {
			...tempStats,
			score,
			scoreBreakdown,
			avatarBase64 // アバターデータを追加
		};
		
		// テーマを取得
		const themeName = url.searchParams.get('theme');
		const theme = getTheme(themeName ?? undefined);
		
		// SVGを生成
		const svg = generateSVG(stats, avatarBase64, theme);
		
		// クエリパラメータで出力形式を確認
		const format = url.searchParams.get('format');
		
		if (format === 'json') {
			return json(stats);
		}
		
		return new Response(svg, {
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
			},
		});
	} catch (err) {
		console.error('Error fetching GitHub stats:', err);
		
		// エラーの種類に応じて適切なレスポンスを返す
		if (err instanceof Error) {
			if (err.message.includes('not found')) {
				throw error(404, `GitHub user '${params.username}' not found`);
			} else if (err.message.includes('rate limit exceeded')) {
				throw error(429, 'GitHub API rate limit exceeded. Please try again later.');
			} else if (err.message.includes('API request failed')) {
				throw error(503, 'GitHub API is currently unavailable. Please try again later.');
			}
		}
		
		throw error(500, 'Failed to fetch GitHub stats');
	}
};

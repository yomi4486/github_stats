import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GITHUB_TOKEN } from '$env/static/private';
import { getTheme, type Theme } from '$lib/themes';

interface GitHubUser {
	login: string;
	name: string;
	public_repos: number;
	followers: number;
	following: number;
	created_at: string;
	avatar_url: string;
	bio: string;
}

interface GitHubRepo {
	name: string;
	language: string;
	stargazers_count: number;
	forks_count: number;
	size: number;
}

interface GitHubStats {
	user: GitHubUser;
	totalStars: number;
	totalForks: number;
	languages: Record<string, number>;
	totalCommits: number;
	totalLines: number;
	totalPRs: number;
	score: number;
	scoreBreakdown: ScoreBreakdown;
}

interface ScoreBreakdown {
	linesScore: number;
	starsScore: number;
	followersScore: number;
	commitsScore: number;
	reposScore: number;
	totalScore: number;
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

function generateSVG(stats: GitHubStats, avatarBase64: string, theme: Theme): string {
	const { user, totalStars, totalForks, totalCommits, totalPRs, totalLines, languages, score, scoreBreakdown } = stats;
	
	// 言語を使用頻度順にソート
	const sortedLanguages = Object.entries(languages)
		.sort(([,a], [,b]) => b - a)
		.slice(0, 6); // 上位6言語のみ表示
	
	const width = 800;
	const height = 400;
	
	// テーマから色を取得
	const colors = theme.colors;
	
	// スコアレベルに基づく色とランク
	function getScoreInfo(score: number) {
		if (score >= 90) return { color: '#fbbf24', rank: 'LEGENDARY', emoji: '👑', bg: '#fef3c7' };
		if (score >= 80) return { color: '#ef4444', rank: 'MASTER', emoji: '🔥', bg: '#fee2e2' };
		if (score >= 70) return { color: '#06b6d4', rank: 'EXPERT', emoji: '⭐', bg: '#cffafe' };
		if (score >= 60) return { color: '#3b82f6', rank: 'ADVANCED', emoji: '💎', bg: '#dbeafe' };
		if (score >= 50) return { color: '#10b981', rank: 'INTERMEDIATE', emoji: '🚀', bg: '#d1fae5' };
		if (score >= 30) return { color: '#f59e0b', rank: 'BEGINNER', emoji: '🌱', bg: '#fef3c7' };
		return { color: '#64748b', rank: 'NEWCOMER', emoji: '👶', bg: '#f1f5f9' };
	}
	
	const scoreInfo = getScoreInfo(score);
	
	// 数値をフォーマットする関数
	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
		}
		return num.toString();
	}
	
	// 言語の色マッピング
	const languageColors: Record<string, string> = {
		JavaScript: '#f1e05a',
		TypeScript: '#3178c6',
		Python: '#3572A5',
		Java: '#b07219',
		Go: '#00ADD8',
		Rust: '#dea584',
		C: '#555555',
		'C++': '#f34b7d',
		HTML: '#e34c26',
		CSS: '#563d7c',
		Vue: '#4FC08D',
		React: '#61dafb',
		Svelte: '#ff3e00'
	};
	
	return `
		<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:${theme.gradients.background[0]}"/>
					<stop offset="100%" style="stop-color:${theme.gradients.background[1]}"/>
				</linearGradient>
				<linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" style="stop-color:${theme.gradients.score[0]}"/>
					<stop offset="100%" style="stop-color:${theme.gradients.score[1]}"/>
				</linearGradient>
				<filter id="glow">
					<feGaussianBlur stdDeviation="3" result="coloredBlur"/>
					<feMerge> 
						<feMergeNode in="coloredBlur"/>
						<feMergeNode in="SourceGraphic"/>
					</feMerge>
				</filter>
			</defs>
			
			<!-- Background -->
			<rect width="100%" height="100%" fill="url(#bg-gradient)" rx="6"/>
			<rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="${colors.border}" stroke-width="1" rx="10"/>
			
			<!-- Left Section: User Info & Score -->
			<rect x="20" y="20" width="280" height="360" fill="${colors.cardBg}" rx="4" opacity="0.5"/>
			
			<!-- User Avatar (GitHub Icon) -->
			<clipPath id="avatarClip">
				<circle cx="60" cy="60" r="20"/>
			</clipPath>
			${avatarBase64 ? `
				<image x="40" y="40" width="40" height="40" href="${avatarBase64}" clip-path="url(#avatarClip)"/>
				<circle cx="60" cy="60" r="20" fill="none" stroke="${colors.border}" stroke-width="2"/>
			` : `
				<circle cx="60" cy="60" r="20" fill="${colors.accent}" stroke="${colors.border}" stroke-width="2"/>
				<text x="60" y="68" fill="${colors.background}" font-family="Inter, -apple-system, sans-serif" font-size="24" font-weight="700" text-anchor="middle">
					${(user.name || user.login).charAt(0).toUpperCase()}
				</text>
			`}
			
			<!-- User Info -->
			<text x="90" y="55" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="20" font-weight="700" text-anchor="start">
				${user.name || user.login}
			</text>
			<text x="90" y="75" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="15" text-anchor="start">
				@${user.login}
			</text>
			
			<!-- Score Display -->
			<rect x="45" y="105" width="230" height="90" fill="url(#score-gradient)" rx="8" opacity="0.15"/>
			<text x="60" y="140" fill="${scoreInfo.color}" font-family="Inter, -apple-system, sans-serif" font-size="36" font-weight="800" filter="url(#glow)">
				${scoreInfo.emoji} ${score} / 100
			</text>
			<text x="60" y="165" fill="${scoreInfo.color}" font-family="Inter, -apple-system, sans-serif" font-size="16" font-weight="600">
				${scoreInfo.rank}
			</text>
			<text x="60" y="185" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="13">
				Developer Score
			</text>
			
			<!-- Quick Stats -->
			<g transform="translate(45, 230)">
				<text x="0" y="0" fill="${colors.accent}" font-family="Inter, -apple-system, sans-serif" font-size="16" font-weight="600">
					📊 Quick Stats
				</text>
				<text x="0" y="30" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					📝 ${formatNumber(totalLines)} <tspan font-size="10">lines(est)</tspan>
				</text>
				<text x="0" y="55" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					⭐ ${totalStars.toLocaleString()} <tspan font-size="10">stars</tspan>
				</text>
				<text x="0" y="80" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					👥 ${user.followers.toLocaleString()} <tspan font-size="10">followers</tspan>
				</text>
				<text x="0" y="105" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					📦 ${user.public_repos} <tspan font-size="10">repos</tspan>
				</text>
				
				<!-- Details (右側) -->
				<text x="115" y="0" fill="${colors.accent}" font-family="Inter, -apple-system, sans-serif" font-size="16" font-weight="600">
					📈 Details
				</text>
				<text x="115" y="30" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					💻 ${totalCommits.toLocaleString()} <tspan font-size="10">commits</tspan>
				</text>
				<text x="115" y="55" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					🔀 ${totalPRs.toLocaleString()} <tspan font-size="10">PRs</tspan>
				</text>
				<text x="115" y="80" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					🍴 ${totalForks.toLocaleString()} <tspan font-size="10">forks</tspan>
				</text>
				<text x="115" y="105" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					📅 Since ${new Date(user.created_at).getFullYear()}
				</text>
			</g>
			
			<!-- Middle Section: Score Breakdown -->
			<rect x="320" y="20" width="220" height="360" fill="${colors.cardBg}" rx="8" opacity="0.5"/>
			
			<text x="340" y="50" fill="${colors.accent}" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600">
				🎯 Score Breakdown
			</text>
			
			<!-- Score Bars -->
			<g transform="translate(340, 80)">
				<!-- Lines Score -->
				<text x="0" y="15" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="500">
					Lines (40%)
				</text>
				<rect x="0" y="25" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="25" width="${(scoreBreakdown.linesScore / 100) * 160}" height="6" fill="${colors.green}" rx="3"/>
				<text x="165" y="30" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="12">
					${scoreBreakdown.linesScore}
				</text>
				
				<!-- Stars Score -->
				<text x="0" y="55" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="500">
					Stars (20%)
				</text>
				<rect x="0" y="65" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="65" width="${(scoreBreakdown.starsScore / 100) * 160}" height="6" fill="${colors.yellow}" rx="3"/>
				<text x="165" y="70" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="12">
					${scoreBreakdown.starsScore}
				</text>
				
				<!-- Followers Score -->
				<text x="0" y="95" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="500">
					Followers (15%)
				</text>
				<rect x="0" y="105" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="105" width="${(scoreBreakdown.followersScore / 100) * 160}" height="6" fill="${colors.purple}" rx="3"/>
				<text x="165" y="110" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="12">
					${scoreBreakdown.followersScore}
				</text>
				
				<!-- Commits Score -->
				<text x="0" y="135" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="500">
					Commits (15%)
				</text>
				<rect x="0" y="145" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="145" width="${(scoreBreakdown.commitsScore / 100) * 160}" height="6" fill="${colors.accent}" rx="3"/>
				<text x="165" y="150" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="12">
					${scoreBreakdown.commitsScore}
				</text>
				
				<!-- Repos Score -->
				<text x="0" y="175" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="500">
					Repos (10%)
				</text>
				<rect x="0" y="185" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="185" width="${(scoreBreakdown.reposScore / 100) * 160}" height="6" fill="${colors.red}" rx="3"/>
				<text x="165" y="190" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="12">
					${scoreBreakdown.reposScore}
				</text>
			</g>
			
			<!-- Right Section: Languages -->
			<rect x="560" y="20" width="220" height="360" fill="${colors.cardBg}" rx="8" opacity="0.5"/>
			
			<text x="580" y="50" fill="${colors.accent}" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600">
				💬 Top Languages
			</text>
			
			${sortedLanguages.map(([lang, count], index) => {
				const y = 85 + index * 50;
				const total = Object.values(languages).reduce((sum, val) => sum + val, 0);
				const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
				const barWidth = Math.max(8, (count / Math.max(...Object.values(languages))) * 120);
				const color = languageColors[lang] || colors.accent;
				
				return `
					<g transform="translate(580, ${y})">
						<text x="0" y="0" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14" font-weight="500">
							${lang}
						</text>
						<text x="125" y="0" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="13">
							${percentage}%
						</text>
						<rect x="0" y="10" width="120" height="8" fill="${colors.border}" rx="4"/>
						<rect x="0" y="10" width="${barWidth}" height="8" fill="${color}" rx="4"/>
					</g>
				`;
			}).join('')}
			
			<!-- Footer -->
			<text x="20" y="${height - 15}" fill="${colors.textSecondary}" font-family="Inter, -apple-system, sans-serif" font-size="11" opacity="0.7">
				Powered by yomi4486 • ${new Date().toISOString().split('T')[0]}
			</text>
		</svg>
	`.trim();
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
		
		const stats: GitHubStats = {
			...tempStats,
			score,
			scoreBreakdown
		};
		
		// アバター画像を取得
		const avatarBase64 = await fetchAvatarAsBase64(user.avatar_url);
		
		// テーマを取得
		const themeName = url.searchParams.get('theme');
		const theme = getTheme(themeName ?? undefined);
		
		// SVGを生成
		const svg = generateSVG(stats, avatarBase64!, theme);
		
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
			if (err.message.includes('User not found')) {
				throw error(404, `GitHub user '${params.username}' not found`);
			} else if (err.message.includes('Rate limit exceeded')) {
				throw error(429, 'GitHub API rate limit exceeded. Please try again later.');
			} else if (err.message.includes('API request failed')) {
				throw error(503, 'GitHub API is currently unavailable. Please try again later.');
			}
		}
		
		throw error(500, 'Failed to fetch GitHub stats');
	}
};

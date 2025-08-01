import type { Theme } from './themes';

export interface GitHubUser {
	login: string;
	name: string;
	public_repos: number;
	followers: number;
	following: number;
	created_at: string;
	avatar_url: string;
	bio: string;
}

export interface ScoreBreakdown {
	linesScore: number;
	starsScore: number;
	followersScore: number;
	commitsScore: number;
	reposScore: number;
	totalScore: number;
}

export interface GitHubStats {
	user: GitHubUser;
	totalStars: number;
	totalForks: number;
	languages: Record<string, number>;
	totalCommits: number;
	totalLines: number;
	totalPRs: number;
	score: number;
	scoreBreakdown: ScoreBreakdown;
	avatarBase64?: string | null;
}

// スコアレベルに基づく色とランク情報を取得
function getScoreInfo(score: number) {
	if (score >= 90) return { color: '#fbbf24', rank: 'LEGENDARY', emoji: '👑', bg: '#fef3c7' };
	if (score >= 80) return { color: '#ef4444', rank: 'MASTER', emoji: '🔥', bg: '#fee2e2' };
	if (score >= 70) return { color: '#06b6d4', rank: 'EXPERT', emoji: '⭐', bg: '#cffafe' };
	if (score >= 60) return { color: '#3b82f6', rank: 'ADVANCED', emoji: '💎', bg: '#dbeafe' };
	if (score >= 50) return { color: '#10b981', rank: 'INTERMEDIATE', emoji: '🚀', bg: '#d1fae5' };
	if (score >= 30) return { color: '#f59e0b', rank: 'BEGINNER', emoji: '🌱', bg: '#fef3c7' };
	return { color: '#64748b', rank: 'NEWCOMER', emoji: '👶', bg: '#f1f5f9' };
}

// 数値をフォーマットする関数
function formatNumber(num: number): string {
 	if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'G';
    } else if (num >= 1000000) {
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

/**
 * GitHubスタッツからSVGを生成する共通関数
 */
export function generateSVG(stats: GitHubStats, avatarBase64: string | null, theme: Theme): string {
	const { user, totalStars, totalForks, totalCommits, totalPRs, totalLines, languages, score, scoreBreakdown } = stats;
	
	// 言語を使用頻度順にソート
	const sortedLanguages = Object.entries(languages)
		.sort(([,a], [,b]) => (b as number) - (a as number))
		.slice(0, 6); // 上位6言語のみ表示
	
	const width = 800;
	const height = 400;
	
	// テーマから色を取得
	const colors = theme.colors;
	
	const scoreInfo = getScoreInfo(score);
	
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
					⭐ ${formatNumber(totalStars)} <tspan font-size="10">stars</tspan>
				</text>
				<text x="0" y="80" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					👥 ${formatNumber(user.followers)} <tspan font-size="10">followers</tspan>
				</text>
				<text x="0" y="105" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					📦 ${formatNumber(user.public_repos)} <tspan font-size="10">repos</tspan>
				</text>
				
				<!-- Details (右側) -->
				<text x="115" y="0" fill="${colors.accent}" font-family="Inter, -apple-system, sans-serif" font-size="16" font-weight="600">
					📈 Details
				</text>
				<text x="115" y="30" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					💻 ${formatNumber(totalCommits)} <tspan font-size="10">commits</tspan>
				</text>
				<text x="115" y="55" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					🔀 ${formatNumber(totalPRs)} <tspan font-size="10">PRs</tspan>
				</text>
				<text x="115" y="80" fill="${colors.text}" font-family="Inter, -apple-system, sans-serif" font-size="14">
					🍴 ${formatNumber(totalForks)} <tspan font-size="10">forks</tspan>
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
				const total = Object.values(languages).reduce((sum: number, val: any) => sum + val, 0);
				const percentage = total > 0 ? ((count as number / total) * 100).toFixed(1) : '0.0';
				const barWidth = Math.max(8, ((count as number) / Math.max(...Object.values(languages) as number[])) * 120);
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

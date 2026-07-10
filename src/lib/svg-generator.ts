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
	prsIssuesScore: number;
	commitsScore: number;
	reviewsScore: number;
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
	contributionStreak?: {
		currentStreak: number;
		longestStreak: number;
		totalContributions: number;
	};
	avatarBase64?: string | null;
}

// スコアレベルに基づく色とランク情報を取得
function getScoreInfo(score: number) {
	if (score >= 90) return { color: '#fbbf24', rank: 'LEGENDARY', icon: 'crown', bg: '#fef3c7' };
	if (score >= 80) return { color: '#ef4444', rank: 'MASTER', icon: 'fire', bg: '#fee2e2' };
	if (score >= 70) return { color: '#06b6d4', rank: 'EXPERT', icon: 'star', bg: '#cffafe' };
	if (score >= 60) return { color: '#3b82f6', rank: 'ADVANCED', icon: 'diamond', bg: '#dbeafe' };
	if (score >= 50) return { color: '#10b981', rank: 'INTERMEDIATE', icon: 'rocket', bg: '#d1fae5' };
	if (score >= 30) return { color: '#f59e0b', rank: 'BEGINNER', icon: 'plant', bg: '#fef3c7' };
	return { color: '#64748b', rank: 'NEWCOMER', icon: 'baby', bg: '#f1f5f9' };
}

// Phosphor Icons (fill weight) のパスデータ。環境依存の絵文字レンダリングを避けるため使用。
const ICON_PATHS = {
	crown:
		'M248,80a28,28,0,1,0-51.12,15.77l-26.79,33L146,73.4a28,28,0,1,0-36.06,0L85.91,128.74l-26.79-33a28,28,0,1,0-26.6,12L47,194.63A16,16,0,0,0,62.78,208H193.22A16,16,0,0,0,209,194.63l14.47-86.85A28,28,0,0,0,248,80ZM128,40a12,12,0,1,1-12,12A12,12,0,0,1,128,40ZM24,80A12,12,0,1,1,36,92,12,12,0,0,1,24,80ZM220,92a12,12,0,1,1,12-12A12,12,0,0,1,220,92Z',
	fire: 'M143.38,17.85a8,8,0,0,0-12.63,3.41l-22,60.41L84.59,58.26a8,8,0,0,0-11.93.89C51,87.53,40,116.08,40,144a88,88,0,0,0,176,0C216,84.55,165.21,36,143.38,17.85Zm40.51,135.49a57.6,57.6,0,0,1-46.56,46.55A7.65,7.65,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z',
	star: 'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z',
	diamond:
		'M240,128a15.85,15.85,0,0,1-4.67,11.28l-96.05,96.06a16,16,0,0,1-22.56,0h0l-96-96.06a16,16,0,0,1,0-22.56l96.05-96.06a16,16,0,0,1,22.56,0l96.05,96.06A15.85,15.85,0,0,1,240,128Z',
	rocket:
		'M152,224a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,224Zm71.62-68.17-12.36,55.63a16,16,0,0,1-25.51,9.11L158.51,200h-61L70.25,220.57a16,16,0,0,1-25.51-9.11L32.38,155.83a16.09,16.09,0,0,1,3.32-13.71l28.56-34.26a123.07,123.07,0,0,1,8.57-36.67c12.9-32.34,36-52.63,45.37-59.85a16,16,0,0,1,19.6,0c9.34,7.22,32.47,27.51,45.37,59.85a123.07,123.07,0,0,1,8.57,36.67l28.56,34.26A16.09,16.09,0,0,1,223.62,155.83Zm-139.23,34Q68.28,160.5,64.83,132.16L48,152.36,60.36,208l.18-.13ZM140,100a12,12,0,1,0-12,12A12,12,0,0,0,140,100Zm68,52.36-16.83-20.2q-3.42,28.28-19.56,57.69l23.85,18,.18.13Z',
	plant:
		'M205.41,159.07a60.9,60.9,0,0,1-31.83,8.86,71.71,71.71,0,0,1-27.36-5.66A55.55,55.55,0,0,0,136,194.51V224a8,8,0,0,1-8.53,8,8.18,8.18,0,0,1-7.47-8.25V211.31L81.38,172.69A52.5,52.5,0,0,1,63.44,176a45.82,45.82,0,0,1-23.92-6.67C17.73,156.09,6,125.62,8.27,87.79a8,8,0,0,1,7.52-7.52c37.83-2.23,68.3,9.46,81.5,31.25A46,46,0,0,1,103.74,140a4,4,0,0,1-6.89,2.43l-19.2-20.1a8,8,0,0,0-11.31,11.31l53.88,55.25c.06-.78.13-1.56.21-2.33a68.56,68.56,0,0,1,18.64-39.46l50.59-53.46a8,8,0,0,0-11.31-11.32l-49,51.82a4,4,0,0,1-6.78-1.74c-4.74-17.48-2.65-34.88,6.4-49.82,17.86-29.48,59.42-45.26,111.18-42.22a8,8,0,0,1,7.52,7.52C250.67,99.65,234.89,141.21,205.41,159.07Z',
	baby: 'M134.16,24.1a4,4,0,0,0-3.56,1.81C120.3,41.48,120,55.79,120,56a8,8,0,0,0,9.68,7.79A8.24,8.24,0,0,0,136,55.68,8,8,0,0,1,144.8,48a8.14,8.14,0,0,1,7.2,8.23,24,24,0,0,1-48-.27c0-.63.09-10.78,5.44-24a4,4,0,0,0-4.59-5.39A104.16,104.16,0,0,0,24.07,131.66C26,186.72,71.23,231,126.32,231.9a104,104,0,0,0,7.84-207.8ZM80,127.91a12,12,0,1,1,12,12A12,12,0,0,1,80,127.91Zm80.27,54.77a61,61,0,0,1-64.54,0,8,8,0,0,1,8.54-13.54,45,45,0,0,0,47.46,0,8,8,0,0,1,8.54,13.54ZM164,139.91a12,12,0,1,1,12-12A12,12,0,0,1,164,139.91Z',
	chartBar:
		'M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16h8V136a8,8,0,0,1,8-8H72a8,8,0,0,1,8,8v64H96V88a8,8,0,0,1,8-8h32a8,8,0,0,1,8,8V200h16V40a8,8,0,0,1,8-8h40a8,8,0,0,1,8,8V200h8A8,8,0,0,1,232,208Z',
	code: 'M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM92.8,145.6a8,8,0,1,1-9.6,12.8l-32-24a8,8,0,0,1,0-12.8l32-24a8,8,0,0,1,9.6,12.8L69.33,128Zm58.89-71.4-32,112a8,8,0,1,1-15.38-4.4l32-112a8,8,0,0,1,15.38,4.4Zm53.11,60.2-32,24a8,8,0,0,1-9.6-12.8L186.67,128,163.2,110.4a8,8,0,1,1,9.6-12.8l32,24a8,8,0,0,1,0,12.8Z',
	users:
		'M164.47,195.63a8,8,0,0,1-6.7,12.37H10.23a8,8,0,0,1-6.7-12.37,95.83,95.83,0,0,1,47.22-37.71,60,60,0,1,1,66.5,0A95.83,95.83,0,0,1,164.47,195.63Zm87.91-.15a95.87,95.87,0,0,0-47.13-37.56A60,60,0,0,0,144.7,54.59a4,4,0,0,0-1.33,6A75.83,75.83,0,0,1,147,150.53a4,4,0,0,0,1.07,5.53,112.32,112.32,0,0,1,29.85,30.83,23.92,23.92,0,0,1,3.65,16.47,4,4,0,0,0,3.95,4.64h60.3a8,8,0,0,0,7.73-5.93A8.22,8.22,0,0,0,252.38,195.48Z',
	package:
		'M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.35,44L178.57,92.29l-80.35-44Zm0,88L47.65,76,81.56,57.43l80.35,44Zm88,55.85h0l-80,43.79V133.83l32-17.51V152a8,8,0,0,0,16,0V107.56l32-17.51v85.76Z',
	trendUp:
		'M240,56v64a8,8,0,0,1-13.66,5.66L200,99.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,188.69,88,162.34,61.66A8,8,0,0,1,168,48h64A8,8,0,0,1,240,56Z',
	gitCommit:
		'M256,128a8,8,0,0,1-8,8H183.42a56,56,0,0,1-110.84,0H8a8,8,0,0,1,0-16H72.58a56,56,0,0,1,110.84,0H248A8,8,0,0,1,256,128Z',
	gitPullRequest:
		'M104,64A32,32,0,1,0,64,95v66a32,32,0,1,0,16,0V95A32.06,32.06,0,0,0,104,64ZM88,192a16,16,0,1,1-16-16A16,16,0,0,1,88,192Zm144,0a32,32,0,1,1-40-31V110.63a8,8,0,0,0-2.34-5.66L152,67.31V96a8,8,0,0,1-16,0V48a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H163.31L201,93.66a23.85,23.85,0,0,1,7,17V161A32.06,32.06,0,0,1,232,192Z',
	gitFork:
		'M224,64a32,32,0,1,0-40,31v17a8,8,0,0,1-8,8H80a8,8,0,0,1-8-8V95a32,32,0,1,0-16,0v17a24,24,0,0,0,24,24h40v25a32,32,0,1,0,16,0V136h40a24,24,0,0,0,24-24V95A32.06,32.06,0,0,0,224,64ZM144,192a16,16,0,1,1-16-16A16,16,0,0,1,144,192Z',
	calendar:
		'M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM112,184a8,8,0,0,1-16,0V132.94l-4.42,2.22a8,8,0,0,1-7.16-14.32l16-8A8,8,0,0,1,112,120Zm56-8a8,8,0,0,1,0,16H136a8,8,0,0,1-6.4-12.8l28.78-38.37A8,8,0,1,0,145.07,132a8,8,0,1,1-13.85-8A24,24,0,0,1,176,136a23.76,23.76,0,0,1-4.84,14.45L152,176ZM48,80V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80Z',
	target:
		'M221.87,83.16A104.1,104.1,0,1,1,195.67,49l22.67-22.68a8,8,0,0,1,11.32,11.32L167.6,99.71h0l-37.71,37.71-23.95,23.95a40,40,0,0,0,62-35.67,8,8,0,1,1,16-.9,56,56,0,0,1-95.5,42.79h0a56,56,0,0,1,73.13-84.43L184.3,60.39a87.88,87.88,0,1,0,23.13,29.67,8,8,0,0,1,14.44-6.9Z',
	bracketsCurly:
		'M88,155.84c.29,14.26.41,20.16,16,20.16a8,8,0,0,1,0,16c-31.27,0-31.72-22.43-32-35.84C71.71,141.9,71.59,136,56,136a8,8,0,0,1,0-16c15.59,0,15.71-5.9,16-20.16C72.28,86.43,72.73,64,104,64a8,8,0,0,1,0,16c-15.59,0-15.71,5.9-16,20.16-.17,8.31-.41,20.09-8,27.84C87.59,135.75,87.83,147.53,88,155.84ZM200,136c-15.59,0-15.71,5.9-16,20.16-.28,13.41-.73,35.84-32,35.84a8,8,0,0,1,0-16c15.59,0,15.71-5.9,16-20.16.17-8.31.41-20.09,8-27.84-7.6-7.75-7.84-19.53-8-27.84C167.71,85.9,167.59,80,152,80a8,8,0,0,1,0-16c31.27,0,31.72,22.43,32,35.84.29,14.26.41,20.16,16,20.16a8,8,0,0,1,0,16Z'
} as const;

// アイコンをインラインSVGとして描画する（絵文字の代わりにPhosphor Iconsを使用し、環境差異を無くす）
function renderIcon(
	name: keyof typeof ICON_PATHS,
	x: number,
	y: number,
	size: number,
	color: string,
	filter?: string,
	viewBox = '0 0 256 256'
): string {
	return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}"${filter ? ` filter="${filter}"` : ''}><path d="${ICON_PATHS[name]}" fill="${color}"/></svg>`;
}

// スコアランクアイコン専用: 呼吸するような発光 + 斜めに走るきらめきアニメーションを付与
function renderScoreIcon(name: keyof typeof ICON_PATHS, x: number, y: number, size: number, color: string): string {
	const path = ICON_PATHS[name];
	const clipId = `scoreIconClip-${name}`;
	const shineId = `scoreIconShine-${name}`;
	return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 256 256" filter="url(#glow)">
		<defs>
			<clipPath id="${clipId}"><path d="${path}"/></clipPath>
			<linearGradient id="${shineId}" x1="-60%" y1="0%" x2="-20%" y2="100%">
				<stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
				<stop offset="50%" stop-color="#ffffff" stop-opacity="0.5"/>
				<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
				<animate attributeName="x1" values="-200%;180%;260%" keyTimes="0;0.82;1" dur="2.5s" repeatCount="indefinite"/>
				<animate attributeName="x2" values="-160%;220%;300%" keyTimes="0;0.82;1" dur="2.5s" repeatCount="indefinite"/>
			</linearGradient>
		</defs>
		<path d="${path}" fill="${color}">
			<animate attributeName="opacity" values="1;0.86;1" dur="2.4s" repeatCount="indefinite"/>
		</path>
		<g clip-path="url(#${clipId})">
			<rect x="0" y="0" width="256" height="256" fill="url(#${shineId})"/>
		</g>
	</svg>`;
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

function truncateText(text: string, maxLength: number): string {
	const chars = Array.from(text ?? '');
	if (chars.length <= maxLength) {
		return text;
	}

	return `${chars.slice(0, maxLength - 1).join('')}…`;
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
	const { user, totalStars, totalForks, totalCommits, totalPRs, totalLines, languages, score, scoreBreakdown, contributionStreak } = stats;
	console.log(contributionStreak?.longestStreak);
	const displayName = truncateText(user.name || user.login, 17);
	const displayLogin = truncateText(user.login, 21);
	// 言語を使用頻度順にソート
	const sortedLanguages = Object.entries(languages)
		.sort(([,a], [,b]) => (b as number) - (a as number))
		.slice(0, 6); // 上位6言語のみ表示

	const width = 800;
	const height = 400;

	// テーマから色を取得
	const colors = theme.colors;

	const scoreInfo = getScoreInfo(score);

	// Contribution streak section is optional: only render when data is provided
	const streakSection = (contributionStreak?.currentStreak as number > 0 && contributionStreak?.longestStreak as number > 0) ? `
			<!-- Contribution Streak Section -->
			${renderIcon('fire', 340, 284, 18, colors.accent)}
			<text x="364" y="300" fill="${colors.accent}" font-size="18" font-weight="600">
				Streak
			</text>

			<g transform="translate(340, 310)">
				<!-- Total Contributions -->
				<rect x="0" y="0" width="90" height="40" fill="${colors.cardBg}" rx="6" opacity="0"/>
				<text x="45" y="20" fill="${colors.text}" font-size="16" font-weight="700" text-anchor="middle">
					${formatNumber(contributionStreak?.totalContributions ?? 0)}
				</text>
				<text x="45" y="34" fill="${colors.textSecondary}" font-size="11" text-anchor="middle">
					Contributions
				</text>

				<!-- Longest Streak -->
				<rect x="100" y="0" width="90" height="40" fill="${colors.cardBg}" rx="6" opacity="0"/>
				<text x="145" y="20" fill="${colors.text}" font-size="16" font-weight="700" text-anchor="middle">
					${formatNumber(contributionStreak?.longestStreak ?? 0)} days
				</text>
				<text x="145" y="34" fill="${colors.textSecondary}" font-size="11" text-anchor="middle">
					Longest
				</text>
			</g>
		` : '';

	return `
		<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
			<defs>
			    <!-- Web Font定義 -->
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap');
                    text { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
                </style>
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
				<text x="60" y="68" fill="${colors.background}" font-size="24" font-weight="700" text-anchor="middle">
					${(user.name || user.login).charAt(0).toUpperCase()}
				</text>
			`}

			<!-- User Info -->
			<text x="90" y="55" fill="${colors.text}" font-size="20" font-weight="700" text-anchor="start">
				${displayName}
			</text>
			<text x="90" y="75" fill="${colors.textSecondary}" font-size="15" text-anchor="start">
				@${displayLogin}
			</text>

            <!-- Score Display -->
            <rect x="35" y="105" width="250" height="90" fill="url(#score-gradient)" rx="8" opacity="0.15"/>
            ${renderScoreIcon(scoreInfo.icon as keyof typeof ICON_PATHS, 50, 110, 32, scoreInfo.color)}
            <text x="90" y="140" text-anchor="start" fill="${scoreInfo.color}" font-size="36" font-weight="800" filter="url(#glow)">
                ${score} / 100
            </text>
            <text x="50" y="165" fill="${scoreInfo.color}" font-size="16" font-weight="600">
                ${scoreInfo.rank}
            </text>
            <text x="50" y="185" fill="${colors.textSecondary}" font-size="13">
                Developer Score
            </text>

			<!-- Quick Stats -->
			<g transform="translate(35, 230)">
				${renderIcon('chartBar', 0, -13, 16, colors.accent)}
				<text x="22" y="0" fill="${colors.accent}" font-size="16" font-weight="600">
					Quick Stats
				</text>
				${renderIcon('code', 0, 18, 14, colors.text)}
				<text x="19" y="30" fill="${colors.text}" font-size="14">
					${formatNumber(totalLines)} <tspan font-size="10">lines(est)</tspan>
				</text>
				${renderIcon('star', 0, 43, 14, colors.text)}
				<text x="19" y="55" fill="${colors.text}" font-size="14">
					${formatNumber(totalStars)} <tspan font-size="10">stars</tspan>
				</text>
				${renderIcon('users', 0, 68, 14, colors.text)}
				<text x="19" y="80" fill="${colors.text}" font-size="14">
					${formatNumber(user.followers)} <tspan font-size="10">followers</tspan>
				</text>
				${renderIcon('package', 0, 93, 14, colors.text)}
				<text x="19" y="105" fill="${colors.text}" font-size="14">
					${formatNumber(user.public_repos)} <tspan font-size="10">repos</tspan>
				</text>

				<!-- Details (右側) -->
				${renderIcon('trendUp', 140, -13, 16, colors.accent)}
				<text x="162" y="0" fill="${colors.accent}" font-size="16" font-weight="600">
					Details
				</text>
				${renderIcon('gitCommit', 140, 18, 14, colors.text)}
				<text x="159" y="30" fill="${colors.text}" font-size="14">
					${formatNumber(totalCommits)} <tspan font-size="10">commits</tspan>
				</text>
				${renderIcon('gitPullRequest', 140, 43, 14, colors.text)}
				<text x="159" y="55" fill="${colors.text}" font-size="14">
					${formatNumber(totalPRs)} <tspan font-size="10">PRs</tspan>
				</text>
				${renderIcon('gitFork', 140, 68, 14, colors.text)}
				<text x="159" y="80" fill="${colors.text}" font-size="14">
					${formatNumber(totalForks)} <tspan font-size="10">forks</tspan>
				</text>
				${renderIcon('calendar', 140, 93, 14, colors.text)}
				<text x="159" y="105" fill="${colors.text}" font-size="14">
					Since ${new Date(user.created_at).getFullYear()}
				</text>
			</g>

			<!-- Middle Section: Score Breakdown -->
			<rect x="320" y="20" width="220" height="360" fill="${colors.cardBg}" rx="8" opacity="0.5"/>

			${renderIcon('target', 340, 35, 18, colors.accent)}
			<text x="364" y="50" fill="${colors.accent}" font-size="18" font-weight="600">
				Score Breakdown
			</text>

			<!-- Score Bars -->
			<g transform="translate(340, 70)">
				<!-- Lines Score -->
				<text x="0" y="15" fill="${colors.text}" font-size="13" font-weight="500">
					Lines (40%)
				</text>
				<rect x="0" y="25" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="25" width="${(scoreBreakdown.linesScore / 100) * 160}" height="6" fill="${colors.green}" rx="3"/>
				<text x="165" y="30" fill="${colors.textSecondary}" font-size="12">
					${scoreBreakdown.linesScore}
				</text>

				<!-- Stars Score -->
				<text x="0" y="55" fill="${colors.text}" font-size="13" font-weight="500">
					Stars (20%)
				</text>
				<rect x="0" y="65" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="65" width="${(scoreBreakdown.starsScore / 100) * 160}" height="6" fill="${colors.yellow}" rx="3"/>
				<text x="165" y="70" fill="${colors.textSecondary}" font-size="12">
					${scoreBreakdown.starsScore}
				</text>

				<!-- PRs/Issues Score -->
				<text x="0" y="95" fill="${colors.text}" font-size="13" font-weight="500">
					PRs/Issues (15%)
				</text>
				<rect x="0" y="105" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="105" width="${(scoreBreakdown.prsIssuesScore / 100) * 160}" height="6" fill="${colors.purple}" rx="3"/>
				<text x="165" y="110" fill="${colors.textSecondary}" font-size="12">
					${scoreBreakdown.prsIssuesScore}
				</text>

				<!-- Commits Score -->
				<text x="0" y="135" fill="${colors.text}" font-size="13" font-weight="500">
					Commits (15%)
				</text>
				<rect x="0" y="145" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="145" width="${(scoreBreakdown.commitsScore / 100) * 160}" height="6" fill="${colors.accent}" rx="3"/>
				<text x="165" y="150" fill="${colors.textSecondary}" font-size="12">
					${scoreBreakdown.commitsScore}
				</text>

				<!-- Reviews Score -->
				<text x="0" y="175" fill="${colors.text}" font-size="13" font-weight="500">
					Reviews (10%)
				</text>
				<rect x="0" y="185" width="160" height="6" fill="${colors.border}" rx="3"/>
				<rect x="0" y="185" width="${(scoreBreakdown.reviewsScore / 100) * 160}" height="6" fill="${colors.red}" rx="3"/>
				<text x="165" y="190" fill="${colors.textSecondary}" font-size="12">
					${scoreBreakdown.reviewsScore}
				</text>
			</g>

			${streakSection}

			<!-- Right Section: Languages -->
			<rect x="560" y="20" width="220" height="360" fill="${colors.cardBg}" rx="8" opacity="0.5"/>

			${renderIcon('bracketsCurly', 580, 35, 18, colors.accent, undefined, '40 40 176 176')}
			<text x="604" y="50" fill="${colors.accent}" font-size="18" font-weight="600">
				Top Languages
			</text>

			${sortedLanguages.map(([lang, count], index) => {
				const y = 85 + index * 50;
				const total = Object.values(languages).reduce((sum: number, val: any) => sum + val, 0);
				const percentage = total > 0 ? ((count as number / total) * 100).toFixed(1) : '0.0';
				const maxBarWidth = 180; // コンテナ幅220 - 左右マージン40
				const barWidth = Math.max(8, ((count as number) / Math.max(...Object.values(languages) as number[])) * maxBarWidth);
				const color = languageColors[lang] || colors.accent;

				return `
					<g transform="translate(580, ${y})">
						<text x="0" y="0" fill="${colors.text}" font-size="14" font-weight="500">
							${lang}
						</text>
						<text x="${maxBarWidth}" y="0" fill="${colors.textSecondary}" font-size="13" text-anchor="end">
							${percentage}%
						</text>
						<rect x="0" y="10" width="${maxBarWidth}" height="8" fill="${colors.border}" rx="4"/>
						<rect x="0" y="10" width="${barWidth}" height="8" fill="${color}" rx="4"/>
					</g>
				`;
			}).join('')}

			<!-- Footer -->
			<text x="20" y="${height - 8}" fill="${colors.textSecondary}" font-size="11" opacity="0.7">
				Powered by yomi4486 • ${new Date().toISOString().split('T')[0]}
			</text>
		</svg>
	`.trim();
}
<script lang="ts">
	import { themes, getThemeNames, type Theme } from '$lib/themes';
	
	let username = '';
	let loading = false;
	let svgContent = '';
	let error = '';
	let selectedTheme = 'dark';

	// 利用可能なテーマを取得
	const availableThemes = getThemeNames().map(name => ({
		value: name,
		label: themes[name].displayName
	}));

	async function generateStats() {
		if (!username.trim()) {
			error = 'GitHubユーザー名を入力してください';
			return;
		}

		loading = true;
		error = '';
		svgContent = '';

		try {
			const params = new URLSearchParams();
			if (selectedTheme !== 'dark') {
				params.set('theme', selectedTheme);
			}
			
			const url = `/api/stats/${encodeURIComponent(username.trim())}${params.toString() ? `?${params.toString()}` : ''}`;
			const response = await fetch(url);
			
			if (!response.ok) {
				throw new Error('ユーザーが見つかりませんでした');
			}

			svgContent = await response.text();
		} catch (err) {
			error = err instanceof Error ? err.message : 'エラーが発生しました';
		} finally {
			loading = false;
		}
	}

	function downloadSVG() {
		if (!svgContent) return;

		const blob = new Blob([svgContent], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${username}-github-stats-${selectedTheme}.svg`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function copyUrl() {
		if (!username.trim()) return;
		
		const params = new URLSearchParams();
		if (selectedTheme !== 'dark') {
			params.set('theme', selectedTheme);
		}
		
		const url = `${window.location.origin}/api/stats/${encodeURIComponent(username.trim())}${params.toString() ? `?${params.toString()}` : ''}`;
		navigator.clipboard.writeText(url).then(() => {
			alert('URLをクリップボードにコピーしました！');
		});
	}

	// テーマが変更されたときに自動再生成
	$: if (username && svgContent && selectedTheme) {
		generateStats();
	}
</script>

<div class="container">
	<header>
		<h1>🚀 GitHub Developer Score</h1>
		<p>GitHubユーザー名を入力して、開発者スコアと統計情報をSVGで生成しよう！</p>
		<div class="score-info">
			<h3>📊 スコア計算について</h3>
			<p>
				<strong>コード行数を重視</strong>した独自のスコアリングシステムで開発者のスキルを評価します：
			</p>
			<ul>
				<li>📝 <strong>コード行数 (40%)</strong> - 実際に書いたコードの総行数</li>
				<li>🌟 <strong>スター数 (20%)</strong> - リポジトリが獲得したスター</li>
				<li>👥 <strong>フォロワー (15%)</strong> - GitHubフォロワー数</li>
				<li>💻 <strong>コミット数 (15%)</strong> - 総コミット数</li>
				<li>📦 <strong>リポジトリ数 (10%)</strong> - パブリックリポジトリ数</li>
			</ul>
		</div>
	</header>

	<div class="form-section">
		<div class="input-group">
			<input 
				type="text" 
				bind:value={username} 
				placeholder="GitHubユーザー名を入力 (例: octocat)"
				on:keydown={(e) => e.key === 'Enter' && generateStats()}
			/>
			<select bind:value={selectedTheme} class="theme-select">
				{#each availableThemes as theme}
					<option value={theme.value}>{theme.label}</option>
				{/each}
			</select>
			<button on:click={generateStats} disabled={loading}>
				{loading ? '生成中...' : '統計生成'}
			</button>
		</div>

		{#if error}
			<div class="error">
				⚠️ {error}
			</div>
		{/if}
	</div>

	{#if svgContent}
		<div class="result-section">
			<div class="theme-info">
				<h3>🎨 選択中のテーマ: {themes[selectedTheme].displayName}</h3>
				<p>テーマを変更すると自動的に再生成されます</p>
			</div>
			
			<div class="svg-container">
				{@html svgContent}
			</div>
			
			<div class="actions">
				<button on:click={downloadSVG} class="download-btn">
					📥 SVGをダウンロード
				</button>
				<button on:click={copyUrl} class="copy-btn">
					🔗 URLをコピー
				</button>
			</div>
		</div>
	{/if}

	<div class="theme-gallery">
		<h3>🎨 テーマギャラリー</h3>
		<p>利用可能なテーマを一覧で確認できます</p>
		<div class="theme-cards">
			{#each availableThemes as theme}
				<div class="theme-card" class:active={selectedTheme === theme.value}>
					<div class="theme-preview" style="background: {themes[theme.value].colors.background}; border-color: {themes[theme.value].colors.border};">
						<div class="preview-header" style="color: {themes[theme.value].colors.text};">
							{theme.label}
						</div>
						<div class="preview-content">
							<div class="preview-bar" style="background: {themes[theme.value].colors.accent};"></div>
							<div class="preview-bar" style="background: {themes[theme.value].colors.green}; width: 80%;"></div>
							<div class="preview-bar" style="background: {themes[theme.value].colors.yellow}; width: 60%;"></div>
						</div>
					</div>
					<button 
						class="theme-select-btn" 
						on:click={() => selectedTheme = theme.value}
						class:active={selectedTheme === theme.value}
					>
						{selectedTheme === theme.value ? '✓ 選択中' : '選択'}
					</button>
				</div>
			{/each}
		</div>
	</div>

	<div class="examples">
		<h3>💡 使用例</h3>
		<div class="example-cards">
			<div class="card">
				<h4>GitHub README埋め込み</h4>
				<div class="code-block">
					<code>![Developer Score](https://github-stats-eta-two.vercel.app/api/stats/{username}?theme={selectedTheme})</code>
				</div>
			</div>
			<div class="card">
				<h4>HTML埋め込み</h4>
				<div class="code-block">
					<code>&lt;img src="https://github-stats-eta-two.vercel.app/api/stats/{username}?theme={selectedTheme}" alt="Developer Score"&gt;</code>
				</div>
				<p style="font-size: 0.85rem; color: #6b7280; margin-top: 0.5rem;">
					Webサイトやポートフォリオに
				</p>
			</div>
			<div class="card">
				<h4>利用可能なテーマ</h4>
				<ul class="theme-list">
					{#each availableThemes as theme}
						<li>
							<code>theme={theme.value}</code> - {theme.label}
						</li>
					{/each}
				</ul>
				<p style="font-size: 0.85rem; color: #6b7280; margin-top: 0.5rem;">
					URLに<code>?theme=テーマ名</code>を追加
				</p>
			</div>
			<div class="card">
				<h4>スコアランク</h4>
				<ul class="rank-list">
					<li>👑 LEGENDARY (90-100)</li>
					<li>🔥 MASTER (80-89)</li>
					<li>⭐ EXPERT (70-79)</li>
					<li>💎 ADVANCED (60-69)</li>
					<li>🚀 INTERMEDIATE (50-59)</li>
					<li>🌱 BEGINNER (30-49)</li>
					<li>👶 NEWCOMER (0-29)</li>
				</ul>
			</div>
		</div>
	</div>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	header h1 {
		font-size: 2.5rem;
		color: #2563eb;
		margin-bottom: 0.5rem;
	}

	header p {
		color: #6b7280;
		font-size: 1.1rem;
		margin-bottom: 1.5rem;
	}

	.score-info {
		background: #f0f9ff;
		border: 2px solid #0ea5e9;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-top: 1.5rem;
		text-align: left;
	}

	.score-info h3 {
		color: #0369a1;
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.score-info p {
		color: #374151;
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	.score-info ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.score-info li {
		color: #4b5563;
		margin-bottom: 0.5rem;
		font-size: 0.95rem;
	}

	.form-section {
		margin-bottom: 3rem;
	}

	.input-group {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	input {
		flex: 2;
		min-width: 250px;
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.theme-select {
		flex: 1;
		min-width: 150px;
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 1rem;
		background: white;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.theme-select:focus {
		outline: none;
		border-color: #2563eb;
	}

	input:focus {
		outline: none;
		border-color: #2563eb;
	}

	button {
		padding: 0.75rem 1.5rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	button:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.error {
		background: #fef2f2;
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid #fecaca;
	}

	.result-section {
		background: #f9fafb;
		padding: 2rem;
		border-radius: 1rem;
		margin-bottom: 3rem;
		width: 100%;
		max-width: 1000px;
		margin-left: auto;
		margin-right: auto;
		box-sizing: border-box;
		overflow: hidden; /* 内容がはみ出すのを防ぐ */
	}

	.theme-info {
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #e0f2fe;
		border-radius: 0.5rem;
		border: 1px solid #0891b2;
	}

	.theme-info h3 {
		margin: 0 0 0.5rem 0;
		color: #0369a1;
		font-size: 1.1rem;
	}

	.theme-info p {
		margin: 0;
		color: #0891b2;
		font-size: 0.9rem;
	}

	.svg-container {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 2rem;
		background: white;
		padding: 1.5rem;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		overflow: hidden;
		width: 100%;
		box-sizing: border-box;
		min-height: 200px;
	}

	.svg-container :global(svg) {
		max-width: 100%;
		width: auto;
		height: auto;
		max-height: 400px;
		object-fit: contain;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.download-btn {
		background: #059669;
	}

	.download-btn:hover {
		background: #047857;
	}

	.copy-btn {
		background: #7c3aed;
	}

	.copy-btn:hover {
		background: #6d28d9;
	}

	.api-info {
		border-top: 1px solid #e5e7eb;
		padding-top: 2rem;
	}

	.api-info h3 {
		margin-bottom: 1rem;
		color: #374151;
	}

	.code-block {
		background: #1f2937;
		color: #f9fafb;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin: 0.5rem 0;
		font-family: 'Courier New', monospace;
		overflow-x: auto;
	}

	.examples {
		margin-bottom: 2rem;
	}

	.examples h3 {
		margin-bottom: 1.5rem;
		color: #374151;
	}

	.theme-gallery {
		margin-bottom: 3rem;
	}

	.theme-gallery h3 {
		margin-bottom: 1rem;
		color: #374151;
	}

	.theme-gallery p {
		margin-bottom: 1.5rem;
		color: #6b7280;
	}

	.theme-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.theme-card {
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		overflow: hidden;
		transition: all 0.2s;
		background: white;
	}

	.theme-card:hover {
		border-color: #3b82f6;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.theme-card.active {
		border-color: #3b82f6;
		box-shadow: 0 0 0 1px #3b82f6;
	}

	.theme-preview {
		padding: 1rem;
		border: 1px solid;
		min-height: 80px;
		position: relative;
	}

	.preview-header {
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.preview-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.preview-bar {
		height: 4px;
		border-radius: 2px;
		width: 100%;
	}

	.theme-select-btn {
		width: 100%;
		padding: 0.5rem;
		border: none;
		background: #f3f4f6;
		color: #374151;
		cursor: pointer;
		transition: background 0.2s;
		font-size: 0.85rem;
	}

	.theme-select-btn:hover {
		background: #e5e7eb;
	}

	.theme-select-btn.active {
		background: #3b82f6;
		color: white;
	}

	.theme-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.theme-list li {
		padding: 0.25rem 0;
		font-size: 0.9rem;
		color: #4b5563;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.theme-list code {
		background: #f3f4f6;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.8rem;
		color: #1f2937;
	}

	.example-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.card {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.card h4 {
		margin-bottom: 1rem;
		color: #374151;
	}

	.rank-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.rank-list li {
		padding: 0.25rem 0;
		font-size: 0.9rem;
		color: #4b5563;
	}

	a {
		color: #2563eb;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.svg-container :global(svg) {
			transform: scale(0.85) !important;
			transform-origin: center !important;
		}
	}

	@media (max-width: 640px) {
		.container {
			padding: 1rem;
		}

		.input-group {
			flex-direction: column;
		}

		.input, .theme-select {
			min-width: auto;
			width: 100%;
		}

		.actions {
			flex-direction: column;
		}

		.score-info {
			padding: 1rem;
		}

		.score-info h3 {
			font-size: 1rem;
		}

		.result-section {
			padding: 1rem;
			margin: 0 -1rem;
		}

		.svg-container {
			padding: 0.5rem;
			min-height: 120px;
			max-height: 180px;
			overflow: hidden;
		}

		.svg-container :global(svg) {
			max-width: 100% !important;
			width: auto !important;
			height: auto !important;
			transform: scale(0.7) !important;
			transform-origin: center !important;
		}

		.example-cards {
			grid-template-columns: 1fr;
		}

		.theme-cards {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		}
	}

	@media (max-width: 480px) {
		.container {
			padding: 0.75rem;
		}

		.result-section {
			padding: 0.75rem;
			margin: 0 -0.75rem;
		}

		.svg-container {
			padding: 0.5rem;
			min-height: 100px;
			max-height: 150px;
			overflow: hidden;
		}

		.svg-container :global(svg) {
			transform: scale(0.6) !important;
			transform-origin: center !important;
		}
	}

	@media (max-width: 360px) {
		.svg-container {
			min-height: 80px;
			max-height: 120px;
			overflow: hidden;
		}

		.svg-container :global(svg) {
			transform: scale(0.5) !important;
			transform-origin: center !important;
		}
	}
</style>

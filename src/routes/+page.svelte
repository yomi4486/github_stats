<script lang="ts">
	let username = '';
	let loading = false;
	let svgContent = '';
	let error = '';

	async function generateStats() {
		if (!username.trim()) {
			error = 'GitHubユーザー名を入力してください';
			return;
		}

		loading = true;
		error = '';
		svgContent = '';

		try {
			const response = await fetch(`/api/stats/${encodeURIComponent(username.trim())}`);
			
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
		a.download = `${username}-github-stats.svg`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function copyUrl() {
		if (!username.trim()) return;
		
		const url = `${window.location.origin}/api/stats/${encodeURIComponent(username.trim())}`;
		navigator.clipboard.writeText(url).then(() => {
			alert('URLをクリップボードにコピーしました！');
		});
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

	<div class="examples">
		<h3>💡 使用例</h3>
		<div class="example-cards">
			<div class="card">
				<h4>GitHub README埋め込み</h4>
				<div class="code-block">
					<code>![Developer Score](https://yoursite.com/api/stats/{username})</code>
				</div>
			</div>
			<div class="card">
				<h4>HTML埋め込み</h4>
				<div class="code-block">
					<code>&lt;img src="https://yoursite.com/api/stats/{username}" alt="Developer Score"&gt;</code>
				</div>
				<p style="font-size: 0.85rem; color: #6b7280; margin-top: 0.5rem;">
					Webサイトやポートフォリオに
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
		max-width: 800px;
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
	}

	input {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 1rem;
		transition: border-color 0.2s;
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
	}

	.svg-container {
		display: flex;
		justify-content: center;
		margin-bottom: 2rem;
		background: white;
		padding: 1.5rem;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		overflow-x: auto;
	}

	.svg-container :global(svg) {
		max-width: 100%;
		height: auto;
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

	@media (max-width: 640px) {
		.container {
			padding: 1rem;
		}

		.input-group {
			flex-direction: column;
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

		.svg-container {
			padding: 0.5rem;
			overflow-x: auto;
		}

		.example-cards {
			grid-template-columns: 1fr;
		}
	}
</style>

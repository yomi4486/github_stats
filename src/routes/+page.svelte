<script lang="ts">
    import { themes, getThemeNames, type Theme } from '$lib/themes';
    import { generateSVG } from '$lib/svg-generator';
    import { onMount } from 'svelte';
    
    let username = '';
    let loading = false;
    let svgContent = '';
    let error = '';
    let selectedTheme = 'dark';
    let cachedData: any = null; // GitHubデータをキャッシュ
    let darkMode = false; // ページのダークモード状態

    // ダークモードの初期化とローカルストレージからの読み込み
    onMount(() => {
        // ローカルストレージからダークモード設定を読み込み
        const savedDarkMode = localStorage.getItem('github-stats-dark-mode');
        if (savedDarkMode !== null) {
            darkMode = savedDarkMode === 'true';
        } else {
            // システムの設定を確認
            darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        
        // システムの設定変更を監視
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
            if (localStorage.getItem('github-stats-dark-mode') === null) {
                darkMode = e.matches;
            }
        };
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        
        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    });

    // ダークモード切り替え関数
    function toggleDarkMode() {
        darkMode = !darkMode;
        localStorage.setItem('github-stats-dark-mode', darkMode.toString());
    }

    // 利用可能なテーマを取得
    const availableThemes = getThemeNames().map(name => ({
        value: name,
        label: themes[name].displayName
    }));

    // クライアントサイドでアバターを取得する関数
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

    // クライアントサイドでGitHub統計を取得する関数
    async function generateStats() {
        if (!username.trim()) {
            error = 'GitHubユーザー名を入力してください';
            return;
        }

        console.log('Generating stats for:', username, 'with theme:', selectedTheme);
        loading = true;
        error = '';

        try {
            // キャッシュされたデータがない場合のみAPIリクエストを送信
            if (!cachedData || cachedData.username !== username.trim()) {
                console.log('Fetching new data from API...');
                const params = new URLSearchParams();
                params.set('format', 'json'); // JSONフォーマットでデータを取得
                
                const url = `/api/stats/${encodeURIComponent(username.trim())}?${params.toString()}`;
                console.log('Fetching URL:', url);
                
                const response = await fetch(url);
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error('ユーザーが見つかりませんでした');
                }

                cachedData = await response.json();
                cachedData.username = username.trim(); // ユーザー名をキャッシュに保存
                
                // サーバー側でアバターが取得できなかった場合、クライアントサイドで再試行
                if (!cachedData.avatarBase64 && cachedData.user?.avatar_url) {
                    console.log('Fetching avatar on client side...');
                    cachedData.avatarBase64 = await fetchAvatarAsBase64(cachedData.user.avatar_url);
                }
                
                console.log('Data cached for user:', cachedData.username);
            } else {
                console.log('Using cached data for user:', cachedData.username);
            }

            // キャッシュされたデータから選択されたテーマでSVGを生成
            const theme = themes[selectedTheme];
            const stats = {
                user: cachedData.user,
                totalStars: cachedData.totalStars || 0,
                totalForks: cachedData.totalForks || 0,
                languages: cachedData.languages || {},
                totalCommits: cachedData.totalCommits || cachedData.commits || 0,
                totalLines: cachedData.totalLines || 0,
                totalPRs: cachedData.totalPRs || cachedData.pullRequests || 0,
                score: cachedData.score || 0,
                scoreBreakdown: cachedData.scoreBreakdown || {
                    linesScore: 0,
                    starsScore: 0,
                    followersScore: 0,
                    commitsScore: 0,
                    reposScore: 0,
                    totalScore: 0
                },
                avatarBase64: cachedData.avatarBase64 || null
            };
            svgContent = generateSVG(stats, cachedData.avatarBase64 || null, theme);
            console.log('SVG generated with theme:', selectedTheme);
        } catch (err) {
            console.error('Error generating stats:', err);
            error = err instanceof Error ? err.message : 'エラーが発生しました';
            cachedData = null; // エラー時はキャッシュをクリア
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

    // 前回のテーマを記録して無限ループを防ぐ
    let previousTheme = selectedTheme;
    
    // テーマが変更されたときに自動再生成（キャッシュされたデータがある場合）
    $: if (cachedData && selectedTheme !== previousTheme) {
        console.log('Theme changed from', previousTheme, 'to', selectedTheme);
        previousTheme = selectedTheme;
        
        // キャッシュされたデータから新しいテーマでSVGを生成
        const theme = themes[selectedTheme];
        const stats = {
            user: cachedData.user,
            totalStars: cachedData.totalStars || 0,
            totalForks: cachedData.totalForks || 0,
            languages: cachedData.languages || {},
            totalCommits: cachedData.totalCommits || cachedData.commits || 0,
            totalLines: cachedData.totalLines || 0,
            totalPRs: cachedData.totalPRs || cachedData.pullRequests || 0,
            score: cachedData.score || 0,
            scoreBreakdown: cachedData.scoreBreakdown || {
                linesScore: 0,
                starsScore: 0,
                followersScore: 0,
                commitsScore: 0,
                reposScore: 0,
                totalScore: 0
            },
            avatarBase64: cachedData.avatarBase64 || null
        };
        svgContent = generateSVG(stats, cachedData.avatarBase64 || null, theme);
        console.log('SVG regenerated with new theme:', selectedTheme);
    }

    // ユーザー名が変更されたときはキャッシュをクリア
    $: if (username && cachedData && cachedData.username !== username.trim()) {
        console.log('Username changed, clearing cache');
        cachedData = null;
        svgContent = '';
    }
</script>

<div class="container" class:dark={darkMode}>
    <header>
        <div class="header-top">
            <h1>🚀 GitHub Developer Score</h1>
            <button class="theme-toggle" on:click={toggleDarkMode} title={darkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
                {darkMode ? '☀️' : '🌙'}
            </button>
        </div>
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
                    <div 
                        class="theme-preview" 
                        style="background: linear-gradient(135deg, {themes[theme.value].gradients.background[0]}, {themes[theme.value].gradients.background[1]}); border-color: {themes[theme.value].colors.border};"
                        on:click={() => selectedTheme = theme.value}
                        role="button"
                        tabindex="0"
                        on:keydown={(e) => e.key === 'Enter' && (selectedTheme = theme.value)}
                    >
                        <div class="preview-header" style="color: {themes[theme.value].colors.text};">
                            {theme.label}
                        </div>
                        <div class="preview-content">
                            <div class="preview-bar" style="background: linear-gradient(90deg, {themes[theme.value].gradients.score[0]}, {themes[theme.value].gradients.score[1]});"></div>
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
    :global(body) {
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s ease;
    }

    /* ダークモードの基本スタイル */
    .container.dark {
        background-color: #0f172a;
        color: #f1f5f9;
    }

    :global(body:has(.container.dark)) {
        background-color: #020617;
        color: #f1f5f9;
    }

    header {
        text-align: center;
        margin-bottom: 3rem;
    }

    .header-top {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }

    .theme-toggle {
        padding: 0.5rem;
        background: transparent;
        border: 2px solid #e5e7eb;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
    }

    .theme-toggle:hover {
        transform: scale(1.1);
        background: #f3f4f6;
    }

    .container.dark .theme-toggle {
        border-color: #475569;
        color: #f1f5f9;
    }

    .container.dark .theme-toggle:hover {
        background: #334155;
    }

    header h1 {
        font-size: 2.5rem;
        color: #2563eb;
        margin: 0;
    }

    .container.dark header h1 {
        color: #60a5fa;
    }

    header p {
        color: #6b7280;
        font-size: 1.1rem;
        margin-bottom: 1.5rem;
    }

    .container.dark header p {
        color: #94a3b8;
    }

    .score-info {
        background: #f0f9ff;
        border: 2px solid #0ea5e9;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-top: 1.5rem;
        text-align: left;
    }

    .container.dark .score-info {
        background: #0f172a;
        border-color: #0284c7;
    }

    .score-info h3 {
        color: #0369a1;
        margin-bottom: 1rem;
        font-size: 1.1rem;
    }

    .container.dark .score-info h3 {
        color: #0ea5e9;
    }

    .score-info p {
        color: #374151;
        margin-bottom: 1rem;
        font-size: 1rem;
    }

    .container.dark .score-info p {
        color: #cbd5e1;
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

    .container.dark .score-info li {
        color: #94a3b8;
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
        background: white;
        color: #1f2937;
    }

    .container.dark input {
        background: #1e293b;
        border-color: #475569;
        color: #f1f5f9;
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
        color: #1f2937;
    }

    .container.dark .theme-select {
        background: #1e293b;
        border-color: #475569;
        color: #f1f5f9;
    }

    .theme-select:focus, input:focus {
        outline: none;
        border-color: #2563eb;
    }

    .container.dark .theme-select:focus,
    .container.dark input:focus {
        border-color: #60a5fa;
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

    .container.dark button:disabled {
        background: #475569;
    }

    .error {
        background: #fef2f2;
        color: #dc2626;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid #fecaca;
    }

    .container.dark .error {
        background: #1e1b1b;
        border-color: #7f1d1d;
        color: #f87171;
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
        overflow: hidden;
    }

    .container.dark .result-section {
        background: #1e293b;
    }

    .theme-info {
        text-align: center;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: #e0f2fe;
        border-radius: 0.5rem;
        border: 1px solid #0891b2;
    }

    .container.dark .theme-info {
        background: #0f172a;
        border-color: #0ea5e9;
    }

    .theme-info h3 {
        margin: 0 0 0.5rem 0;
        color: #0369a1;
        font-size: 1.1rem;
    }

    .container.dark .theme-info h3 {
        color: #0ea5e9;
    }

    .theme-info p {
        margin: 0;
        color: #0891b2;
        font-size: 0.9rem;
    }

    .container.dark .theme-info p {
        color: #38bdf8;
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

    .container.dark .svg-container {
        background: #0f172a;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
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

    .code-block {
        background: #1f2937;
        color: #f9fafb;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
        font-family: 'Courier New', monospace;
        overflow-x: auto;
    }

    .container.dark .code-block {
        background: #0f172a;
        border: 1px solid #334155;
    }

    .examples {
        margin-bottom: 2rem;
    }

    .examples h3 {
        margin-bottom: 1.5rem;
        color: #374151;
    }

    .container.dark .examples h3 {
        color: #f1f5f9;
    }

    .theme-gallery {
        margin-bottom: 3rem;
    }

    .theme-gallery h3 {
        margin-bottom: 1rem;
        color: #374151;
    }

    .container.dark .theme-gallery h3 {
        color: #f1f5f9;
    }

    .theme-gallery p {
        margin-bottom: 1.5rem;
        color: #6b7280;
    }

    .container.dark .theme-gallery p {
        color: #94a3b8;
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

    .container.dark .theme-card {
        border-color: #475569;
        background: #1e293b;
    }

    .theme-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .container.dark .theme-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .theme-card.active {
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
    }

    .container.dark .theme-card.active {
        border-color: #60a5fa;
        box-shadow: 0 0 0 1px #60a5fa;
    }

    .theme-preview {
        padding: 1rem;
        border: 1px solid;
        min-height: 80px;
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 0.375rem 0.375rem 0 0;
    }

    .theme-preview:hover {
        transform: translateY(-1px);
        box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .container.dark .theme-preview:hover {
        box-shadow: inset 0 0 0 2px rgba(96, 165, 250, 0.3);
    }

    .theme-card.active .theme-preview {
        box-shadow: inset 0 0 0 2px #3b82f6;
    }

    .container.dark .theme-card.active .theme-preview {
        box-shadow: inset 0 0 0 2px #60a5fa;
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

    .container.dark .theme-select-btn {
        background: #334155;
        color: #cbd5e1;
    }

    .theme-select-btn:hover {
        background: #e5e7eb;
    }

    .container.dark .theme-select-btn:hover {
        background: #475569;
    }

    .theme-select-btn.active {
        background: #3b82f6;
        color: white;
    }

    .container.dark .theme-select-btn.active {
        background: #60a5fa;
        color: #0f172a;
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

    .container.dark .theme-list li {
        color: #94a3b8;
    }

    .theme-list code {
        background: #f3f4f6;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        color: #1f2937;
    }

    .container.dark .theme-list code {
        background: #334155;
        color: #e2e8f0;
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

    .container.dark .card {
        background: #1e293b;
        border-color: #475569;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

	.card h4 {
        margin-bottom: 1rem;
        color: #374151;
    }

    .container.dark .card h4 {
        color: #f1f5f9;
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

    .container.dark .rank-list li {
        color: #94a3b8;
    }

	@media (max-width: 768px) {
        .svg-container :global(svg) {
            transform: scale(0.85) !important;
            transform-origin: center !important;
        }

        .header-top {
            justify-content: space-between;
            width: 100%;
        }

        .header-top h1 {
            font-size: 2rem;
        }
    }

	@media (max-width: 640px) {
        .container {
            padding: 1rem;
        }

        .input-group {
            flex-direction: column;
        }

        input, .theme-select {
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

        .header-top {
            flex-direction: column;
            gap: 0.5rem;
        }

        .header-top h1 {
            font-size: 1.8rem;
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
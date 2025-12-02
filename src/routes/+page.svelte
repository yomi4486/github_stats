<script lang="ts">
    import { themes, getThemeNames, type Theme } from '$lib/themes';
    import { generateSVG } from '$lib/svg-generator';
    import { onMount } from 'svelte';

    /**
     * SVGをレスポンシブ対応に変換する関数
     */
    function makeResponsive(svg: string): string {
        return svg.replace(
            /width="([0-9]+)" height="([0-9]+)"/,
            'width="100%" height="100%" viewBox="0 0 $1 $2" preserveAspectRatio="xMidYMid meet"'
        );
    }

    let username = '';
    let loading = false;
    let svgContent = ''; // 表示用のレスポンシブSVG
    let originalSvgContent = ''; // ダウンロード・コピー用の元のSVG
    let error = '';
    let selectedTheme = 'dark';
    let cachedData: any = null; // GitHubデータをキャッシュ
    let includeStreak = false; // ストリークを取得するかどうか（デフォルト: false）
    let themeMode: 'system' | 'dark' | 'light' = 'system'; // テーマモード
    let darkMode = false; // 実際の表示状態
    let copyMessage = ''; // コピー成功メッセージ

    // システムテーマの監視用
    let systemMediaQuery: MediaQueryList;

    // ダークモードの初期化とローカルストレージからの読み込み
    onMount(() => {
        // ローカルストレージからテーマ設定を読み込み
        const savedThemeMode = localStorage.getItem('github-stats-theme-mode') as 'system' | 'dark' | 'light' | null;
        if (savedThemeMode && ['system', 'dark', 'light'].includes(savedThemeMode)) {
            themeMode = savedThemeMode;
        }

        // システムテーマの監視を設定
        systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        updateDarkMode();

        const handleSystemThemeChange = () => {
            if (themeMode === 'system') {
                updateDarkMode();
            }
        };

        systemMediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => {
            systemMediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    });

    // テーマモードに基づいてdarkModeを更新
    function updateDarkMode() {
        switch (themeMode) {
            case 'system':
                darkMode = systemMediaQuery?.matches ?? false;
                break;
            case 'dark':
                darkMode = true;
                break;
            case 'light':
                darkMode = false;
                break;
        }
    }

    // テーマモード切り替え関数
    function cycleThemeMode() {
        const modes: Array<'system' | 'dark' | 'light'> = ['system', 'light', 'dark'];
        const currentIndex = modes.indexOf(themeMode);
        themeMode = modes[(currentIndex + 1) % modes.length];
        
        localStorage.setItem('github-stats-theme-mode', themeMode);
        updateDarkMode();
    }

    // テーマモードアイコンとタイトルを取得（リアクティブに）
    $: themeModeDisplay = (() => {
        switch (themeMode) {
            case 'system':
                return { icon: '⚙️', title: 'システムテーマ (ライトモードに切り替え)' };
            case 'light':
                return { icon: '☀️', title: 'ライトモード (ダークモードに切り替え)' };
            case 'dark':
                return { icon: '🌙', title: 'ダークモード (システムテーマに切り替え)' };
        }
    })();

    // テーマモードが変更されたときにdarkModeを更新
    $: {
        updateDarkMode();
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

    function copyToClipboard(text: string, type: string) {
        navigator.clipboard.writeText(text).then(() => {
            copyMessage = type;
            setTimeout(() => copyMessage = '', 2000);
        });
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
            // キャッシュされたデータがない場合、またはユーザー名/ストリーク設定が変わった場合にAPIリクエストを送信
            if (!cachedData || cachedData.username !== username.trim() || cachedData.streakRequested !== includeStreak) {
                console.log('Fetching new data from API...');
                const params = new URLSearchParams();
                params.set('format', 'json'); // JSONフォーマットでデータを取得
                if (includeStreak) params.set('streak', 'true');

                const url = `/api/stats/${encodeURIComponent(username.trim())}?${params.toString()}`;
                console.log('Fetching URL:', url);

                const response = await fetch(url);
                console.log('Response status:', response.status);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('ユーザーが見つかりませんでした');
                    } else if (response.status === 429) {
                        throw new Error('GitHub APIのレート制限に達しました。しばらく待ってから再試行してください。');
                    } else if (response.status === 503) {
                        throw new Error('GitHub APIが一時的に利用できません。後でもう一度お試しください。');
                    } else {
                        throw new Error('データの取得に失敗しました');
                    }
                }

                cachedData = await response.json();
                cachedData.username = username.trim(); // ユーザー名をキャッシュに保存
                cachedData.streakRequested = includeStreak; // どの設定で取得したかを保存

                console.log('Streak requested:', includeStreak);

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
                    prsIssuesScore: 0,
                    commitsScore: 0,
                    reviewsScore: 0,
                    totalScore: 0
                },
                contributionStreak: cachedData.contributionStreak || {
                    currentStreak: 0,
                    longestStreak: 0,
                    totalContributions: 0
                },
                avatarBase64: cachedData.avatarBase64 || null
            };
            // SVGを生成
            originalSvgContent = generateSVG(stats, cachedData.avatarBase64 || null, theme);
            svgContent = makeResponsive(originalSvgContent); // 表示は常にレスポンシブ版

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
        if (!originalSvgContent) return;

        const blob = new Blob([originalSvgContent], { type: 'image/svg+xml' });
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

        if (includeStreak) params.set('streak', 'true');

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
                prsIssuesScore: 0,
                commitsScore: 0,
                reviewsScore: 0,
                totalScore: 0
            },
            contributionStreak: cachedData.contributionStreak || {
                currentStreak: 0,
                longestStreak: 0,
                totalContributions: 0
            },
            avatarBase64: cachedData.avatarBase64 || null
        };
        // SVGを生成
        originalSvgContent = generateSVG(stats, cachedData.avatarBase64 || null, theme);
        svgContent = makeResponsive(originalSvgContent); // 表示は常にレスポンシブ版

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
            <div class="theme-controls">
                <!-- 現在のテーマモード表示（小さく右上に） -->
                <div class="theme-mode-indicator">
                    <span class="mode-label">
                        {#if themeMode === 'system'}
                            ⚙️ システム
                        {:else if themeMode === 'light'}
                            ☀️ ライト
                        {:else}
                            🌙 ダーク
                        {/if}
                    </span>
                </div>
                <button 
                    class="theme-toggle" 
                    on:click={cycleThemeMode} 
                    title={themeModeDisplay.title}
                >
                    {themeModeDisplay.icon}
                </button>
            </div>
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
                <li>� <strong>PRs/Issues (15%)</strong> - プルリクエストとIssueの合計数</li>
                <li>💻 <strong>コミット数 (15%)</strong> - 総コミット数</li>
                <li>� <strong>レビュー数 (10%)</strong> - 行ったコードレビュー数</li>
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
            <div class="control-box">
                <label class="streak-label" aria-label="ストリークを表示">
                    <input
                        type="checkbox"
                        bind:checked={includeStreak}
                        class="streak-checkbox"
                    />
                    <span>ストリークを表示</span>
                </label>
            </div>
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
                <button on:click={copyUrl} class="copy-url-btn">
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
                <button
                    class="copy-icon-btn"
                    on:click={() => copyToClipboard(`![Developer Score](https://github-stats-eta-two.vercel.app/api/stats/${username}?theme=${selectedTheme}${includeStreak ? '&streak=true' : ''})`, 'readme')}
                    title="コピー"
                >
                    {#if copyMessage === 'readme'}
                        ✓
                    {:else}
                        <svg width="16" height="16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-width="3" stroke="currentColor" fill="none">
                            <rect x="11.13" y="17.72" width="33.92" height="36.85" rx="2.5"/>
                            <path d="M19.35,14.23V13.09a3.51,3.51,0,0,1,3.33-3.66H49.54a3.51,3.51,0,0,1,3.33,3.66V42.62a3.51,3.51,0,0,1-3.33,3.66H48.39"/>
                        </svg>
                    {/if}
                </button>
                <div class="code-block">
                    <code>![Developer Score](https://github-stats-eta-two.vercel.app/api/stats/{username}?theme={selectedTheme}{includeStreak ? '&streak=true' : ''})</code>
                </div>
            </div>
            <div class="card">
                <h4>HTML埋め込み</h4>
                <button
                    class="copy-icon-btn"
                    on:click={() => copyToClipboard(`<img src="https://github-stats-eta-two.vercel.app/api/stats/${username}?theme=${selectedTheme}${includeStreak ? '&streak=true' : ''}" alt="Developer Score">`, 'html')}
                    title="コピー"
                >
                    {#if copyMessage === 'html'}
                        ✓
                    {:else}
                        <svg width="16" height="16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-width="3" stroke="currentColor" fill="none">
                            <rect x="11.13" y="17.72" width="33.92" height="36.85" rx="2.5"/>
                            <path d="M19.35,14.23V13.09a3.51,3.51,0,0,1,3.33-3.66H49.54a3.51,3.51,0,0,1,3.33,3.66V42.62a3.51,3.51,0,0,1-3.33,3.66H48.39"/>
                        </svg>
                    {/if}
                </button>
                <div class="code-block">
                    <code>&lt;img src="https://github-stats-eta-two.vercel.app/api/stats/{username}?theme={selectedTheme}{includeStreak ? '&streak=true' : ''}" alt="Developer Score"&gt;</code>
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
                            <span><code>theme={theme.value}</code></span>
                            <span class="theme-separator">-</span>
                            <span>{theme.label}</span>
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
        position: relative;
    }

    .theme-controls {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    header h1 {
        font-size: 2.5rem;
        color: #2563eb;
        margin: 0;
        text-align: center;
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
        position: relative;
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

    /* テーマモード表示インジケーター - 小さく右上に */
    .theme-mode-indicator {
        text-align: right;
    }

    .mode-label {
        font-size: 0.75rem;
        color: #6b7280;
        background: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        display: inline-block;
        transition: all 0.3s ease;
        white-space: nowrap;
    }

    .container.dark .mode-label {
        color: #94a3b8;
        background: #334155;
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

    /* Small control box to visually match other inputs/buttons */
    .control-box {
        display: flex;
        align-items: center;
        padding: 0.4rem 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        background: white;
        box-sizing: border-box;
        flex: 0 0 auto;
        justify-content: center;
    }

    .container.dark .control-box {
        background: #1e293b;
        border-color: #475569;
    }

    .streak-label {
        display: flex;
        align-items: center;
        color: #9ca3af;
        font-size: 0.95rem;
        cursor: pointer;
        margin: 0;
        gap: 0.5rem;
        justify-content: center;
        flex: 0 0 auto;
    }

    .streak-checkbox {
        width: 18px;
        height: 18px;
        /* Ensure native checkbox rendering even if global input rules override appearance */
        appearance: auto !important;
        -webkit-appearance: checkbox !important;
        -moz-appearance: checkbox !important;
        background: transparent;
        padding: 0;
        margin: 0;
        vertical-align: middle;
        accent-color: #2563eb;
        /* Prevent generic `input` rules from making the checkbox stretch */
        flex: 0 0 auto;
        min-width: auto;
    }

    input {
        flex: 1 1 420px;
        min-width: 240px;
        padding: 0.75rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        font-size: 1rem;
        transition: border-color 0.2s;
        background: white;
        color: #1f2937;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        box-sizing: border-box;
    }

    .container.dark input {
        background: #1e293b;
        border-color: #475569;
        color: #f1f5f9;
    }

    .theme-select {
        flex: 0 0 160px;
        padding: 0.75rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        font-size: 1rem;
        background: white;
        cursor: pointer;
        transition: border-color 0.2s;
        color: #1f2937;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        box-sizing: border-box;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 0.7rem center;
        background-size: 1.2em;
        padding-right: 2.5rem;
    }

    .container.dark .theme-select {
        background-color: #1e293b;
        border-color: #475569;
        color: #f1f5f9;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f1f5f9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    }

    .theme-select:focus, input:focus {
        outline: none;
        border-color: #2563eb;
    }

    .input-group button {
        flex: 0 0 auto;
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

    .copy-url-btn {
        background: #7c3aed;
    }

    .copy-url-btn:hover {
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

    .copy-icon-btn {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 2rem;
        height: 2rem;
        padding: 0;
        background: #9ca3af;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-size: 1.1rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }

    .copy-icon-btn:hover {
        background: #6b7280;
        transform: scale(1.05);
    }

    .copy-icon-btn svg {
        width: 16px;
        height: 16px;
    }

    .container.dark .copy-icon-btn {
        background: #475569;
    }

    .container.dark .copy-icon-btn:hover {
        background: #64748b;
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
        display: grid;
        grid-template-columns: 110px 20px 1fr;
        align-items: center;
        gap: 0;
    }

    .theme-list li > span:first-child {
        display: flex;
        justify-content: flex-start;
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
        display: inline-block;
    }

    .container.dark .theme-list code {
        background: #334155;
        color: #e2e8f0;
    }

    .theme-separator {
        text-align: center;
        color: #6b7280;
    }

    .container.dark .theme-separator {
        color: #94a3b8;
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
        position: relative;
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
            /* レスポンシブSVGを使用するのでtransformは不要 */
            max-width: 100%;
            height: auto;
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
            align-items: stretch;
            gap: 0.75rem;
        }

        .input-group input,
        .input-group .theme-select,
        .input-group button {
            width: 100%;
            min-width: auto;
            flex: none;
        }

        input, .theme-select {
            min-width: auto;
            width: 100%;
            font-size: 16px; /* iOSのズーム防止 */
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
            margin: 1rem 0;
        }

        .svg-container {
            padding: 0.5rem;
            min-height: 200px;
            overflow: hidden;
        }

        .theme-info {
            margin-left: 0;
            margin-right: 0;
        }

        .svg-container :global(svg) {
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
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

        .theme-list {
            padding-left: 1rem;
        }

        .theme-list li {
            grid-template-columns: 140px 20px 1fr;
        }

        .theme-list code {
            font-size: 0.75rem;
        }

        .copy-icon-btn {
            width: 1.75rem;
            height: 1.75rem;
            font-size: 1rem;
            top: 0.25rem;
            right: 0.25rem;
            background: #9ca3af;
        }

        .copy-icon-btn:hover {
            background: #6b7280;
        }

        .container.dark .copy-icon-btn {
            background: #475569;
        }

        .container.dark .copy-icon-btn:hover {
            background: #64748b;
        }
    }

    @media (max-width: 480px) {
        .container {
            padding: 0.75rem;
        }

        .result-section {
            padding: 0.75rem;
            margin: 1rem 0;
        }

        .svg-container {
            padding: 0.5rem;
            min-height: 180px;
            overflow: visible;
        }

        .theme-info {
            margin-left: 0;
            margin-right: 0;
            padding: 0.75rem;
        }

        .actions {
            padding: 0 0.5rem;
        }

        .actions button {
            width: 100%;
            margin-bottom: 0.5rem;
        }

        .svg-container :global(svg) {
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
        }

        .theme-cards {
            grid-template-columns: 1fr;
        }

        .score-info ul {
            padding-left: 1rem;
        }
    }

    @media (max-width: 360px) {
        .svg-container {
            min-height: 150px;
            overflow: visible;
        }

        .svg-container :global(svg) {
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
        }
    }
</style>
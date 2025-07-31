![Developer Score](https://github-stats-eta-two.vercel.app/api/stats/yomi4486?r=2)

GitHubユーザーの公開統計情報を分析し、**コード行数を重視**した独自のスコアリングで開発者スキルを評価・可視化するリドミデコ

## テーマ(要望があれば増やします🎉)
<img width="100%" alt="Screenshot 2025-07-31 at 19 13 54" src="https://github.com/user-attachments/assets/036a8111-575e-427f-b8ca-9dd7aab518b0" />


## ✨ 特徴

- 📊 GitHubユーザーの統計情報を総合分析
- � **コード行数重視**の独自スコアリング（40%の重み付け）
- 🏆 7段階のランクシステム（NEWCOMER → LEGENDARY）
- �🎨 美しいSVGグラフィックで表示
- 📱 レスポンシブデザイン
- 🔗 READMEやWebサイトに簡単埋め込み
- 📥 SVGファイルのダウンロード
- 🌐 RESTful API

## 📊 スコア計算システム

### 重み付け
- 📝 **コード行数 (40%)** - 実際に書いたコードの総行数
- 🌟 **スター数 (20%)** - リポジトリが獲得したスター数
- 👥 **フォロワー (15%)** - GitHubフォロワー数
- 💻 **コミット数 (15%)** - 総コミット数
- 📦 **リポジトリ数 (10%)** - パブリックリポジトリ数

### ランクシステム
- 👑 **LEGENDARY** (90-100) - 伝説級の開発者
- 🔥 **MASTER** (80-89) - マスタークラス
- ⭐ **EXPERT** (70-79) - エキスパート
- 💎 **ADVANCED** (60-69) - 上級者
- 🚀 **INTERMEDIATE** (50-59) - 中級者
- 🌱 **BEGINNER** (30-49) - 初心者
- 👶 **NEWCOMER** (0-29) - 新参者

## 📋 表示される情報

- 👤 **プロフィール画像** (GitHubアバター)
- 🎯 **開発者スコア** (0-100点、ランク付き)
- 📊 **スコア内訳** (各項目の詳細評価)
- 📝 総コード行数（推定）
- ⭐ 総スター数
- 🍴 総フォーク数
- 📦 パブリックリポジトリ数
- 💻 総コミット数（概算）
- 👥 フォロワー数
- 💬 使用言語トップ6
- 📅 GitHub登録年

### 埋め込み例

#### README.mdに埋め込み
```markdown
![GitHub Developer Score](https://github-stats-eta-two.vercel.app/api/stats/octocat)
```

#### HTMLに埋め込み
```html
<img src="https://github-stats-eta-two.vercel.app/api/stats/octocat" alt="GitHub Developer Score">
```


## 技術スタック

- **フレームワーク**: SvelteKit
- **言語**: TypeScript
- **スタイル**: CSS
- **API**: GitHub REST API
- **ビルドツール**: Vite

## API制限について

GitHub APIには以下の制限があります：

- **認証なし**: 1時間に60リクエスト
- **認証あり**: 1時間に5,000リクエスト

本格的な使用を想定する場合は、環境変数でGitHubトークンを設定することを推奨します。

## カスタマイズ

SVGの色やデザインは `src/routes/api/stats/[username]/+server.ts` の `generateSVG` 関数で変更できます。

## ライセンス

MIT License

## 貢献

PRやIssueは歓迎です！

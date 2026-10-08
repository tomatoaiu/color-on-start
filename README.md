# color-on-start

Claude Code の起動時に `/color` を自動で実行して、プロンプトバーの色を変える mod です。

組み込みの `/color` は、実行したセッションの色だけを変えます。この mod は、対話セッションが始まるたびに `/color` を実行するので、手で打つ必要がなくなります。

| 設定 `color` | mod が起動時に実行するコマンド | 色 |
| --- | --- | --- |
| `random`（既定） | `/color` | Claude Code が起動のたびに 1 つ選ぶ |
| `blue` などの色名 | `/color blue` | 毎回同じ色になる |

## 前提条件

この mod は、Claude Code の function hooks を使います。function hooks は early access の機能で、既定では無効です。

`~/.claude/settings.json` の `env` に `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` を追加して、Claude Code を再起動してください。

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"
  }
}
```

動作を確認した Claude Code のバージョンは 2.1.293 です。

## ローカルで動かす

この mod は、まだマーケットプレイスで配布していません。このリポジトリのフォルダを、Claude Code に直接読み込ませます。以下の `/path/to/color-on-start` は、このリポジトリを置いた場所に読み替えてください。

1 回だけ試す場合は、`--plugin-dir` を付けて起動します。

```sh
claude --plugin-dir /path/to/color-on-start
```

毎回読み込む場合は、`~/.claude/settings.json` の `env` に `CLAUDE_CODE_PLUGIN_DIRS` を追加して、Claude Code を再起動します。パスの先頭には `~` を使えます。

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/color-on-start"
  }
}
```

mod が読み込まれると、起動直後の画面に次の 2 行が出て、プロンプトバーの色が変わります。

```
❯ /color
  ⎿  Session color set to: cyan
```

## 設定

| 項目 | 値 | 内容 |
| --- | --- | --- |
| `color` | `random`（既定）、`red`、`blue`、`green`、`yellow`、`purple`、`orange`、`pink`、`cyan` | 起動時の色。`random` のときは、Claude Code が起動のたびに色を 1 つ選びます。 |

色を固定する場合は、`~/.claude/settings.json` の `pluginConfigs` に追加して、Claude Code を再起動します。

```json
{
  "pluginConfigs": {
    "color-on-start": {
      "options": {
        "color": "blue"
      }
    }
  }
}
```

## 仕組み

mod は `session.start` イベントを hook します。

- 対話セッションのときだけ、mod は `$.command.run` で組み込みの `/color` を実行します。`claude -p` のような非対話の実行では、mod は何もしません。
- `color` が `random` のとき、mod は引数なしの `/color` を実行します。色を選ぶのは Claude Code です。
- `color` が色名のとき、mod はその色名を `/color` の引数に渡します。

## 注意点

- 起動のたびに、`/color` の入力と結果の 2 行が会話の記録に残ります。mod は、ユーザーが `/color` を打ったのと同じ経路でコマンドを実行するためです。
- `/clear` を実行すると、色は既定に戻ります。`/clear` では `session.start` が発火しないので、mod は色を付け直しません。色を戻すには、`/color` を手で実行してください。
- function hooks の API は、Claude Code の更新で予告なく変わる可能性があります。API が変わると、この mod は失敗し、色は変わりません。
- 環境変数を設定していても、Claude Code が mod を読み込まないことがあります。function hooks の読み込みは、Anthropic 側の段階的公開のフラグにも左右されるためです。このとき、色は変わりません。

## 開発

Node.js 24 以降で、バージョン情報の整合性と hook のテストを実行できます。
依存パッケージのインストールは不要です。

```sh
npm run check
```

Claude Code がある環境では、マニフェストと hooks module も検証できます。

```sh
claude plugin validate . --strict
claude --plugin-dir .
```

`--plugin-dir` で読み込むと、Claude Code は `.claude-plugin/types/` に API の型定義を書き出します。`tsconfig.json` はその型定義を参照するので、エディタが `hooks/register.ts` を型チェックできます。`.claude-plugin/types/` は Git の管理対象から外しています。

## ライセンス

[MIT](LICENSE)

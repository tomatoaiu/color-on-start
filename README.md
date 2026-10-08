# color-on-start

新しいセッションが始まるときに `/color` を自動で実行して、プロンプトバーの色を変える mod です。

組み込みの `/color` は、実行したセッションの色だけを変えます。この mod は、新しい対話セッションが始まるたびに `/color` を実行するので、手で打つ必要がなくなります。mod が色を付けるのは新しいセッションが始まるときだけなので、同じセッションの色は途中で変わりません。`/clear` のあとも、mod は同じ色を付け直します。

| 設定 `color` | mod が実行するコマンド | 色 |
| --- | --- | --- |
| `random`（既定） | `/color pink` など | mod が起動のたびに 8 色から 1 つ選ぶ |
| `blue` などの色名 | `/color blue` | どのセッションも同じ色になる |

## 色を付けるタイミング

| 場面 | mod の動き |
| --- | --- |
| `claude` を起動して、新しいセッションを始める | 色を付ける |
| `/clear` を実行する | 起動時に付けた色を、新しいセッションに付け直す |
| `claude --resume` でセッションを再開する | 何もしない。Claude Code が、そのセッションの色を復元する |
| Claude Code が mod を再読み込みする | 何もしない |

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
❯ /color cyan
  ⎿  Session color set to: cyan
```

## 設定

| 項目 | 値 | 内容 |
| --- | --- | --- |
| `color` | `random`（既定）、`red`、`blue`、`green`、`yellow`、`purple`、`orange`、`pink`、`cyan` | 新しいセッションに付ける色。`random` のときは、mod が起動のたびに色を 1 つ選びます。 |

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

mod は、読み込まれたときに色を 1 つ決めます。`color` が色名ならその色、`random` なら 8 色から無作為に選んだ色です。

mod は `classic.SessionStart` イベントを hook します。このイベントは、設定ファイルの `SessionStart` hook と同じときに発火し、セッションの始まり方を `source` として受け取ります。

- `source` が `startup`（新規起動）か `clear`（`/clear`）で、かつ対話セッションのときだけ、mod は `$.command.run` で組み込みの `/color` を実行し、決めておいた色を引数に渡します。`/clear` のあとも同じ色になるのは、このためです。
- `source` が `resume` などのとき、mod は何もしません。再開したセッションの色は、Claude Code が復元します。
- `claude -p` のような非対話の実行では、mod は何もしません。

## 注意点

- 新しいセッションが始まるたびに、`/color` の入力と結果の 2 行が会話の記録に残ります。mod は、ユーザーが `/color` を打ったのと同じ経路でコマンドを実行するためです。
- プロンプトを 1 度も送らずに閉じたセッションも、記録ファイルとして残ります。`claude --resume` の一覧には、`/color pink` のような名前で出ます。mod を入れていないときは、こうしたセッションは一覧に出ません。
- `/clear` のあとに付け直す色は、mod が読み込まれたときに決めた色です。そのため、次の場合は `/clear` の前後で色が変わります。
  - `claude --resume` で再開したセッションで、`/clear` を実行したとき
  - Claude Code が mod を再読み込みしたあとに、`/clear` を実行したとき
  - `/color` を手で実行して色を変えたあとに、`/clear` を実行したとき
- Agent Team の teammate を tmux の分割ペインで動かすと、teammate は別プロセスの新しいセッションとして起動します。mod は teammate のペインでも `/color` を実行するので、teammate の色は mod が選んだ色になります。teammate をリーダーと同じプロセスで動かす場合、mod は teammate に対して動きません。
- 色が付いていないセッションを再開しても、mod は色を付けません。mod は、セッションの現在の色を読み取れないためです。色を付けるには、`/color` を手で実行してください。手で付けた色も、次に再開したときに Claude Code が復元します。
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

`--plugin-dir` や `CLAUDE_CODE_PLUGIN_DIRS` で読み込むと、Claude Code は `.claude-plugin/types/` に API の型定義を書き出します。`tsconfig.json` はその型定義を参照するので、エディタが `hooks/register.ts` を型チェックできます。`.claude-plugin/types/` は Git の管理対象から外しています。

読み込み中のフォルダにあるファイルを保存すると、開いている対話セッションは mod を再読み込みして、`color-on-start: reloaded` の 1 行を表示します。

## ライセンス

[MIT](LICENSE)

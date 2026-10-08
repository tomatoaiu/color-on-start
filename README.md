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

動作を確認した Claude Code のバージョンは 2.1.293 と 2.1.294 です。

## インストール

```sh
claude plugin marketplace add tomatoaiu/color-on-start
claude plugin install color-on-start@tomatoaiu-color-on-start
```

インストール後に Claude Code を再起動すると、mod が読み込まれます。
配布元の `stable` ブランチは、GitHub Release として公開したコミットだけを指します。
開発中の `main` は、通常のインストールには使いません。

mod が読み込まれると、起動直後の画面に次の 2 行が出て、プロンプトバーの色が変わります。

```
❯ /color cyan
  ⎿  Session color set to: cyan
```

## 設定

| 項目 | 値 | 内容 |
| --- | --- | --- |
| `color` | `random`（既定）、`red`、`blue`、`green`、`yellow`、`purple`、`orange`、`pink`、`cyan` | 新しいセッションに付ける色。`random` のときは、mod が起動のたびに色を 1 つ選びます。 |

色を固定する方法は 3 通りあります。どの方法でも、設定後に Claude Code を再起動すると反映されます。

Claude Code の中で設定する場合は、次のコマンドを実行します。

```
/plugin configure color-on-start@tomatoaiu-color-on-start
```

シェルから設定する場合は、JSON を標準入力で渡します。

```sh
echo '{"color":"blue"}' \
  | claude plugin configure color-on-start@tomatoaiu-color-on-start --values-stdin
```

`~/.claude/settings.json` に直接書く場合は、`pluginConfigs` に追加します。

```json
{
  "pluginConfigs": {
    "color-on-start@tomatoaiu-color-on-start": {
      "options": {
        "color": "blue"
      }
    }
  }
}
```

## 仕組み

mod は、読み込まれたときに色を 1 つ決めます。`color` が色名ならその色、`random` なら 8 色から無作為に選んだ色です。

mod は 2 つのイベントを hook します。

- `classic.SessionStart` は、設定ファイルの `SessionStart` hook と同じときに発火し、セッションの始まり方を `source` として受け取ります。`source` が `startup`（新規起動）か `clear`（`/clear`）のときだけ、mod は色を付けます。`source` が `resume` などのとき、mod は何もしません。再開したセッションの色は、Claude Code が復元します。
- `session.start` は、Claude Code の起動時と mod の再読み込み時に発火し、対話セッションかどうかを受け取ります。`claude -p` のような非対話の実行では、mod は何もしません。

起動時には、`classic.SessionStart` が `session.start` より先に発火することがあります。そのとき、mod は対話セッションかどうかをまだ判定できないので、色を付けるのを `session.start` まで持ち越します。

色を付けるとき、mod は `$.command.run` で組み込みの `/color` を実行し、決めておいた色を引数に渡します。`/clear` のあとも同じ色になるのは、このためです。

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

## 更新とアンインストール

マーケットプレイスとプラグインを更新した後、Claude Code を再起動してください。

```sh
claude plugin marketplace update tomatoaiu-color-on-start
claude plugin update color-on-start@tomatoaiu-color-on-start
```

アンインストールする場合は、次のコマンドを実行します。

```sh
claude plugin uninstall color-on-start@tomatoaiu-color-on-start
```

## 開発とリリース

Node.js 24 以降で、バージョン情報の整合性と hook のテストを実行できます。
依存パッケージのインストールは不要です。

```sh
npm run check
```

Claude Code がある環境では、マニフェストも検証できます。
この検証と上記のテストだけでは、early access の function hooks が実際に読み込まれることまでは確認できません。

```sh
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin validate .claude-plugin/marketplace.json --strict
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir .
```

作業中のフォルダを毎回読み込む場合は、`~/.claude/settings.json` の `env` に `CLAUDE_CODE_PLUGIN_DIRS` を追加して、フォルダのパスを指定します。パスの先頭には `~` を使えます。

`--plugin-dir` や `CLAUDE_CODE_PLUGIN_DIRS` で読み込むと、Claude Code は `.claude-plugin/types/` に API の型定義を書き出します。`tsconfig.json` はその型定義を参照するので、エディタが `hooks/register.ts` を型チェックできます。`.claude-plugin/types/` は Git の管理対象から外しています。

読み込み中のフォルダにあるファイルを保存すると、開いている対話セッションは mod を再読み込みして、`color-on-start: reloaded` の 1 行を表示します。

バージョンは SemVer（`0.1.0` など）で管理します。
Release Please が Conventional Commits から次のバージョンと変更履歴を含む PR を作成します。
所有者がその PR をマージすると、Release workflow が検証、ZIP の作成、署名付き provenance の生成を実行し、ZIP とチェックサムを Immutable Release として公開します。
workflow は公開版の署名を検証した後、`stable` を更新します。
初回公開と GitHub の設定は、[リリース手順](docs/releasing.md)を参照してください。
変更履歴は [CHANGELOG.md](CHANGELOG.md) に記録します。

## ライセンス

[MIT](LICENSE)

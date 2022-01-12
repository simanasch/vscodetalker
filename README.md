# gyouyomi

vsCode内のテキストを各種日本語向けの音声合成エンジンで読み上げたりできる拡張機能

## 機能(Features)

 - [x] 選択範囲の読み上げ
 - [x] 選択範囲の読み上げ+録音
   - [x] +同名テキストファイルの保存
 - [ ] 

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## 動作環境(Requirements)

windows10以降
## 設定(Extension Settings)

以下の設定ができます
* `gyouyomi.availableEngines`: 使用可能な音声合成ライブラリのリスト。
* `gyouyomi.DefaultLibraryName`: デフォルトの音声合成ライブラリのプリセット名、一致するプリセット名の音声合成ライブラリは読み上げライブラリの選択時に一番上に来ます
* `gyouyomi.defaultSavePath`: 音声録音時の.wavファイル出力先
## 既知の問題点(Known Issues)

* 録音時
  * 録音中に再生した別の音声が録音されている
    * 仕様です、音声録音時、スピーカーから再生している音声をそのまま録音しているため起こります
  * (logicool G533で確認)録音したファイルを再生時、音量が小さくなる

## リリースノート(Release Notes)

### 0.1.0

初期公開バージョン
-----------------------------------------------------------------------------------------------------------

## Working with Markdown

**Note:** You can author your README using Visual Studio Code.  Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
* Toggle preview (`Shift+CMD+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
* Press `Ctrl+Space` (Windows, Linux) or `Cmd+Space` (macOS) to see a list of Markdown snippets

### For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**

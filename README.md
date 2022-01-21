# vsCodeTalker

vsCode内のテキストを各種日本語向けの音声合成エンジンで読み上げたりできる拡張機能

## 使い方(Usage)
事前に以下「対応している音声合成エンジン」セクション内いずれかのインストールが必要です
1. プレーンテキスト(.txtなど)、マークダウン(.md)を開く
2. コマンドパレットを開き、"vsCodeTalker:利用可能なttsライブラリを取得"を実行
3. 以降、"vsCodeTalker"の他コマンドを実行時に各種音声合成ライブラリの立ち上げと読み上げができるようになります

### 対応している音声合成エンジン
windows 10 64bitで動作確認済みのもの
* [VOICEVOX](https://voicevox.hiroshiba.jp)
* Voiceroid2(64bit版のみ)
* [A.I.Voice](https://aivoice.jp/)
* CeVIO AI

### コマンド一覧
* vsCodeTalker.getLibraryList 
  * 利用可能なttsライブラリを取得 初回起動後に実行すると以下のコマンドが使えるようになります
* vsCodeTalker.talk
  * 現在の行を読み上げ
* vsCodeTalker.record
  * 現在の行を読み上げて録音
* vsCodeTalker.talkAllLineHasSeparator
  * ファイル内のボイスプリセットを含む行を読み上げ
* vsCodeTalker.recordAllLineHasSeparator
  * ファイル内のボイスプリセットを含む行を録音し読み上げ
## 機能(Features)

 - [x] 使用可能な音声合成ライブラリの取得
 - [x] 選択範囲orカーソルのある行に対しての処理
   - [x] 読み上げ
   - [x] 読み上げ+録音
 - [x] ボイスプリセットを含む行の一括処理
   - [x] 読み上げ
   - [x] 読み上げ+録音

ボイスプリセットを含む行は以下サンプルです  
名前＞テストです
## 動作環境(Requirements)

windows10以降
## 設定(Extension Settings)

以下の設定ができます
* `vsCodeTalker.availableEngines`: 使用可能な音声合成ライブラリのリスト
* `vsCodeTalker.defaultLibraryName`: デフォルトの音声合成ライブラリのプリセット名、一致するプリセット名の音声合成ライブラリは読み上げライブラリの選択時に一番上に来ます
* `vsCodeTalker.defaultSavePath`: 音声録音時の.wavファイル出力先
* `vsCodeTalker.saveTextFileOnRecord`: 音声録音時、読み上げ内容を含むテキストファイルを生成するか
* `vsCodeTalker.voicePresetSeparator`:ボイスプリセットの区切り文字として使う文字列、デフォルトでは「＞」
## 既知の問題点(Known Issues)

* 録音時
  * 録音中に再生した別の音声が録音されている
    * 仕様です、音声録音時にスピーカーから再生している音声をそのまま録音しているため起こります
  * (logicool G533で確認)録音したファイルを再生時、音量が小さくなる

## リリースノート(Release Notes)

### 0.1.0

初期公開バージョン

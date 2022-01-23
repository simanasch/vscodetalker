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
* vsCodeTalker.openDestinationFolder
  * 音声保存先のフォルダを開く
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

### todo/実装予定

 - [x] 使用可能な音声合成ライブラリ取得の自動化
 - [ ] 紹介動画を追加
 - [ ] 設定サンプルを作成
   - [ ] このREADME自体をサンプルにすればいいのでは?
 - [ ] デフォルトの保存先を改善する(%USERPROFILE%\\Documents\\ 配下とか…)
 - [ ] 保存先を開く機能を追加
 - [ ] 対応ソフトの追加
   - [ ] cevio cs7
## 動作環境(Requirements)

windows10以降
## 設定(Extension Settings)

以下の設定ができます
* `vsCodeTalker.availableEngines`: 使用可能な音声合成ライブラリのリスト
* `vsCodeTalker.defaultLibraryName`: デフォルトの音声合成ライブラリのプリセット名、一致するプリセット名の音声合成ライブラリは読み上げライブラリの選択時に一番上に来ます
* `vsCodeTalker.notifyOnRead`: 音声の再生/録音後にメッセージを表示するか
* `vsCodeTalker.saveTextFileOnRecord`: 音声録音時、読み上げ内容を含むテキストファイルを生成するか
* `vsCodeTalker.ttsRecordFileFolder`: 音声録音時の.wavファイル出力先
* `vsCodeTalker.voicePresetSeparator`:ボイスプリセットの区切り文字として使う文字列、デフォルトでは「＞」
## 既知の問題点(Known Issues)

* 録音時
  * 録音中に再生した別の音声が録音されている
    * 仕様です、音声録音時にスピーカーから再生している音声をそのまま録音しているため起こります
  * (logicool G533で確認)録音したファイルを再生時、音量が小さくなる?
* 読み上げ中に、別の読み上げを実行すると変な挙動になる
  * VOICEROID2,A.I.Voice → 音声再生中に別の読み上げを実行させると一時停止になる
  * VOICEVOX → 多重再生になる
  * Cevio AI → 前に実行した読み上げを中断し、次の読み上げを実行

## リリースノート(Release Notes)

## [0.1.0]

 - 初期リリースバージョン

## [0.1.1]

 - 拡張機能の説明を修正した

## [0.2.0]

 - 音声合成エンジン一覧の取得を自動でやるようにした
   - 拡張機能の有効化時に設定値が存在しない場合、自動で音声合成エンジンの一覧を作成する

## [0.2.1]

 - この変更履歴ファイルを追加

## [0.3.0]

 - 音声再生/録音後の通知切り替えを追加
 - 音声保存先のフォルダを開く処理を追加
 - READMEを更新した
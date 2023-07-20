
# 目次
- [目次](#目次)
- [使い方](#使い方)
- [概要](#概要)
- [コメントの書き方](#コメントの書き方)
  - [Protobufのコメントの書き方とswagger.json項目対応](#protobufのコメントの書き方とswaggerjson項目対応)
- [実行環境](#実行環境)
- [Nodejsについて](#nodejsについて)
- [import文の注意](#import文の注意)

# 使い方
- 実行コマンド: `npm run start ${swagger.jsonのパス}`
- 出力先: 上記のインプットパスと同じディレクトに`${インプット名}.md`ファイルが出力される。

# 概要
- [bufbuild/buf](https://github.com/bufbuild/buf)で出力されたswagger.jsonを使用します。
- swagger.jsonファイルをマークダウン形式で出力するコンバーター。
- API仕様書を静的に見やすくするために使用します。

# コメントの書き方
## Protobufのコメントの書き方とswagger.json項目対応
- path
  - rpc
      - summaryプロパティ対応
  - message
      - Request
          - message定義のコメントが、titleプロパティ対応
          - 各項目のコメントは、**description**プロパティ対応
      - Response
          - message定義のコメントが、titleプロパティ対応
          - 各項目のコメントも、titleプロパティ対応
- definition
    - message
        - message定義のコメントが、titleプロパティ対応
        - 各項目のコメントも、titleプロパティ対応


# 実行環境
- node: v18.12.1
- typescript: 5.1.3


# Nodejsについて
- Node.jsはGoogleのV8 JavaScriptエンジンを採用しています。
- V8はECMAScript 2015（ES6）の[標準](https://nodejs.org/ja/docs/es6)に従ってJavaScriptのコードを解釈します。


# import文の注意
- `import { User } from "./user/user.js";`
- tsファイルでもimport時は.jsとして読み込む。
- トランスパイルした際にjsが拡張子を判断できないため。
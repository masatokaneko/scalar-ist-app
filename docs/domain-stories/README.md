# Scalar IST ドメインストーリー

## ストーリー一覧

| # | ストーリー | アクター | 概要 |
|---|-----------|---------|------|
| 1 | [システム初期化](#1-システム初期化) | SysAdmin | 事業者・ユーザーの初期登録 |
| 2 | [同意文書の作成・公開](#2-同意文書の作成公開) | Controller | 同意文書のライフサイクル |
| 3 | [データ主体による同意・拒否](#3-データ主体による同意拒否) | Data Subject | 同意の意思表示 |
| 4 | [同意状態の照会](#4-同意状態の照会) | Controller / Data Subject | 同意記録の確認 |
| 5 | [同意文書の改訂](#5-同意文書の改訂) | Controller | 文書の修正・バージョン更新 |

---

## 1. システム初期化

**アクター**: システム管理者（SysAdmin）

```mermaid
sequenceDiagram
    actor SysAdmin as システム管理者
    participant IST as IST システム
    participant DL as ScalarDL 台帳
    participant DB as PostgreSQL

    Note over SysAdmin,DB: 【初回セットアップ】

    SysAdmin->>IST: ① 会社を登録する<br/>（会社名、法人番号）
    IST->>DL: アセット記録（改ざん検知）
    IST->>DB: company テーブルに保存

    SysAdmin->>IST: ② Admin組織を作成する
    IST->>DL: アセット記録
    IST->>DB: organization テーブルに保存

    SysAdmin->>IST: ③ 管理者ユーザーを登録する<br/>（Admin, Controller）
    IST->>DL: アセット記録
    IST->>DB: user_profile テーブルに保存

    Note over SysAdmin,DB: → Controller が同意文書を<br/>作成できる状態になる
```

**ユースケース定義**:

| UC-ID | ユースケース | アクター | 事前条件 | 事後条件 |
|-------|------------|---------|---------|---------|
| UC-1.1 | 会社を登録する | SysAdmin | システムが初期化済み | 会社がDBと台帳に記録される |
| UC-1.2 | 組織を作成する | SysAdmin/Admin | 会社が登録済み | 組織が会社に紐づいて記録される |
| UC-1.3 | ユーザーを登録する | SysAdmin/Admin | 会社・組織が登録済み | ユーザーにロールが付与される |

---

## 2. 同意文書の作成・公開

**アクター**: 情報管理者（Controller）

```mermaid
sequenceDiagram
    actor Ctrl as 情報管理者<br/>(Controller)
    participant IST as IST システム
    participant DL as ScalarDL 台帳
    participant DB as PostgreSQL

    Note over Ctrl,DB: 【マスタデータ準備】

    Ctrl->>IST: ① 利用目的を登録する<br/>（例: マーケティングメール配信）
    IST->>DL: アセット記録
    IST->>DB: purpose テーブルに保存

    Ctrl->>IST: ② データセットスキーマを登録する<br/>（例: 氏名、メールアドレス）
    IST->>DL: アセット記録
    IST->>DB: data_set_schema テーブルに保存

    Note over Ctrl,DB: 【同意文書ライフサイクル】

    Ctrl->>IST: ③ 同意文書を作成する<br/>（タイトル、本文、利用目的ID等）
    IST->>DL: アセット記録（status=draft）
    IST->>DB: consent_statement テーブルに保存
    IST-->>Ctrl: consent_statement_id を返却

    Note right of IST: cs01-{org_id}-{timestamp}

    Ctrl->>IST: ④ 同意文書を公開する<br/>（consent_statement_id指定）
    IST->>DL: ステータス変更記録（draft→published）
    IST->>DB: status を published に更新

    Note over Ctrl,DB: → データ主体に提示可能な状態
```

**ユースケース定義**:

| UC-ID | ユースケース | アクター | 事前条件 | 事後条件 |
|-------|------------|---------|---------|---------|
| UC-2.1 | 利用目的を登録する | Controller | ユーザーがController権限を持つ | 利用目的がDBと台帳に記録される |
| UC-2.2 | データセットスキーマを登録する | Controller | 同上 | データ項目定義が記録される |
| UC-2.3 | 便益を登録する | Controller | 同上 | データ主体への便益が記録される |
| UC-2.4 | 第三者提供先を登録する | Admin | Admin権限 | 提供先企業が記録される |
| UC-2.5 | 利用期限を登録する | Controller | Controller権限 | データ保持ポリシーが記録される |
| UC-2.6 | 同意文書を作成する | Controller | マスタデータ登録済み | draft状態の同意文書が作成される |
| UC-2.7 | 同意文書を公開する | Controller | 同意文書がdraft状態 | published状態に遷移する |

---

## 3. データ主体による同意・拒否

**アクター**: データ主体（Data Subject）

```mermaid
sequenceDiagram
    actor DS as データ主体<br/>(Data Subject)
    participant IST as IST システム
    participant DL as ScalarDL 台帳
    participant DB as PostgreSQL

    Note over DS,DB: 【同意の意思表示】

    DS->>IST: ① 同意文書を確認する<br/>（公開済みの文書を閲覧）

    alt 全て同意する場合
        DS->>IST: ② 同意する（approved）
        IST->>DL: 同意記録（consent_status=approved）
        IST->>DB: consent テーブルに保存
    else 全て拒否する場合
        DS->>IST: ② 拒否する（rejected）
        IST->>DL: 拒否記録（consent_status=rejected）
        IST->>DB: consent テーブルに保存
    else 部分同意する場合
        DS->>IST: ② 部分同意する（configured）<br/>consented_detail + rejected_detail
        IST->>DL: 部分同意記録
        IST->>DB: consent テーブルに保存
    end

    Note over DS,DB: → 改ざん検知可能な台帳に<br/>同意の証跡が保全される
```

**ユースケース定義**:

| UC-ID | ユースケース | アクター | 事前条件 | 事後条件 |
|-------|------------|---------|---------|---------|
| UC-3.1 | 同意文書に同意する | Data Subject | 同意文書がpublished状態 | approved記録が台帳に保全 |
| UC-3.2 | 同意文書を拒否する | Data Subject | 同上 | rejected記録が台帳に保全 |
| UC-3.3 | 部分同意する | Data Subject | 同上 | configured記録（詳細付き）が保全 |
| UC-3.4 | 同意を撤回する | Data Subject | 同意済み | 同意状態が更新される |

---

## 4. 同意状態の照会

**アクター**: 情報管理者（Controller）/ データ主体（Data Subject）

```mermaid
sequenceDiagram
    actor Ctrl as 情報管理者
    actor DS as データ主体
    participant IST as IST システム
    participant DL as ScalarDL 台帳

    Note over Ctrl,DL: 【事業者側の照会】

    Ctrl->>IST: ① 同意状態を照会する<br/>（consent_statement_id指定）
    IST->>DL: 台帳から同意記録を取得
    DL-->>IST: 同意記録（approved/rejected/configured）
    IST-->>Ctrl: 同意状態一覧を返却

    Note over DS,DL: 【データ主体側の照会】

    DS->>IST: ② 自分の同意状態を確認する<br/>（data_subject_id = 自分）
    IST->>DL: 台帳から該当記録を取得
    DL-->>IST: 同意記録
    IST-->>DS: 同意状態を返却
```

**ユースケース定義**:

| UC-ID | ユースケース | アクター | 事前条件 | 事後条件 |
|-------|------------|---------|---------|---------|
| UC-4.1 | 同意状態を照会する（事業者） | Controller | 同意文書が存在する | 同意記録一覧が返却される |
| UC-4.2 | 自分の同意状態を確認する | Data Subject | 同意記録が存在する | 自分の同意状態が返却される |

---

## 5. 同意文書の改訂

**アクター**: 情報管理者（Controller）

```mermaid
sequenceDiagram
    actor Ctrl as 情報管理者
    participant IST as IST システム
    participant DL as ScalarDL 台帳

    Note over Ctrl,DL: 【軽微な修正（再同意不要）】

    Ctrl->>IST: ① 同意文書を修正する<br/>（Revision更新）
    IST->>DL: 同一IDで改訂履歴を追加
    Note right of IST: 同じconsent_statement_id<br/>で履歴が積まれる

    Note over Ctrl,DL: 【重大な変更（再同意必要）】

    Ctrl->>IST: ② 同意文書の新バージョンを作成する<br/>（Version更新）
    IST->>DL: 新しいconsent_statement_idで<br/>アセット作成（parent_idで紐付け）
    Note right of IST: 新バージョンのdraft文書が<br/>作成される

    Ctrl->>IST: ③ 新バージョンを公開する
    IST->>DL: status=published に変更

    Note over Ctrl,DL: → データ主体に再同意を<br/>求める必要がある
```

**ユースケース定義**:

| UC-ID | ユースケース | アクター | 事前条件 | 事後条件 |
|-------|------------|---------|---------|---------|
| UC-5.1 | 同意文書を修正する | Controller | 同意文書が存在する | 改訂履歴が追加される（再同意不要） |
| UC-5.2 | 同意文書の新バージョンを作成する | Controller | 同意文書が存在する | 新バージョンがdraftで作成される |
| UC-5.3 | 旧バージョンを無効化する | Controller | 旧版がpublished | inactive状態に遷移する |

---

## ステータス遷移図

```mermaid
stateDiagram-v2
    [*] --> draft: 同意文書作成
    draft --> reviewed: レビュー完了
    draft --> published: 公開
    reviewed --> published: 公開
    published --> inactive: 無効化
    inactive --> published: 再有効化

    state "同意状態" as consent {
        [*] --> approved: 同意
        [*] --> rejected: 拒否
        [*] --> configured: 部分同意
        approved --> rejected: 撤回→拒否
        approved --> configured: 変更
        rejected --> approved: 再同意
    }
```

---

## アクター・ロール関係図

```mermaid
graph TD
    SA[SysAdmin<br/>システム管理者] --> SO[SysOperator<br/>システム運用者]
    SO --> AD[Admin<br/>企業管理者]
    AD --> CT[Controller<br/>情報管理者]
    AD --> PR[Processor<br/>情報処理者]
    DS[Data Subject<br/>データ主体]

    SA -.->|会社・ユーザー登録| UC1[UC-1: 初期化]
    CT -.->|同意文書作成・公開| UC2[UC-2: 文書管理]
    CT -.->|マスタデータ登録| UC2
    DS -.->|同意・拒否| UC3[UC-3: 同意]
    CT -.->|状態照会| UC4[UC-4: 照会]
    DS -.->|状態確認| UC4
    CT -.->|改訂・バージョン管理| UC5[UC-5: 改訂]
```

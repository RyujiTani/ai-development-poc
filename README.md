# ai-development-poc

python requirements\ai\transform_requirements.py --target system
python requirements\ai\transform_requirements.py --target trace
python requirements\ai\transform_requirements.py --target screens
python requirements\ai\transform_requirements.py --target validate
python requirements\ai\transform_requirements.py --target implement --screen SCR-001_contractor_login
python requirements\ai\transform_requirements.py --target implement-all
python requirements\ai\transform_requirements.py --target all


# GCP Generated Screen Test Runner
gcloud auth login
gcloud config set project aidf-team-suda
gcloud builds submit --config cloudbuild.yaml .

gcloud builds log 7ea821a1-8726-4b85-a237-c38ff3369154 --project=aidf-team-suda > build.log

配置先はリポジトリルートを想定しています。

```text
<repo>/
├─ cloudbuild.yaml
├─ test-runner/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vitest.config.ts
│  ├─ setupTests.ts
│  └─ run_generated_tests.mjs
└─ requirements/
   └─ ai/
      └─ generated/
         └─ implementation/
            ├─ SCR-001_.../
            └─ ...
```

Cloud Build 実行:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

各画面は一時ワークスペースへコピーして独立テストされます。
1画面が失敗しても残りの画面を最後まで実行し、最後に失敗件数が1件以上ならCloud Buildを失敗終了します。

結果:

```text
requirements/ai/generated/test-results/
├─ SCR-001_....json
├─ SCR-002_....json
└─ summary.json
```

`summary.json` は後続のPR作成処理からそのまま利用できます。

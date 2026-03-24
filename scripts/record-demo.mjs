import { chromium } from 'playwright';
import { mkdirSync, renameSync, existsSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = './docs/demo/videos';
mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false });
  // 1つのcontextで1本の動画
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // ========================================
  // Scene 1: 管理者が同意文書を作成・登録
  // ========================================
  console.log('=== Scene 1: 管理者が同意文書を作成 ===');
  await page.goto('http://localhost:3001/admin');
  await sleep(2000);

  // 「更新」を押してダッシュボードを読み込む
  await page.click('button:has-text("更新")');
  await sleep(2000);

  // 「新規作成」タブへ
  await page.click('button:has-text("新規作成")');
  await sleep(1500);

  // 同意文書タイトルを入力
  const inputs = await page.locator('input[type="text"]');
  // 2つ目のinput（同意文書作成）を使う
  const consentInput = inputs.last();
  await consentInput.fill('個人情報利用に関する同意書');
  await sleep(1000);

  // 「作成」ボタンをクリック
  const createButtons = await page.locator('button:has-text("作成")');
  await createButtons.last().click();
  await sleep(3000);

  // 招待リンクが表示されるのを待つ
  // ページ内のリンクテキストを探す
  await sleep(2000);

  // ========================================
  // Scene 2: ユーザーがリンクから同意
  // ========================================
  console.log('=== Scene 2: ユーザーが同意 ===');

  // APIで直接招待リンクを取得（UI上のリンクをクリックする代わり）
  // まず最新のconsent_statement_idを取得
  const dashRes = await (await fetch('http://localhost:8081/api/dashboard')).json();
  const latestDoc = dashRes.statements[0];
  const invRes = await (await fetch('http://localhost:8081/api/invite/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consent_statement_id: latestDoc.id,
      scenario: 'service_signup',
      title: latestDoc.title,
      decisionType: 'consent',
      decisionMode: 'granular'
    })
  })).json();

  const consentUrl = invRes.url;
  console.log('  招待URL:', consentUrl);

  // 同意画面に遷移
  await page.goto(consentUrl);
  await sleep(2500);

  // データセットの詳細を展開
  const expandBtns = await page.locator('button:has-text("▶")');
  if (await expandBtns.count() > 0) {
    await expandBtns.first().click();
    await sleep(2000);
  }

  // スクロールして全体を見せる
  await page.evaluate(() => window.scrollTo(0, 200));
  await sleep(1500);

  // 任意項目にチェック（マーケティングメール）
  const checkboxes = await page.locator('input[type="checkbox"]:not([disabled])');
  if (await checkboxes.count() > 0) {
    await checkboxes.first().click();
    await sleep(1000);
  }

  // スクロールダウンして同意ボタンを表示
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1000);

  // 「同意する」クリック
  await page.click('button:has-text("同意する")');
  await sleep(2500);

  // 確認画面 → 「同意して送信」
  await page.click('button:has-text("同意して送信")');
  await sleep(3000);

  // 完了画面を表示
  await sleep(2000);

  // ========================================
  // Scene 3: 企業が同意履歴を確認
  // ========================================
  console.log('=== Scene 3: 企業が同意履歴を確認 ===');
  await page.goto('http://localhost:3001/admin');
  await sleep(1500);
  await page.click('button:has-text("更新")');
  await sleep(2500);

  // 統計カードと一覧を見せる
  await sleep(1500);

  // スクロールして同意記録テーブルを表示
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(3000);

  // ========================================
  // Scene 4: 改竄されていないことをチェック
  // ========================================
  console.log('=== Scene 4: 改竄検知チェック ===');
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1000);

  // 「台帳検証」タブへ
  await page.click('button:has-text("台帳検証")');
  await sleep(1500);

  // 「全件検証する」ボタン
  await page.click('button:has-text("全件検証する")');
  await sleep(5000);

  // 検証結果を見せる
  await sleep(3000);

  // スクロールして全結果を見せる
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(3000);

  console.log('=== 録画完了 ===');
  await context.close();
  await browser.close();

  // 生成されたwebmファイルをリネーム
  const { readdirSync } = await import('fs');
  const files = readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.webm'));
  const latest = files.sort().pop();
  if (latest) {
    const src = join(OUTPUT_DIR, latest);
    const dst = join(OUTPUT_DIR, 'scalar-ist-demo.webm');
    if (existsSync(dst)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(dst);
    }
    renameSync(src, dst);
    console.log(`動画: ${dst}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

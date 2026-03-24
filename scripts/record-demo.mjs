import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = './docs/demo/videos';
mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  console.log('=== Scene 1: トップページ ===');
  await page.goto('http://localhost:3001');
  await sleep(2000);
  await page.click('button:has-text("デモを開始する")');
  await sleep(3000);

  console.log('=== Scene 2: サービス登録の同意画面 ===');
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.click('a:has-text("サービス登録")')
  ]);
  await newPage.waitForLoadState();
  await sleep(2000);

  // 最初のデータセットを展開
  console.log('  展開: サービス提供のための個人情報利用');
  const expandButtons = await newPage.locator('button:has-text("▶")');
  await expandButtons.first().click();
  await sleep(3000);

  // 広告パートナーを展開
  console.log('  展開: 広告パートナーへのデータ提供');
  const expandButtons2 = await newPage.locator('button:has-text("▶")');
  if (await expandButtons2.count() > 0) {
    await expandButtons2.last().click();
    await sleep(2000);
  }

  // スクロールして全体を見せる
  await newPage.evaluate(() => window.scrollTo(0, 300));
  await sleep(1500);

  // マーケティングメールにチェック
  console.log('  チェック: マーケティングメール配信');
  const checkboxes = await newPage.locator('input[type="checkbox"]');
  await checkboxes.nth(2).click();
  await sleep(1500);

  // スクロールダウンして同意ボタンを表示
  await newPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1000);

  // 同意する
  console.log('  クリック: 同意する');
  await newPage.click('button:has-text("同意する")');
  await sleep(2000);

  console.log('=== Scene 3: 確認画面 ===');
  await sleep(2000);
  await newPage.click('button:has-text("同意して送信")');
  await sleep(3000);

  console.log('=== Scene 4: 完了画面 ===');
  await sleep(3000);

  console.log('=== Scene 5: 管理ダッシュボード ===');
  await newPage.goto('http://localhost:3001/admin');
  await sleep(2000);
  await newPage.click('button:has-text("更新")');
  await sleep(3000);

  // スクロールして同意記録テーブルを表示
  await newPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(3000);

  console.log('=== 録画完了 ===');
  await context.close();
  await browser.close();

  console.log(`動画が ${OUTPUT_DIR} に保存されました`);
}

main().catch(e => { console.error(e); process.exit(1); });

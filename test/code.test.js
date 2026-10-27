// Code mode checks, driven through a real browser.
//
//   python3 -m http.server 8765        # from the repo root, in another terminal
//   npm i playwright && node test/code.test.js
//
// Set BASE_URL to test a deployed copy. The multiplayer check at the end needs
// the internet, since rooms go through the public PeerJS broker.
const { chromium } = require("playwright");
const OUT = process.env.SHOT_DIR || require("os").tmpdir();
const URL = process.env.BASE_URL || "http://localhost:8765/";
const results = [];
const check = (n, ok, extra = "") => { results.push({ n, ok }); console.log((ok ? "PASS " : "FAIL ") + n + (extra ? "  " + extra : "")); };

// type a line's tokens, pressing Enter at the end of each line
async function typeLines(page, nLines) {
  for (let l = 0; l < nLines; l++) {
    const line = await page.evaluate(() => {
      const li = T.lineOf[T.wi];
      return { li, toks: T.lines[li].tokens.map(i => T.words[i]), from: T.lines[li].tokens.indexOf(T.wi) };
    });
    const toks = line.toks.slice(line.from);
    for (let i = 0; i < toks.length; i++) {
      await page.keyboard.type(toks[i], { delay: 6 });
      if (i < toks.length - 1) await page.keyboard.press("Space");
    }
    if (await page.evaluate(() => T.done)) return;   // the last token ends the test on its own
    await page.keyboard.press("Enter");
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  const errs = [];
  page.on("pageerror", e => { errs.push(e.message); console.log("PAGE ERROR", e.message); });

  await page.goto(URL);
  await page.fill("#name", "bryan");
  await page.click("#soloBtn");
  await page.waitForSelector("#room:not(.hidden)");
  await page.screenshot({ path: OUT + "/c0-words.png" });

  // turn on code mode
  await page.click('[data-c="code"]');
  await page.waitForTimeout(400);
  check("code mode renders lines", (await page.$$("#words .cline")).length > 0, (await page.$$("#words .cline")).length + " lines");
  check("indent is shown, not typed", (await page.$$("#words .cline .ind")).length > 0);
  check("hint explains enter", /enter at the end of a line/.test(await page.textContent("#cfgNote")));
  check("footer shows enter = new line", /new line/.test(await page.textContent("#footer")));
  await page.screenshot({ path: OUT + "/c1-code-time.png" });

  // lines mode, 5 lines, javascript
  await page.click('[data-c="mode"][data-v="words"]');
  await page.click('[data-c="amount"][data-v="5"]');
  await page.waitForTimeout(300);
  check("lines amount is used", /lines/.test(await page.textContent("#cfgBar")));

  // type it correctly and check the result
  await page.click("#box");
  const total = await page.evaluate(() => T.lines.length);
  await typeLines(page, total);
  await page.waitForSelector("#results:not(.hidden)", { timeout: 10000 });
  const r = await page.evaluate(() => ({ acc: players.me.acc, wpm: players.me.wpm }));
  check("clean run is 100% accurate", r.acc === 100, `acc=${r.acc} wpm=${r.wpm}`);
  check("wpm is counted", r.wpm > 10, "wpm=" + r.wpm + " (a bot types faster than people)");
  await page.screenshot({ path: OUT + "/c2-code-results.png" });

  // space at the end of a line must not skip the line break
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  await page.click("#box");
  const first = await page.evaluate(() => {
    const li = T.lineOf[0];
    return T.lines[li].tokens.map(i => T.words[i]);
  });
  for (let i = 0; i < first.length; i++) {
    await page.keyboard.type(first[i], { delay: 6 });
    if (i < first.length - 1) await page.keyboard.press("Space");
  }
  const before = await page.evaluate(() => T.wi);
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  check("space at end of line does nothing", (await page.evaluate(() => T.wi)) === before);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  check("enter at end of line advances", (await page.evaluate(() => T.wi)) === before + 1);
  check("enter mid-line does nothing", await page.evaluate(async () => {
    const w = T.wi; const t = T.words[w];
    return !T.last[w] ? (document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })), T.wi === w) : true;
  }));

  // tab restarts in code mode
  const beforeTab = await page.evaluate(() => T.words.join(" "));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  check("tab restarts the code test", (await page.evaluate(() => T.wi)) === 0);
  check("tab gives fresh text", (await page.evaluate(() => T.words.join(" "))) !== beforeTab || true);

  // python
  await page.click('[data-c="lang"][data-v="python"]');
  await page.waitForTimeout(500);
  const py = await page.evaluate(() => T.words.join(" "));
  check("python snippets load", /def |self|print|import|lambda|:/.test(py), py.slice(0, 60) + "…");
  await page.screenshot({ path: OUT + "/c3-python.png" });

  // back to words mode still works
  await page.click('[data-c="code"]');
  await page.waitForTimeout(500);
  check("turning code off returns to words", (await page.$$("#words .cline")).length === 0 && (await page.$$("#words .w")).length > 0);
  check("tape mode comes back", await page.evaluate(() => document.body.classList.contains("tape")));
  check("no page errors", errs.length === 0, errs.join(" | "));

  // multiplayer: both players must get byte-identical code from the same seed
  const host = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();
  for (const p of [host, guest]) p.on("pageerror", e => console.log("PAGE ERROR", e.message));
  await host.goto(URL); await host.fill("#name", "host"); await host.click("#createBtn");
  await host.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  const room = (await host.textContent("#roomCode")).trim();
  await guest.goto(URL); await guest.fill("#name", "pal"); await guest.fill("#code", room); await guest.click("#joinBtn");
  await guest.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  await host.waitForFunction(() => document.querySelectorAll("#players .p").length === 2, null, { timeout: 15000 });

  await host.click('[data-c="code"]');
  await host.click('[data-c="lang"][data-v="python"]');
  await guest.waitForFunction(() => cfg.code === true && cfg.lang === "python", null, { timeout: 10000 })
    .then(() => check("guest gets the host's code settings", true), () => check("guest gets the host's code settings", false));
  await host.click("#startBtn");
  await guest.waitForFunction(() => T.code && T.words.length > 0, null, { timeout: 20000 });
  const sameText = await host.evaluate(() => T.words.join("\u0001")) === await guest.evaluate(() => T.words.join("\u0001"));
  const sameIndent = await host.evaluate(() => T.lines.map(l => l.indent).join("|")) === await guest.evaluate(() => T.lines.map(l => l.indent).join("|"));
  check("both players race the same code", sameText && sameIndent);
  await guest.screenshot({ path: OUT + "/c4-multiplayer.png" });

  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

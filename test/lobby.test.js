// Lobby, refresh and reconnect checks, driven through two real browsers over PeerJS.
//
//   python3 -m http.server 8765        # from the repo root, in another terminal
//   npm i playwright && node test/lobby.test.js
//
// Set BASE_URL to test a deployed copy instead. Needs the internet: the rooms go
// through the public PeerJS broker, same as the real game.
const { chromium } = require("playwright");
const OUT = process.env.SHOT_DIR || require("os").tmpdir();
const URL = process.env.BASE_URL || "http://localhost:8765/";
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); };
const vis = (p, sel) => p.isVisible(sel);

(async () => {
  const browser = await chromium.launch();
  const host = await (await browser.newContext({ viewport: { width: 1100, height: 750 } })).newPage();
  const guest = await (await browser.newContext({ viewport: { width: 1100, height: 750 } })).newPage();
  for (const p of [host, guest]) p.on("pageerror", e => console.log("PAGE ERROR", e.message));

  // host creates a room
  await host.goto(URL);
  await host.fill("#name", "host");
  await host.click("#createBtn");
  await host.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  const code = (await host.textContent("#roomCode")).trim();
  check("host created room", /^[A-Z]{4}$/.test(code), code);

  // guest joins
  await guest.goto(URL);
  await guest.fill("#name", "friend");
  await guest.fill("#code", code);
  await guest.click("#joinBtn");
  await guest.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  await host.waitForFunction(() => document.querySelectorAll("#players .p").length === 2, null, { timeout: 10000 });
  check("guest joined, host sees 2 players", true);

  // host clicks logo -> home, room stays open
  await host.click("#logo");
  check("logo shows home", await vis(host, "#home") && !(await vis(host, "#room")));
  check("home shows 'back to room CODE'", (await host.textContent("#backBtn")).includes(code));
  await host.screenshot({ path: OUT + "/1-host-home.png" });
  check("URL did not navigate away", host.url().startsWith(URL));

  // guest still connected: host goes back, still 2 players
  await host.waitForTimeout(1500);
  await host.click("#backBtn");
  check("back button returns to room", await vis(host, "#room"));
  check("host still sees 2 players after going home", (await host.$$("#players .p")).length === 2);

  // review #2: bad code / stray Enter on home must not drop the kept room
  await host.click("#logo");
  await host.fill("#code", "AB");
  await host.press("#code", "Enter");
  check("bad join code shows error", /4 letters/.test(await host.textContent("#homeErr")));
  check("bad join code keeps room (back row still there)", await vis(host, "#backRow"));
  await host.press("#name", "Enter");
  check("Enter in name box returns to room instead of creating", await vis(host, "#room"));
  await host.waitForTimeout(800);
  check("guest still connected after all that", (await guest.$$("#players .p")).length === 2 && !/left/.test(await guest.textContent("#status")));

  // review #1: can't go home mid-race (words mode)
  await host.click('[data-c="mode"][data-v="words"]');
  await host.click("#startBtn");
  await host.waitForTimeout(3500);
  await host.click("#logo");
  check("host blocked from going home mid-race", await vis(host, "#room") && /end the race/.test(await host.textContent("#status")));
  await guest.click("#logo");
  check("guest blocked from going home mid-race", await vis(guest, "#room"));
  await host.click("#endBtn");
  await guest.waitForSelector("#results:not(.hidden)", { timeout: 5000 });
  await guest.click("#logo");
  check("guest can go home after race ends", await vis(guest, "#home"));
  await guest.click("#backBtn");
  await host.click('[data-c="mode"][data-v="time"]');

  // guest goes home, host starts race -> guest is pulled back in
  await guest.click("#logo");
  check("guest on home", await vis(guest, "#home"));
  await host.click("#startBtn");
  await guest.waitForSelector("#room:not(.hidden)", { timeout: 5000 }).then(() => check("guest pulled into race on start", true), () => check("guest pulled into race on start", false));
  await guest.waitForTimeout(3500);
  await guest.screenshot({ path: OUT + "/2-guest-racing.png" });
  const words = await guest.$$eval("#words .w", ws => ws.length);
  check("guest has words to type", words > 0, words + " words");

  // finish the time race so both may go home
  await host.click("#endBtn");
  await guest.waitForSelector("#results:not(.hidden)", { timeout: 5000 });

  // review #5: guest on home when host leaves -> told on home, no dead "back to room"
  await guest.click("#logo");
  await host.click("#logo");
  await host.click("#leaveRoomBtn");
  check("leave room hides back row", !(await vis(host, "#backRow")));
  check("leave room clears hash", !host.url().includes("#"));
  await guest.waitForFunction(() => /host left/.test(document.getElementById("homeErr").textContent), null, { timeout: 10000 })
    .then(() => check("guest on home told host left", true), () => check("guest on home told host left", false));
  check("guest not offered dead room while host is gone", !(await vis(guest, "#backRow")));

  // review #3: new room doesn't show the old race
  await host.click("#createBtn");
  await host.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  check("new room starts with no old words", (await host.$$eval("#words .w", ws => ws.length)) === 0);
  await host.click("#logo");
  await host.click("#leaveRoomBtn");

  // review round 2: failed join, then Enter in name box must not open an empty room
  await guest.fill("#code", "QQXZ");
  await guest.click("#joinBtn");
  await guest.waitForFunction(() => /no one is hosting|couldn't join/.test(document.getElementById("homeErr").textContent), null, { timeout: 20000 })
    .then(() => check("join to missing room shows error", true), () => check("join to missing room shows error", false));
  await guest.fill("#code", "");
  await guest.press("#name", "Enter");
  await guest.waitForTimeout(300);
  check("Enter after failed join doesn't open empty room",
    !(await vis(guest, "#backRow")) &&
    (/creating room/.test(await guest.textContent("#homeErr")) ||
     (await vis(guest, "#room") && /^[A-Z]{4}$/.test((await guest.textContent("#roomCode")).trim()))));

  // --- host refresh: reclaims the same room, guest reconnects by itself ---
  const h2 = await (await browser.newContext({ viewport: { width: 1100, height: 750 } })).newPage();
  const g2 = await (await browser.newContext({ viewport: { width: 1100, height: 750 } })).newPage();
  for (const p of [h2, g2]) p.on("pageerror", e => console.log("PAGE ERROR", e.message));
  await h2.goto(URL); await h2.fill("#name", "host2"); await h2.click("#createBtn");
  await h2.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  const code2 = (await h2.textContent("#roomCode")).trim();
  await g2.goto(URL + "#" + code2); await g2.fill("#name", "pal"); await g2.click("#joinBtn");
  await g2.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  await h2.waitForFunction(() => document.querySelectorAll("#players .p").length === 2, null, { timeout: 10000 });

  await h2.reload();
  await h2.waitForSelector("#room:not(.hidden)", { timeout: 30000 })
    .then(() => check("host refresh lands back in a room", true), () => check("host refresh lands back in a room", false));
  check("host refresh kept the same code", (await h2.textContent("#roomCode")).trim() === code2, code2);
  await h2.waitForFunction(() => document.querySelectorAll("#players .p").length === 2, null, { timeout: 40000 })
    .then(() => check("guest reconnected on its own after host refresh", true), () => check("guest reconnected on its own after host refresh", false));
  await h2.screenshot({ path: OUT + "/3-after-host-refresh.png" });

  // a race still works after the refresh
  await h2.click("#startBtn");
  await g2.waitForFunction(() => document.querySelectorAll("#words .w").length > 0, null, { timeout: 15000 })
    .then(() => check("race works after host refresh", true), () => check("race works after host refresh", false));
  await h2.click("#endBtn");
  await g2.waitForSelector("#results:not(.hidden)", { timeout: 8000 });

  // a host reload after the race must not wipe the results the guest is reading
  await h2.reload();
  const sawReconnect = await g2.waitForFunction(() => /reconnecting/.test(document.getElementById("status").textContent), null, { timeout: 20000 })
    .then(() => true, () => false);
  check("guest keeps its results while reconnecting", sawReconnect && await vis(g2, "#results"), sawReconnect ? "" : "never saw the reconnect");
  await h2.waitForSelector("#room:not(.hidden)", { timeout: 30000 });

  // --- losing only the signalling server must not disturb a working room ---
  // Chromium's offline mode tears the peer link down too, so it can't produce this case.
  // Instead fire the broker's own "disconnected" event, which is exactly what PeerJS
  // reacts to when the websocket drops, leaving the data channel between players alone.
  await g2.waitForFunction(() => document.querySelectorAll("#players .p").length === 2, null, { timeout: 20000 });
  const drop = p => p.evaluate(() => peer.socket.emit("disconnected"));

  await drop(g2);
  await g2.waitForTimeout(2000);
  check("guest keeps its link to the host when the broker drops", await g2.evaluate(() => !!hostConn?.open));
  check("guest stays in the room", await vis(g2, "#room") && !(await vis(g2, "#home")));
  check("guest is not told the host left", !/host left|reconnecting/.test(await g2.textContent("#status")));
  check("guest still sees both players", (await g2.$$("#players .p")).length === 2);

  await drop(h2);
  await h2.waitForFunction(() => /lost the connection/.test(document.getElementById("status").textContent), null, { timeout: 10000 })
    .then(() => check("host says it lost the server", true), () => check("host says it lost the server", false));
  check("host keeps its room code and players", (await h2.textContent("#roomCode")).trim() === code2 && (await h2.$$("#players .p")).length === 2);
  await h2.waitForFunction(() => /back online/.test(document.getElementById("status").textContent), null, { timeout: 30000 })
    .then(() => check("host reconnects to the server by itself", true), () => check("host reconnects to the server by itself", false));
  check("room survived the whole blip", (await h2.$$("#players .p")).length === 2 && (await h2.textContent("#roomCode")).trim() === code2);

  // a new player can still join after that reconnect
  const g5 = await (await browser.newContext()).newPage();
  await g5.goto(URL + "#" + code2); await g5.fill("#name", "late"); await g5.click("#joinBtn");
  await g5.waitForSelector("#room:not(.hidden)", { timeout: 25000 })
    .then(() => check("someone new can join after the reconnect", true), () => check("someone new can join after the reconnect", false));
  await g5.context().close();

  // guest refresh: rejoins via the invite link
  await g2.reload();
  await g2.click("#joinBtn");
  await g2.waitForSelector("#room:not(.hidden)", { timeout: 20000 })
    .then(() => check("guest refresh can rejoin via invite link", true), () => check("guest refresh can rejoin via invite link", false));

  // joining a code nobody hosts offers to host it
  const g3 = await (await browser.newContext()).newPage();
  await g3.goto(URL); await g3.fill("#name", "x"); await g3.fill("#code", "ZZZZ"); await g3.click("#joinBtn");
  await g3.waitForSelector("#hostInsteadBtn:not(.hidden)", { timeout: 8000 })   // offered at once, not after the retry budget
    .then(() => check("dead code offers 'host this room instead'", true), () => check("dead code offers 'host this room instead'", false));
  await g3.click("#hostInsteadBtn");
  await g3.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  check("hosting that code works", (await g3.textContent("#roomCode")).trim() === "ZZZZ");

  // --- second tab in the SAME browser opens the invite link while tab 1 hosts ---
  // auto-reclaim can't take a code that is already live, so it must fall back to joining
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 750 } });
  const t1 = await ctx.newPage(), t2 = await ctx.newPage();
  for (const p of [t1, t2]) p.on("pageerror", e => console.log("PAGE ERROR", e.message));
  await t1.goto(URL); await t1.fill("#name", "tab1"); await t1.click("#createBtn");
  await t1.waitForSelector("#room:not(.hidden)", { timeout: 20000 });
  const code4 = (await t1.textContent("#roomCode")).trim();
  await t2.goto(URL + "#" + code4);
  await t2.waitForSelector("#room:not(.hidden)", { timeout: 40000 })
    .then(() => check("2nd tab on a live code joins instead of seizing it", true), () => check("2nd tab on a live code joins instead of seizing it", false));
  await t1.waitForFunction(() => document.querySelectorAll("#players .p").length === 2, null, { timeout: 15000 })
    .then(() => check("tab 1 keeps hosting and sees tab 2", true), () => check("tab 1 keeps hosting and sees tab 2", false));

  // --- a guest who drops mid-race must not wedge the race ---
  await t1.click('[data-c="mode"][data-v="words"]');
  await t1.click('[data-c="amount"][data-v="10"]');
  await t1.click("#startBtn");
  await t1.waitForFunction(() => document.querySelectorAll("#words .w").length > 0, null, { timeout: 15000 });
  await t1.waitForTimeout(3500);
  await t2.reload();                       // guest vanishes mid-race
  await t1.waitForTimeout(1000);
  const text = await t1.$$eval("#words .w", ws => ws.map(w => w.textContent).join(" "));
  await t1.click("#box");
  await t1.keyboard.type(text, { delay: 15 });   // host finishes the race alone
  await t1.waitForSelector("#results:not(.hidden)", { timeout: 15000 })
    .then(() => check("race ends after a guest drops mid-race", true), () => check("race ends after a guest drops mid-race", false));
  await ctx.close();

  // solo: logo -> home, no back row
  await host.click("#soloBtn");
  check("solo starts", await vis(host, "#room"));
  await host.click("#logo");
  check("solo -> home has no back row", await vis(host, "#home") && !(await vis(host, "#backRow")));

  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

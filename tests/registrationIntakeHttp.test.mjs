import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

const payload = {
  schema_version: 1, event_type: "album.registration.confirmed",
  registration_id: "REG-TEST-001", album_id: "ALBUM-TEST-001",
  album_copy_number: "COPY-TEST-001", registered_owner_id: "CLERK-TEST-001",
  purchase_transaction_id: "TX-TEST-001",
  registration_date: "2026-11-17T20:00:00.000Z"
};
const token = "synthetic-test-token-32-characters-minimum";
async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}
async function withServer(settings, run) {
  const port = await freePort();
  const child = spawn(process.execPath, ["server/index.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), AJINE_REGISTRATION_PREVIEW_TOKEN: token,
      AJINE_REGISTRATION_INTAKE_INSPECT_ENABLED: "false", AJINE_DIRECTUS_TOKEN: "",
      ...settings },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const base = "http://127.0.0.1:" + port;
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw Error("NFT API exited before startup");
      try {
        const r = await fetch(base + "/healthz", {signal: AbortSignal.timeout(500)});
        if (r.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, "NFT API must be reachable");
    await run(base);
  } finally {
    child.kill("SIGTERM");
    await new Promise(resolve => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(resolve, 2000).unref();
    });
  }
}
async function send(base, body, auth = token) {
  return fetch(base + "/api/integrations/registration/inspect", {
    method: "POST",
    headers: {"Content-Type":"application/json", ...(auth ? { Authorization:"Bearer " + auth } : {})},
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4000)
  });
}
test("disabled NFT intake denies synthetic JSON with no storage", async () => {
  await withServer({}, async base => {
    const response = await send(base, payload);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {error:"intake_inspection_disabled"});
  });
});
test("enabled NFT intake rejects missing token, rejects malformed payload, validates exact contract with NO writes", async () => {
  await withServer({ AJINE_REGISTRATION_INTAKE_INSPECT_ENABLED:"true" }, async base => {
    const forbidden = await send(base, payload, "");
    assert.equal(forbidden.status, 401);
    const invalid = await send(base, {...payload, album_copy_number:""});
    assert.equal(invalid.status, 422);
    const valid = await send(base, payload);
    assert.equal(valid.status, 200);
    const reply = await valid.json();
    assert.deepEqual(reply, {ok:true,schema_version:1,validated:true,stored:false,payment_verified:false,minted:false});
    assert.equal(JSON.stringify(reply).includes(payload.registered_owner_id), false);
    const extraField = await send(base, {...payload, credit_card_number:"4111111111111111"});
    assert.equal(extraField.status, 422);
    const browserPreflight = await fetch(base + "/api/integrations/registration/inspect", {method:"OPTIONS"});
    assert.equal(browserPreflight.headers.get("access-control-allow-origin"), null);
  });
});

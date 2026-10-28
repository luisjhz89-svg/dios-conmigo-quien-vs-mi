import assert from "node:assert/strict";
import test from "node:test";
import { getSessionToken } from "./auth.js";

test("reads only the HttpOnly session cookie from a cookie header", () => {
  assert.equal(
    getSessionToken("theme=light; dios_session=header.payload.signature"),
    "header.payload.signature",
  );
  assert.equal(getSessionToken("dios_session=token%2Evalue"), "token.value");
});

test("rejects absent or malformed session cookies", () => {
  assert.equal(getSessionToken(undefined), null);
  assert.equal(getSessionToken("theme=light"), null);
  assert.equal(getSessionToken("dios_session=%"), null);
});

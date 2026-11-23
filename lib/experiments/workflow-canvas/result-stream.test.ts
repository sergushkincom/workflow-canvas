import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resultStreamPrefix, resultStreamWords } from "./result-stream";

const BILLING = "Routed to Billing · assigned to the on-call agent";
const TRIAGE = "Sent to triage queue · no automatic routing applied";

describe("result stream words", () => {
  test("keeps the space after each word", () => {
    assert.deepEqual(resultStreamWords("Routed to Billing"), [
      "Routed ",
      "to ",
      "Billing",
    ]);
  });

  test("a lone middot stays with the word before it", () => {
    assert.deepEqual(resultStreamWords("Billing · assigned"), [
      "Billing · ",
      "assigned",
    ]);
  });

  test("the billing and triage sentences rebuild from their words", () => {
    for (const sentence of [BILLING, TRIAGE]) {
      const words = resultStreamWords(sentence);
      assert.ok(words.length > 1);
      assert.equal(resultStreamPrefix(words, 0), "");
      assert.equal(resultStreamPrefix(words, 1), words[0]);
      assert.equal(resultStreamPrefix(words, words.length), sentence);
      assert.equal(words.join(""), sentence);
    }
  });

  test("the billing middot is not its own beat", () => {
    const words = resultStreamWords(BILLING);
    assert.equal(resultStreamPrefix(words, 3), "Routed to Billing · ");
    assert.equal(
      words.some((word) => word.trim() === "·"),
      false,
    );
  });

  test("blank text has nothing to reveal", () => {
    assert.deepEqual(resultStreamWords(""), []);
    assert.deepEqual(resultStreamWords("   "), []);
    assert.equal(resultStreamPrefix([], 3), "");
  });
});

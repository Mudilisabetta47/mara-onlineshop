import test from "node:test";
import assert from "node:assert/strict";
import { includedTax, toCents, effectivePrice, percentOff } from "./money";

test("includedTax extracts 19% from gross", () => {
  assert.equal(includedTax(11900), 1900);
  assert.equal(includedTax(8990), 1435);
});
test("toCents parses german and plain numbers", () => {
  assert.equal(toCents("49,90"), 4990);
  assert.equal(toCents("1.249,00"), 124900);
  assert.equal(toCents(12.5), 1250);
});
test("effectivePrice ignores invalid sale prices", () => {
  assert.equal(effectivePrice(5000, 3999), 3999);
  assert.equal(effectivePrice(5000, 6000), 5000);
  assert.equal(effectivePrice(5000, null), 5000);
});
test("percentOff", () => assert.equal(percentOff(5000, 3500), 30));

import assert from "node:assert/strict";
import test from "node:test";
import { chooseVerse } from "./verses.js";

test("selects a relevant biblical reference for the user's concern", () => {
  assert.equal(chooseVerse("Tengo ansiedad por el futuro").reference, "Filipenses 4:6-7");
  assert.equal(chooseVerse("Me siento triste y solo").reference, "Salmo 34:18");
  assert.equal(chooseVerse("No sé qué decisión tomar").reference, "Proverbios 3:5-6");
});

test("provides a safe general reference for other messages", () => {
  assert.equal(chooseVerse("Quería compartir algo").reference, "Salmo 23:1-4");
});

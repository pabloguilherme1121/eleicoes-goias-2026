"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const file = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(file, "utf8");
const document = new JSDOM(html).window.document;
const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

assert.equal(scripts.length, 1, "a página pública precisa ter exatamente um JSON-LD");
const website = JSON.parse(scripts[0].textContent);
const canonical = document.querySelector('link[rel="canonical"]')?.href;
const description = document.querySelector('meta[name="description"]')?.content;

assert.equal(website["@context"], "https://schema.org");
assert.equal(website["@type"], "WebSite");
assert.equal(website.name, document.title);
assert.equal(website.description, description);
assert.equal(website.url, canonical);
assert.equal(website.inLanguage, document.documentElement.lang);
assert.equal(website.isAccessibleForFree, true);
assert.equal(website.publisher, undefined, "não atribuir publicação ao TSE ou a órgão público sem evidência");
assert.equal(website.aggregateRating, undefined, "não inventar avaliações");

console.log("JSON-LD WebSite alinhado com os metadados públicos.");

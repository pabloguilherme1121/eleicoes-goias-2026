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
 
const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
const ogUrl = document.querySelector('meta[property="og:url"]')?.content;
const ogImage = document.querySelector('meta[property="og:image"]')?.content;
const ogDescription = document.querySelector('meta[property="og:description"]')?.content;

assert.equal(ogTitle, document.title, "título Open Graph deve acompanhar o título da página");
assert.equal(ogUrl, canonical, "URL Open Graph deve acompanhar o canonical");
assert.match(ogDescription || "", /\S/, "descrição Open Graph não pode estar vazia");
assert(ogImage, "imagem Open Graph obrigatória");
const canonicalUrl = new URL(canonical);
const imageUrl = new URL(ogImage);
assert.equal(imageUrl.origin, canonicalUrl.origin, "imagem Open Graph deve usar a mesma origem pública");
assert(imageUrl.pathname.startsWith(canonicalUrl.pathname), "imagem Open Graph deve estar no caminho publicado");
const imagePath = imageUrl.pathname.slice(canonicalUrl.pathname.length);
assert(fs.existsSync(path.join(__dirname, "..", imagePath)), "imagem Open Graph deve existir no repositório");


console.log("JSON-LD WebSite alinhado com os metadados públicos.");

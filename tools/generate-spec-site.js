#!/usr/bin/env node
// Generate a static spec site from docs/specs/*.md and docs/*.md
// Usage: node tools/generate-spec-site.js
// Output: docs/site/

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const specsDir = resolve(root, "docs/specs");
const docsDir = resolve(root, "docs");
const outDir = resolve(root, "docs");

const specFiles = readdirSync(specsDir).filter((f) => f.endsWith(".md"));
const docFiles = ["vision.md", "architecture.md", "protocol-design.md", "mcp-relationship.md", "roadmap.md", "differentiation.md"];

mkdirSync(outDir, { recursive: true });

function mdToHtml(md) {
  const blocks = [];
  const links = [];
  const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapeAttribute = (value) => escapeHtml(value).replace(/"/g, "&quot;");
  const addBlock = (html) => {
    const placeholder = `@@AEP_BLOCK_${blocks.length}@@`;
    blocks.push(html);
    return placeholder;
  };
  const renderInline = (value) => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  const renderLink = (text, target) => {
    const trimmed = target.trim();
    const localMarkdown = !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(trimmed) && /^.*\.md(?:#.*)?$/i.test(trimmed);
    const href = localMarkdown
      ? trimmed.replace(/^(?:.*\/)?([^/]+)\.md(#.*)?$/i, "$1.html$2")
      : trimmed;
    const allowed = /^(?:https?:|mailto:|#)/i.test(href) || (!/^[a-z][a-z\d+.-]*:/i.test(href) && !href.startsWith("//"));
    return allowed ? `<a href="${escapeAttribute(href)}">${renderInline(text)}</a>` : renderInline(text);
  };
  const renderTable = (table) => {
    const rows = table.trim().split("\n");
    const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => renderInline(cell.trim()));
    const header = cells(rows[0]).map((cell) => `<th>${cell}</th>`).join("");
    const body = rows.slice(2).map((row) => `<tr>${cells(row).map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("\n");
    return `<table>\n<thead><tr>${header}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
  };

  let html = md
    .replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code) => addBlock(`<pre><code>${escapeHtml(code)}</code></pre>`))
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, target) => {
      const placeholder = `@@AEP_LINK_${links.length}@@`;
      links.push(renderLink(text, target));
      return placeholder;
    })
    .replace(/(^|\n)(\|[^\n]+\|\n\|(?:\s*:?-+:?\s*\|)+\n(?:\|[^\n]+\|\n?)+)/g, (_, prefix, table) => `${prefix}${addBlock(renderTable(table))}\n`)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  html = html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = html.split("\n");
  const parts = [];
  let para = [];

  const flushPara = () => {
    if (para.length) {
      parts.push(`<p>${para.join(" ")}</p>`);
      para = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^@@AEP_BLOCK_\d+@@$/.test(trimmed)) {
      flushPara();
      parts.push(trimmed);
      continue;
    }

    let m = trimmed.match(/^### (.+)$/);
    if (m) { flushPara(); parts.push(`<h3>${m[1]}</h3>`); continue; }
    m = trimmed.match(/^## (.+)$/);
    if (m) { flushPara(); parts.push(`<h2>${m[1]}</h2>`); continue; }
    m = trimmed.match(/^# (.+)$/);
    if (m) { flushPara(); parts.push(`<h1>${m[1]}</h1>`); continue; }

    m = trimmed.match(/^- (.+)$/);
    if (m) {
      flushPara();
      parts.push(`<li>${m[1]}</li>`);
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushPara();
      continue;
    }

    para.push(line.trimRight());
  }
  flushPara();

  const grouped = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith("<li>")) {
      const group = [parts[i]];
      while (i + 1 < parts.length && parts[i + 1].startsWith("<li>")) {
        group.push(parts[++i]);
      }
      grouped.push(`<ul>\n${group.join("\n")}\n</ul>`);
    } else {
      grouped.push(parts[i]);
    }
  }

  html = grouped.join("\n")
    .replace(/@@AEP_LINK_(\d+)@@/g, (_, index) => links[index])
    .replace(/@@AEP_BLOCK_(\d+)@@/g, (_, index) => blocks[index]);

  return html;
}

function readAndConvert(filePath) {
  const md = readFileSync(filePath, "utf8");
  const title = basename(filePath, ".md").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { title, html: mdToHtml(md) };
}

function pageTemplate(title, content, nav) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — AEP Specification</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #1a1a1a; }
  nav { background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 24px; }
  nav a { margin-right: 16px; color: #2563eb; text-decoration: none; }
  nav a:hover { text-decoration: underline; }
  h1 { border-bottom: 2px solid #e5e5e5; padding-bottom: 8px; }
  h2 { margin-top: 32px; color: #374151; }
  h3 { margin-top: 24px; color: #4b5563; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #f8f8f8; padding: 16px; border-radius: 6px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; margin: 16px 0; }
  td, th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f5; }
  li { margin: 4px 0; }
</style>
</head>
<body>
<nav>${nav}</nav>
${content}
</body>
</html>`;
}

// Generate nav
const navLinks = '<a href="index.html">Home</a>' +
  specFiles.map((f) => `<a href="${f.replace('.md', '.html')}">${f.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</a>`).join("");

// Generate spec pages
for (const file of specFiles) {
  const { title, html } = readAndConvert(resolve(specsDir, file));
  writeFileSync(resolve(outDir, file.replace(".md", ".html")), pageTemplate(title, `<h1>${title}</h1>\n${html}`, navLinks));
}

// Generate design document pages
for (const file of docFiles.filter((f) => existsSync(resolve(docsDir, f)))) {
  const { title, html } = readAndConvert(resolve(docsDir, file));
  writeFileSync(resolve(outDir, file.replace(".md", ".html")), pageTemplate(title, `<h1>${title}</h1>\n${html}`, navLinks));
}

// Generate home page
const homeContent = `<h1>AEP Specification</h1>
<p>Agent Event Protocol (AEP) — an asynchronous event layer for agents, tools, memory systems, context providers, and multi-agent runtimes.</p>
<h2>Specifications</h2>
<ul>${specFiles.map((f) => `<li><a href="${f.replace('.md', '.html')}">${f.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</a></li>`).join("")}</ul>
<h2>Design Documents</h2>
<ul>${docFiles.filter((f) => existsSync(resolve(docsDir, f))).map((f) => `<li><a href="${f.replace('.md', '.html')}">${f.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</a></li>`).join("")}</ul>
<p>Generated from <code>docs/specs/</code> and <code>docs/</code>.</p>`;

writeFileSync(resolve(outDir, "index.html"), pageTemplate("AEP Specification", homeContent, navLinks));

console.log(`Site generated: ${outDir}`);
console.log(`Open: docs/site/index.html`);

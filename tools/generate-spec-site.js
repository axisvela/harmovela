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
const outDir = resolve(root, "docs/site");

const specFiles = readdirSync(specsDir).filter((f) => f.endsWith(".md"));
const docFiles = ["vision.md", "architecture.md", "protocol-design.md", "mcp-relationship.md", "roadmap.md"];

mkdirSync(outDir, { recursive: true });

function mdToHtml(md) {
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>\n${m}</ul>\n`)
    .replace(/\n\n/g, "</p>\n<p>")
    .replace(/\|(.+)\|/g, (m) => {
      const cells = m.split("|").filter((c) => c.trim());
      const tag = m.includes("---") ? "" : "<tr>" + cells.map((c) => {
        const trimmed = c.trim();
        return /^[-:]+$/.test(trimmed) ? "" : `<td>${trimmed}</td>`;
      }).join("") + "</tr>";
      return tag;
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, (m) => `<table>\n${m}</table>\n`)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  return `<p>${html}</p>`;
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

// Generate home page
const homeContent = `<h1>AEP Specification</h1>
<p>Agent Event Protocol (AEP) — an asynchronous event layer for agents, tools, memory systems, context providers, and multi-agent runtimes.</p>
<h2>Specifications</h2>
<ul>${specFiles.map((f) => `<li><a href="${f.replace('.md', '.html')}">${f.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</a></li>`).join("")}</ul>
<h2>Design Documents</h2>
<ul>${docFiles.filter((f) => existsSync(resolve(docsDir, f))).map((f) => `<li>${f.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</li>`).join("")}</ul>
<p>Generated from <code>docs/specs/</code> and <code>docs/</code>.</p>`;

writeFileSync(resolve(outDir, "index.html"), pageTemplate("AEP Specification", homeContent, navLinks));

console.log(`Site generated: ${outDir}`);
console.log(`Open: docs/site/index.html`);

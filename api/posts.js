// api/posts.js
// Serves blog posts from the /posts directory as JSON
// Reads .md files, parses frontmatter + content, converts to HTML
//
// GET /api/posts           → list of all posts (title, date, slug, excerpt)
// GET /api/posts?slug=my-post-slug  → full post content as HTML

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const { slug } = req.query;

  try {
    // We fetch from the GitHub raw content API so we don't need fs module
    // (Vercel serverless functions have read-only access to repo files,
    //  but fetching from GitHub raw is more reliable across deployments)
    const GITHUB_USER = process.env.GITHUB_USER || "daemoz";
    const GITHUB_REPO = process.env.GITHUB_REPO || "portfolio";
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
    const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/posts`;
    const API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/posts`;

    if (slug) {
      // ── SINGLE POST ──────────────────────────────────────────
      const mdRes = await fetch(`${RAW_BASE}/${slug}.md`);
      if (!mdRes.ok) {
        return res.status(404).json({ error: "Post not found", slug });
      }
      const raw = await mdRes.text();
      const post = parseMarkdown(raw, slug);
      return res.status(200).json({ ok: true, post });

    } else {
      // ── POST LIST ─────────────────────────────────────────────
      // Use GitHub API to list files in /posts directory
      const ghRes = await fetch(API_BASE, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "daemoz-portfolio"
        }
      });

      if (!ghRes.ok) {
        // If GitHub API rate-limits or errors, return empty list gracefully
        console.error("GitHub API error:", ghRes.status);
        return res.status(200).json({ ok: true, posts: [], error: "Could not fetch post list" });
      }

      const files = await ghRes.json();
      const mdFiles = files.filter(f => f.name.endsWith(".md") && f.name !== "README.md");

      // Fetch each post to extract frontmatter (title, date, excerpt)
      // We limit to 20 most recent to avoid rate limiting
      const postList = await Promise.all(
        mdFiles.slice(0, 20).map(async (file) => {
          const slug = file.name.replace(/\.md$/, "");
          try {
            const r = await fetch(file.download_url);
            const raw = await r.text();
            const parsed = parseMarkdown(raw, slug);
            // Return summary only (no full HTML for list view)
            return {
              slug: parsed.slug,
              title: parsed.title,
              date: parsed.date,
              category: parsed.category,
              tags: parsed.tags,
              excerpt: parsed.excerpt
            };
          } catch (e) {
            return { slug, title: slug, date: "", excerpt: "" };
          }
        })
      );

      // Sort newest first by date
      postList.sort((a, b) => (b.date > a.date ? 1 : -1));
      return res.status(200).json({ ok: true, posts: postList });
    }

  } catch (err) {
    console.error("posts error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ── MARKDOWN PARSER ───────────────────────────────────────────
// Handles YAML-style frontmatter + basic Markdown → HTML
// No external dependencies needed — keeps the function lightweight

function parseMarkdown(raw, slug) {
  let frontmatter = {};
  let body = raw;

  // Extract frontmatter block  ---\n...\n---
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const fmLines = fmMatch[1].split("\n");
    fmLines.forEach(line => {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) {
        let val = rest.join(":").trim().replace(/^["']|["']$/g, "");
        // Parse tags array:  tags: [gis, mapping, python]
        if (val.startsWith("[") && val.endsWith("]")) {
          val = val.slice(1, -1).split(",").map(t => t.trim());
        }
        frontmatter[key.trim()] = val;
      }
    });
    body = fmMatch[2];
  }

  // Build excerpt from first paragraph if not in frontmatter
  const excerpt = frontmatter.excerpt ||
    body.replace(/^#+.*$/gm, "").replace(/\n+/g, " ").trim().slice(0, 200) + "…";

  // Convert Markdown body → HTML (basic subset)
  const html = mdToHtml(body);

  return {
    slug,
    title: frontmatter.title || slug.replace(/-/g, " ").toUpperCase(),
    date: frontmatter.date || "",
    category: frontmatter.category || "MISC",
    tags: frontmatter.tags || [],
    excerpt,
    html
  };
}

function mdToHtml(md) {
  return md
    // Code blocks (``` ... ```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="code-block" data-lang="${lang}"><code>${escHtml(code.trim())}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Images  ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
      "<img src=\"$2\" alt=\"$1\" style=\"max-width:100%;border:1px solid var(--panel-border);margin:10px 0;\">")
    // Links  [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\">$1</a>")
    // Horizontal rule
    .replace(/^---$/gm, "<div class=\"pixel-divider\"></div>")
    // Blockquote
    .replace(/^> (.+)$/gm,
      "<blockquote style=\"border-left:3px solid var(--purple);padding-left:12px;color:var(--text-dim);margin:8px 0;\">$1</blockquote>")
    // Unordered lists (group consecutive - lines)
    .replace(/((?:^- .+\n?)+)/gm, (block) => {
      const items = block.trim().split("\n").map(l => `<li>${l.slice(2)}</li>`).join("");
      return `<ul style="margin:8px 0 8px 20px;color:var(--text-dim);">${items}</ul>`;
    })
    // Paragraphs (blank-line separated chunks that aren't already HTML)
    .replace(/(?:^|\n\n)(?!<)((?:.(?!\n\n))+)/g, (_, p) => {
      const trimmed = p.trim();
      if (!trimmed || trimmed.startsWith("<")) return _;
      return `\n\n<p>${trimmed}</p>`;
    })
    // Clean up excess newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

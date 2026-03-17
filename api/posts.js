module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const GITHUB_USER   = process.env.GITHUB_USER   || "daemoz";
  const GITHUB_REPO   = process.env.GITHUB_REPO   || "portfolio";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
  const RAW_BASE = "https://raw.githubusercontent.com/" + GITHUB_USER + "/" + GITHUB_REPO + "/" + GITHUB_BRANCH + "/posts";
  const API_BASE = "https://api.github.com/repos/" + GITHUB_USER + "/" + GITHUB_REPO + "/contents/posts";

  const slug = req.query.slug;

  try {
    if (slug) {
      const safeslug = slug.replace(/[^a-zA-Z0-9_\-]/g, "");
      const r = await fetch(RAW_BASE + "/" + safeslug + ".md");
      if (!r.ok) return res.status(404).json({ error: "Post not found", slug: safeslug });
      const raw = await r.text();
      return res.status(200).json({ ok: true, post: parseMarkdown(raw, safeslug) });
    }

    const ghRes = await fetch(API_BASE, {
      headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "daemoz-portfolio" }
    });

    if (!ghRes.ok) {
      return res.status(200).json({ ok: true, posts: [], error: "GitHub API error: " + ghRes.status });
    }

    const files = await ghRes.json();

    if (!Array.isArray(files)) {
      return res.status(200).json({ ok: true, posts: [], error: "GitHub API unexpected response" });
    }

    const mdFiles = files.filter(function(f) {
      return f.name.endsWith(".md") && f.name !== "README.md";
    });

    const postList = await Promise.all(
      mdFiles.slice(0, 20).map(async function(file) {
        var s = file.name.replace(/\.md$/, "");
        try {
          var r2 = await fetch(file.download_url);
          var raw2 = await r2.text();
          var p = parseMarkdown(raw2, s);
          return { slug: p.slug, title: p.title, date: p.date, category: p.category, tags: p.tags, excerpt: p.excerpt };
        } catch(e) {
          return { slug: s, title: s, date: "", excerpt: "" };
        }
      })
    );

    postList.sort(function(a, b) { return b.date > a.date ? 1 : -1; });
    return res.status(200).json({ ok: true, posts: postList });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

function parseMarkdown(raw, slug) {
  var frontmatter = {}, body = raw;
  var fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    fmMatch[1].split("\n").forEach(function(line) {
      var idx = line.indexOf(":");
      if (idx === -1) return;
      var key = line.slice(0, idx).trim();
      var val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (val.startsWith("[") && val.endsWith("]")) {
        val = val.slice(1, -1).split(",").map(function(t) { return t.trim(); });
      }
      frontmatter[key] = val;
    });
    body = fmMatch[2];
  }
  var excerpt = frontmatter.excerpt ||
    body.replace(/^#+.*$/gm, "").replace(/\n+/g, " ").trim().slice(0, 200) + "...";
  return {
    slug: slug,
    title: frontmatter.title || slug.replace(/-/g, " ").toUpperCase(),
    date: frontmatter.date || "",
    category: frontmatter.category || "MISC",
    tags: frontmatter.tags || [],
    excerpt: excerpt,
    html: mdToHtml(body)
  };
}

function mdToHtml(md) {
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
      return "<pre class=\"code-block\"><code>" + escHtml(code.trim()) + "</code></pre>";
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "<img src=\"$2\" alt=\"$1\" style=\"max-width:100%;\">")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\">$1</a>")
    .replace(/^---$/gm, "<div class=\"pixel-divider\"></div>")
    .replace(/^> (.+)$/gm, "<blockquote style=\"border-left:3px solid var(--purple);padding-left:12px;color:var(--text-dim);\">$1</blockquote>")
    .replace(/\n\n([^<\n][^\n]+)/g, "\n\n<p>$1</p>")
    .trim();
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

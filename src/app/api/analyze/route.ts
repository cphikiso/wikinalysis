import { NextRequest } from "next/server";
import OpenAI from "openai";

// Simple in-memory cache to avoid repeatedly hitting GitHub + OpenAI for the same repo during
// a single server runtime instance. Feel free to replace with Redis or KV store for production.
const cache = new Map<string, unknown>();

/**
 * Extracts the `owner` and `repo` slug from a GitHub URL of the form:
 *   https://github.com/owner/repo or owner/repo
 */
function parseGitHubSlug(rawUrl: string): { owner: string; repo: string } {
  // If user passed owner/repo directly, normalise to url
  if (!rawUrl.startsWith("http")) {
    const [owner, repo] = rawUrl.replace(/^\/*/, "").split("/");
    if (!owner || !repo) {
      throw new Error("Invalid GitHub slug. Expected format owner/repo");
    }
    return { owner, repo };
  }

  const url = new URL(rawUrl);
  const [, owner, repo] = url.pathname.split("/");
  if (!owner || !repo) {
    throw new Error(
      "Invalid GitHub URL. Expected https://github.com/owner/repo"
    );
  }
  return { owner, repo };
}

interface GitTreeItem {
  path: string;
  type: string;
}

async function fetchGitHubRepoTree(
  owner: string,
  repo: string,
  token?: string
) {
  const apiBase = "https://api.github.com";

  const metaRes = await fetch(`${apiBase}/repos/${owner}/${repo}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!metaRes.ok) {
    throw new Error(`GitHub repo lookup failed: ${metaRes.status}`);
  }
  const meta: { default_branch?: string } = await metaRes.json();
  const branch = meta.default_branch ?? "main";

  const treeRes = await fetch(
    `${apiBase}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
  );

  if (!treeRes.ok) {
    throw new Error(`Failed to fetch repo tree: ${treeRes.status}`);
  }
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  const treeJson: { tree: GitTreeItem[] } = await treeRes.json();
  /* eslint-enable */
  return treeJson.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path);
}

async function fetchReadme(owner: string, repo: string, token?: string) {
  const apiBase = "https://api.github.com";
  const res = await fetch(`${apiBase}/repos/${owner}/${repo}/readme`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    return ""; // ignore errors if README missing
  }
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  const json: { content: string } = await res.json();
  /* eslint-enable */
  return Buffer.from(json.content, "base64").toString("utf-8");
}

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function openAIGenerate(markdownPrompt: string) {
  if (!openaiClient.apiKey) {
    throw new Error("OPENAI_API_KEY env var not set");
  }

  const completion = await openaiClient.chat.completions.create({
    model: "o4-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a senior software architect. Provide clear, concise markdown explanations.",
      },
      {
        role: "user",
        content: markdownPrompt,
      },
    ],
  });

  return completion.choices[0].message?.content ?? "";
}

function buildDetailedWikiPrompt(
  owner: string,
  repo: string,
  fileTree: string,
  readme: string
) {
  return `You are an expert technical writer and senior software architect.

Your task is to generate a COMPREHENSIVE GitHub-styled wiki page in **Markdown** for the repository **${owner}/${repo}**.

CRITICAL REQUIREMENTS:
1. **Begin** with a <details> block that lists *relevant* source files, each as a Markdown list item linking directly to the file in GitHub. Use the format:
   <details>
   <summary>Relevant source files</summary>

   - [path/to/file.ext](https://github.com/${owner}/${repo}/blob/main/path/to/file.ext)
   </details>
2. Immediately after the <details> block, include a **Table of Contents** that links to every top-level heading you will write.
3. Provide the following sections (use exact titles so links work):
   - Introduction
   - Architecture Overview (include at least one **Mermaid** diagram, e.g. graph TD)
   - Key Features
   - Implementation Details
   - Usage Examples
   - API / Interfaces
   - Configuration
   - Dependencies
   - Sources (cite files + line numbers, e.g. [src/index.ts#L10-L42](…))
4. Where appropriate, embed additional Mermaid diagrams (sequence / class) and code snippets from the repository.
5. Keep the writing concise yet thorough – prioritise clarity for engineers new to the codebase.

INPUTS
------
FILE_TREE:
${fileTree}

README:
${readme}

Return ONLY valid GitHub-flavoured Markdown – **no extra commentary, no code fences around the whole document**.`;
}

export async function POST(req: NextRequest) {
  try {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const { url, githubToken } = await req.json();
    /* eslint-enable */

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing `url`" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Check cache first
    if (cache.has(url)) {
      return new Response(JSON.stringify(cache.get(url)), {
        headers: { "content-type": "application/json" },
      });
    }

    const { owner, repo } = parseGitHubSlug(url);

    const [tree, readme] = await Promise.all([
      fetchGitHubRepoTree(owner, repo, githubToken),
      fetchReadme(owner, repo, githubToken),
    ]);

    const fileTreeString = tree.join("\n");
    const prompt = buildDetailedWikiPrompt(owner, repo, fileTreeString, readme);

    const analysis = await openAIGenerate(prompt);

    const payload = { owner, repo, analysis, fileTree: tree };
    cache.set(url, payload);

    return new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("/api/analyze error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

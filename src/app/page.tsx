/* VERSION_2 page.tsx*/
"use client";

import { useState, useMemo } from "react";
import { marked } from "marked";
import Chat from "@/chat";

export default function Page() {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<string[]>([]);

  const analyzeRepo = async () => {
    if (!repoUrl) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const json = await res.json();
      setAnalysis(json.analysis);
      setFileTree(json.fileTree as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analysisHtml = useMemo(() => {
    if (!analysis) return "";
    // Enable automatic line breaks and GitHub-flavoured markdown
    return marked.parse(analysis, { breaks: true });
  }, [analysis]);

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-4">GitHub Repo Wiki Chat</h1>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="w-full border rounded p-2"
        />
        <button
          onClick={analyzeRepo}
          disabled={isAnalyzing || !repoUrl}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze"}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      {analysis && (
        <div className="prose max-w-none bg-gray-50 p-4 rounded border overflow-x-auto">
          <h2>Repository Wiki</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: analysisHtml,
            }}
          />
        </div>
      )}

      {analysis && <Chat analysis={analysis} fileTree={fileTree} />}
    </div>
  );
}

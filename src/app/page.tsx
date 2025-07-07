/* VERSION_2 page.tsx*/
"use client";

import { useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import type { FormEvent } from "react";
import { marked } from "marked";

export default function Page() {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    messages,
    input,
    handleSubmit,
    handleInputChange,
    status,
    setMessages,
  } = useChat({
    api: "/api/chat",
    initialMessages: [],
    body: {
      // extra body will be merged per request; we send analysis each time
    },
  });

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
      // prime chat with system message containing wiki
      setMessages([
        {
          id: "sys-1",
          role: "system",
          content: `You are an expert on the following GitHub repository. Use the analysis below and the file tree to answer questions.\n\nANALYSIS:\n${
            json.analysis
          }\n\nFILE_TREE:\n${json.fileTree.join("\n")}`,
        },
      ]);
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

      {analysis && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Chat with the Repository Wiki
          </h2>
          <div className="border rounded p-4 h-80 overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className="mb-2">
                <strong>{m.role}: </strong>
                {m.parts ? (
                  m.parts.map((part, idx) => {
                    if (part.type === "text") {
                      const textPart = part as { type: "text"; text: string };
                      return <span key={idx}>{textPart.text}</span>;
                    }
                    return null;
                  })
                ) : (
                  <span>{m.content as string}</span>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={handleInputChange}
              disabled={status !== "ready"}
              className="flex-1 border rounded p-2"
              placeholder="Ask something..."
            />
            <button
              type="submit"
              disabled={status !== "ready" || !input}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

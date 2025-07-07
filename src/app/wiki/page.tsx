"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { marked } from "marked";
import Chat from "@/chat";
import { motion } from "framer-motion";

export default function WikiPage() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get("url") ?? "";

  const [analysis, setAnalysis] = useState<string>("");
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoUrl) return;

    const fetchAnalysis = async () => {
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
        setAnalysis(json.analysis as string);
        setFileTree(json.fileTree as string[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsAnalyzing(false);
      }
    };

    fetchAnalysis();
  }, [repoUrl]);

  const analysisHtml = useMemo(() => {
    if (!analysis) return "";
    return marked.parse(analysis, { breaks: true });
  }, [analysis]);

  return (
    <div className="flex flex-col lg:flex-row max-w-screen-xl mx-auto p-6 gap-6 bg-whiteBgFaintPurple min-h-screen">
      {/* Wiki section (3/4) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:w-3/4 w-full space-y-4 overflow-x-auto"
      >
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-mainPurple text-sm">
            <span className="animate-spin rounded-full border-2 border-mainPurple border-t-transparent h-4 w-4" />
            <p>Analyzing repository...</p>
          </div>
        )}
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {analysis && (
          <div className="prose max-w-none bg-whiteBgFaintPurple p-6 rounded-xl border border-whiteMainPurple shadow-sm">
            <h2>Repository Wiki</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: analysisHtml,
              }}
            />
          </div>
        )}
      </motion.div>

      {/* Chat section (1/4) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:w-1/4 w-full lg:sticky lg:top-6 h-fit"
      >
        {analysis && <Chat analysis={analysis} fileTree={fileTree} />}
      </motion.div>
    </div>
  );
}

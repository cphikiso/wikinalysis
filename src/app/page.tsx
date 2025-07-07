/* VERSION_2 page.tsx*/
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const router = useRouter();

  const handleAnalyze = () => {
    if (!repoUrl) return;
    // Navigate to the wiki page with the repo URL as a query parameter
    router.push(`/wiki?url=${encodeURIComponent(repoUrl)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-whiteBgFaintPurple px-4">
      <h1 className="text-3xl font-bold text-mainPurple">Wikinalysis</h1>

      <form
        className="space-y-2 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          handleAnalyze();
        }}
      >
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="w-full border border-whiteDarkPurple/50 rounded p-3 focus:outline-none focus:ring-2 focus:ring-mainPurple"
        />
        <button
          type="submit"
          disabled={!repoUrl}
          className="w-full px-5 py-3 rounded-lg bg-mainPurple text-white font-semibold hover:bg-darkPurple transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Analyze
        </button>
      </form>
    </div>
  );
}

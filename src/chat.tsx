import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";

interface ChatProps {
  analysis: string;
  fileTree: string[];
}

export default function Chat({ analysis, fileTree }: ChatProps) {
  const systemPrompt = useMemo(() => {
    if (!analysis) return "You are a helpful assistant.";
    return `You are an expert on the following GitHub repository. Use the analysis below and the file tree to answer questions.\n\nANALYSIS:\n${analysis}\n\nFILE_TREE:\n${fileTree.join(
      "\n"
    )}`;
  }, [analysis, fileTree]);

  const { messages, input, handleSubmit, handleInputChange, status } = useChat({
    api: "/api/chat",
    body: { system: systemPrompt },
    initialMessages: [],
  });

  return (
    <div className="space-y-4 h-full">
      <h2 className="text-xl font-semibold">Chat with the Repository Wiki</h2>
      <div className="border rounded-xl p-4 h-[70vh] overflow-y-auto bg-white flex flex-col gap-2">
        {messages.map((m) => {
          // Consolidate message text for display
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const content = (() => {
            if ("parts" in m && Array.isArray((m as any).parts)) {
              return (m as any).parts
                .filter((p: any) => p?.type === "text")
                .map((p: any) => p.text)
                .join("");
            }
            return (m as { content?: string }).content ?? "";
          })();
          /* eslint-enable @typescript-eslint/no-explicit-any */

          const isUser = m.role === "user";

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                  isUser
                    ? "bg-mainPurple text-white"
                    : "bg-whiteDarkPurple text-foreground"
                }`}
              >
                {content}
              </div>
            </motion.div>
          );
        })}
        {/* Loading placeholder */}
        {status !== "ready" && (
          <motion.div
            key="loading-placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-whiteDarkPurple text-black animate-pulse">
              ...
            </div>
          </motion.div>
        )}
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
          className="flex-1 border border-whiteDarkPurple/40 rounded p-2 focus:outline-none focus:ring-2 focus:ring-mainPurple"
          placeholder="Ask something..."
        />
        <button
          type="submit"
          disabled={!input}
          className="px-4 py-2 min-w-[72px] bg-mainPurple text-white rounded hover:bg-darkPurple transition disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {status === "submitted" || status === "streaming" ? (
            <span className="animate-spin rounded-full border-2 border-white border-t-transparent h-4 w-4" />
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}

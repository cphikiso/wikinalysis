import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import type { FormEvent } from "react";

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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Chat with the Repository Wiki</h2>
      <div className="border rounded p-4 h-80 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="mb-2">
            <strong>{m.role}: </strong>
            {"parts" in m && m.parts ? (
              m.parts.map((part, idx) => {
                if (part.type === "text") {
                  const textPart = part as { type: "text"; text: string };
                  return <span key={idx}>{textPart.text}</span>;
                }
                return null;
              })
            ) : (
              <span>{(m as { content?: string }).content ?? ""}</span>
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
  );
}

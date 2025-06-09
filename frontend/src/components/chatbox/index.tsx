import { useState, useRef, useEffect } from "react";
import { Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getMessagesByConversationId } from "@/lib/services/messages";
import { Artifact, type ArtifactData } from "./Artifact";
import { getArtifactsByConversationId } from "@/lib/services/artifacts";
import AgentSelector from "./AgentSelector";

type Message = {
  id: string;
  content: string;
  is_from_user: boolean;
  created_at: Date;
  sql_query?: string;
};

function Spinner() {
  return (
    <div className="flex justify-center items-center h-24">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted dark:border-b-white dark:border-l-white dark:border-r-white  border-t-transparent" />
    </div>
  );
}

export function ChatPage({ isNewChat = false }: { isNewChat: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] =
    useState<Message | null>(null);
  const { conversationId } = useParams();
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData[] | null>(
    null,
  );
  const [showArtifact, setShowArtifact] = useState<boolean>(false);
  const [streamComplete, setStreamComplete] = useState<boolean>(true);

  const navigate = useNavigate();

  const { fetchChatHistory } = useOutletContext<any>();

  // fetch All the chat data when the conversationID param changes
  const fetchData = async () => {
    setMessagesLoading(true);
    const data = await getMessagesByConversationId(conversationId || "");
    const artifactsData = await getArtifactsByConversationId(
      conversationId || "",
    );
    setMessagesLoading(false);
    setMessages(data.messages);
    setCurrentArtifact(artifactsData.artifacts);
  };

  useEffect(() => {
    setMessages([]);
    setCurrentArtifact([]);
    if (isNewChat) {
      setCurrentArtifact(null);
    }
    if (!isNewChat && conversationId) {
      fetchData();
    }
  }, [conversationId, isNewChat]); // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      is_from_user: true,
      created_at: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setCurrentStreamingMessage({
      id: "",
      content: "",
      is_from_user: false,
      created_at: new Date(),
    });
    setStreamComplete(false);
    try {
      let currentConversationId = conversationId;

      // ✅ If new chat, create it now
      if (isNewChat) {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}conversations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ initialTitle: "New Chat" }),
          },
        );

        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.error?.message || "Failed to create conversation",
          );
        currentConversationId = data.id;
      }

      // ✅ Continue with message streaming as before
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}messages/${currentConversationId}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: userMessage.content }),
        },
      );

      if (!response.ok || !response.body)
        throw new Error("Bad streaming response");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessageContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.replace("data: ", "");
            if (data === "[DONE]") break;

            const parsed = JSON.parse(data);
            aiMessageContent += parsed.content || "";

            setCurrentStreamingMessage({
              id: Date.now().toString(),
              content: aiMessageContent,
              is_from_user: false,
              created_at: new Date(parsed.created_at),
              ...(parsed.sql_query && { sql_query: parsed.sql_query }),
            });
            setIsLoading(false);
            if (parsed.artifactId) {
              setCurrentArtifact((prev) =>
                prev
                  ? [
                    ...prev,
                    {
                      id: parsed.artifactId,
                      name: `Analysis: ${userMessage.content.slice(0, 30)}...`,
                      description: "Generated from your query",
                      sql_query: parsed.sql_query || "",
                      columns: parsed.columns || [],
                      data_samples: parsed.data || [],
                      visualization_type: parsed.visualizationTypes || [
                        "table",
                      ],
                      row_count: parsed.data?.length || 0,
                    },
                  ]
                  : [
                    {
                      id: parsed.artifactId,
                      name: `Analysis: ${userMessage.content.slice(0, 30)}...`,
                      description: "Generated from your query",
                      sql_query: parsed.sql_query || "",
                      columns: parsed.columns || [],
                      data_samples: parsed.data || [],
                      visualization_type: parsed.visualizationTypes || [
                        "table",
                      ],
                      row_count: parsed.data?.length || 0,
                    },
                  ],
              );
              setShowArtifact(true);
            }
          }
        }
      }
      if (isNewChat) navigate(`/${currentConversationId}`);

      await fetchChatHistory();
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: "Sorry, there was an error processing your request.",
          is_from_user: false,
          created_at: new Date(),
        },
      ]);
    } finally {
      setStreamComplete(true);
    }
  };
  // When streaming completes, add the message to the main list
  useEffect(() => {
    if (streamComplete && currentStreamingMessage) {
      setMessages((prev) => [...prev, currentStreamingMessage]);
      setCurrentStreamingMessage(null);
    }
  }, [streamComplete, currentStreamingMessage]);

  return (
    <div className="flex">
      {" "}
      <div className="flex flex-col w-full h-screen bg-background dark:bg-black/60">
        {/* Main chat area with artifact sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat area */}
          <div
            className={`flex-1 overflow-hidden p-4 ${currentArtifact?.length ? "hidden md:block" : ""}`}
          >
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {messagesLoading && <Spinner />}{" "}
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    messagesLoading={false}
                  />
                ))}
                {currentStreamingMessage && (
                  <MessageBubble
                    message={currentStreamingMessage}
                    messagesLoading={isLoading}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        </div>
        {/* Input area */}
        <div className="border-t relative rounded-xl w-[60%] min-w-[300px] max-w-[747px] mx-auto mb-4 bg-card p-4">
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Input field and submit button */}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your data..."
                className="flex-1"
                disabled={isLoading}
              />
            </div>

            {/* Selected agents row */}
            <div className="flex items-center mt-3 gap-2">
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-10 ml-auto"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <AgentSelector />
        </div>
        {!showArtifact && currentArtifact?.length !== (0 || null) && (
          <Button
            className="absolute bottom-5 right-5 cursor-pointer"
            onClick={() => setShowArtifact(true)}
          >
            Show Artifact
          </Button>
        )}
      </div>
      {/* Artifact pane - only shown when there's an artifact */}
      {currentArtifact?.length && showArtifact ? (
        <Artifact
          artifacts={currentArtifact}
          onClose={() => {
            setShowArtifact(false);
          }}
        />
      ) : (
        ""
      )}
    </div>
  );
}

// Separate component for message bubbles
function MessageBubble({
  message,
  messagesLoading,
}: {
  message: Message;
  messagesLoading: boolean;
}) {
  return (
    <div
      className={`flex ${message.is_from_user ? "justify-end" : "justify-start"}`}
    >
      {messagesLoading ? (
        <Spinner />
      ) : (
        <Card
          className={`max-w-3xl p-4 ${message.is_from_user
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border"
            }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {message.is_from_user && <User className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.sql_query && (
                  <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto text-sm">
                    <code className="font-mono">{message.sql_query}</code>
                  </pre>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

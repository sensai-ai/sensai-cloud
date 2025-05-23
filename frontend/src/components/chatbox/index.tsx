import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOutletContext, useParams } from "react-router-dom";
import { getMessagesByConversationId } from "@/lib/services/messages";
import { Artifact, type ArtifactData } from "./Artifact";
import { getArtifactsByConversationId } from "@/lib/services/artifacts";

type Message = {
  id: string;
  content: string;
  is_from_user: boolean;
  created_at: Date;
  sql_query?: string;
};

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] =
    useState<Message | null>(null);
  const { conversationId } = useParams();
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData | null>(
    null,
  );

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
    setCurrentArtifact(artifactsData.artifacts[0]);
  };

    useEffect(() => {
    setMessages([])
    fetchData();
    
  }, [conversationId]);

  // Auto-scroll to bottom
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

    try {
      // Create a placeholder for the AI response
      const aiMessagePlaceholder: Message = {
        id: "",
        content: "",
        is_from_user: false,
        created_at: new Date(),
      };
      setCurrentStreamingMessage(aiMessagePlaceholder);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}messages/${conversationId}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: input }),
        },
      );

      if (!response.ok) throw new Error("Network response was not ok");
      if (!response.body) throw new Error("No response body");
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

            try {
              const parsed = JSON.parse(data);
              // Handle artifact data
              if (parsed.artifactId) {
                // You would fetch the full artifact data here
                const artifactData: ArtifactData = {
                  id: parsed.artifactId,
                  name: `Analysis: ${input.substring(0, 30)}...`,
                  description: "Generated from your query",
                  sql_query: parsed.sql_query || "",
                  columns: parsed.columns || [],
                  data_samples: parsed.data || [],
                  visualization_type: parsed.visualizationTypes || ["table"],
                  row_count: parsed.data?.length || 0,
                };
                setCurrentArtifact(artifactData);
              }

              aiMessageContent += parsed.content || "";

              setCurrentStreamingMessage({
                id: Date.now(),
                content: aiMessageContent,
                is_from_user: false,
                created_at: new Date(parsed.created_at),
                ...(parsed.sql_query && { sql_query: parsed.sql_query }),
              });
            } catch (err) {
              console.error("Error parsing chunk:", err);
            }
          }
        }
      }
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
      setIsLoading(false);
    }
  };

  // When streaming completes, add the message to the main list
  useEffect(() => {
    if (!isLoading && currentStreamingMessage) {
      setMessages((prev) => [...prev, currentStreamingMessage]);
      setCurrentStreamingMessage(null);
    }
  }, [isLoading, currentStreamingMessage]);

  return (
    <div className="flex flex-col h-screen bg-background dark:bg-black/60">
      {/* Main chat area with artifact sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div
          className={`flex-1 overflow-hidden p-4 ${currentArtifact ? "hidden md:block" : ""}`}
        >
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {messagesLoading && (
                <div className="space-y-4">
                  {Array.from({ length: 1 }).map((_, idx) => (
                    <div key={idx} className="flex justify-start">
                      <Card className="max-w-3xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-4 w-[180px]" />
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}{" "}
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {currentStreamingMessage && (
                <MessageBubble message={currentStreamingMessage} />
              )}
              {isLoading && !currentStreamingMessage && (
                <div className="flex justify-start">
                  <Card className="max-w-3xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[180px]" />
                      </div>
                    </div>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Artifact pane - only shown when there's an artifact */}
        {currentArtifact && (
          <div className="w-full md:w-1/2 lg:w-1/3 xl:w-1/3 border-l">
            <Artifact
              artifact={currentArtifact}
              onClose={() => setCurrentArtifact(null)}
            />
          </div>
        )}
      </div>
      {/* Input area */}
      <div className="border-t bg-card p-4">
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
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "1", name: "Data Analyst" },
                { id: "2", name: "SQL Expert" },
                { id: "3", name: "Visualization" },
              ].map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1 text-sm text-secondary-foreground"
                >
                  <span>{agent.name}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => console.log("Remove agent", agent.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-10 ml-auto"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Separate component for message bubbles
function MessageBubble({ message }: { message: Message }) {
  return (
    <div
      className={`flex ${message.is_from_user ? "justify-end" : "justify-start"}`}
    >
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
            {message.content === "" ? (
              <div className="flex justify-start">
                <Card className="max-w-3xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[180px]" />
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.sql_query && (
                  <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto text-sm">
                    <code className="font-mono">{message.sql_query}</code>
                  </pre>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {message.created_at.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

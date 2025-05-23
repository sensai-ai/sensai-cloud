import type { ChatHistoryItem } from "@/components/shared/Sidebar";
import { getConversationHistory } from "@/lib/services/conversation";
import { errorHandler } from "@/lib/utils";
import { useState } from "react";

export function useFetchChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fetchChatHistory = async () => {
    setIsLoading(true);
    const data = await errorHandler(
      getConversationHistory,
      "Failed to fetch conversation history.",
    );
    setIsLoading(false);
    setChatHistory(data);
  };

  return {
    chatHistory,
    setChatHistory,
    fetchChatHistory,
    isLoading
  }
}

import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Options {
  labelPrefix: string;
  mode?: string;
}

export const useChat = ({ labelPrefix, mode }: Options) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: question };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const body: { question: string; conversationHistory: ChatMessage[]; mode?: string } = { question, conversationHistory: messages };
      if (mode) body.mode = mode;
      const response = await ApiHelper.post("/docChat/ask", body, "AskApi");
      setMessages([...updatedMessages, { role: "assistant", content: response.answer || Locale.label(`${labelPrefix}.errorAnswer`) }]);
    } catch {
      setMessages([...updatedMessages, { role: "assistant", content: Locale.label(`${labelPrefix}.errorGeneric`) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return { messages, input, setInput, isLoading, handleSend, handleKeyDown, messagesEndRef };
};

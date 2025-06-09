import { ChatPage } from "@/components/chatbox";
import Layout from "@/components/shared/Layout";
import { Route, Routes } from "react-router-dom";

export default function MainRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path=":conversationId" element={<ChatPage />} />
<Route path="new-chat" element={<ChatPage isNewChat />} />
      </Route>
    </Routes>
  );
}

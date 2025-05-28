import { useEffect } from "react";
import Sidebar from "./Sidebar.tsx";
import { useNavigate } from "react-router-dom";
import { getLatestConversationId } from "@/lib/services/conversation.ts";



export default function Layout() {
  const navigate = useNavigate();

  const fetchLatestConvoId = async () => {
    const {conversationId} = await getLatestConversationId();
    navigate(conversationId);
}
  useEffect(() => {
    fetchLatestConvoId() 
})
  return (
    <div>
      <Sidebar />
    </div>
  );
}

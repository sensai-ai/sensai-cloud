import api from "./index";

export async function createConversation() {
  const res = await api.post("conversations",{initialTitle:"New Chat"});
  return res.data;
}

export async function getLatestConversationId() {
  const res = await api.get("conversations/latest-id");
  return res.data;
}

export async function getConversationById(id:string){
  const res = await api.get(`conversations/${id}`);
  return res.data
}

export async function getConversationHistory() {
  const res = await api.get("conversations");
  return res.data;
}

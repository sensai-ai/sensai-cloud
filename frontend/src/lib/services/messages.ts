import api from ".";


export async function getMessagesByConversationId(conversationId:string){
  const res = await api.get(`messages/${conversationId}`);
  console.log({res})
  return res.data
}

export async function sendPrompt(prompt:string,conversationId:string,metadata:any = {}){
  const res = await api.post(`messages/${conversationId}/send`,{prompt,metadata})
  return JSON.parse(res.data);
}

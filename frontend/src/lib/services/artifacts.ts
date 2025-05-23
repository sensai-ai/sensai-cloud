import api from ".";


export async function getArtifactsByConversationId(conversationId:string){
  const res = await api.get(`artifacts/${conversationId}`);
  console.log({res});
  return res.data;
}



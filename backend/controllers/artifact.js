import supabase from "../config/db.js";

export async function getConversationArtifacts(req, res) {
  const conversationId = req.params.conversationId;

  try {
    const { data, error } = await supabase
      .from("artifacts")
      .select("*", { count: "exact" })
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) throw error;

    const resData = {
      artifacts: data,
    };
    res.json(resData);
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
}

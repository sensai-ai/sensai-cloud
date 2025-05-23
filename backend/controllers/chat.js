import supabase from "../config/db.js";

async function createConversation(req, res) {
  const  initialTitle  = req.body.initialTitle || "New Chat";
  console.log({body:req.body})
  try {
    const { data, error } = await supabase
      .from("conversation_sessions")
      .insert([
        {
          title: initialTitle,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
}
async function getUserConversations(req, res) {
  // const userId = req.user.id;
  try {
    const { data, error } = await supabase
      .from("conversation_sessions")
      .select("*")
      // .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
}

async function updateConversation(req, res) {
  const { id } = req.params;
  // const userId = req.user.id;
  const updates = req.body;
  try {
    // Verify conversation belongs to user
    const { error: fetchError } = await supabase
      .from("conversation_sessions")
      .select("id")
      .eq("id", id)
      // .eq("user_id", userId)
      .single();

    if (fetchError) throw new Error("Conversation not found or access denied");

    const { data, error } = await supabase
      .from("conversation_sessions")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
}

async function deleteConversation(req, res) {
  const { id } = req.params;
  // const userId = req.user.id;
  try {
    // Verify conversation belongs to user
    const { error: fetchError } = await supabase
      .from("conversation_sessions")
      .select("id")
      .eq("id", id)
      // .eq("user_id", userId)
      .single();

    if (fetchError) throw new Error("Conversation not found or access denied");

    const { error } = await supabase
      .from("conversation_sessions")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
}

async function togglePinConversation(req, res) {
  const { id } = req.params;
  // const userId = req.user.id;
  const { pinState } = req.body;
  try {
    // Verify conversation belongs to user
    const { error: fetchError } = await supabase
      .from("conversation_sessions")
      .select("id")
      .eq("id", id)
      // .eq("user_id", userId)
      .single();

    if (fetchError) throw new Error("Conversation not found or access denied");

    const { data, error } = await supabase
      .from("conversation_sessions")
      .update({
        is_pinned: pinState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
}

async function getConversationById(req, res) {
  const { id } = req.params;
  // const userId = req.user.id;
  try {
    const { data, error } = await supabase
      .from("conversation_sessions")
      .select("*")
      .eq("id", id)
      // .eq("user_id", userId)
      .single();

    if (error) throw new Error(error.message);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
}

export {
  createConversation,
  getUserConversations,
  updateConversation,
  deleteConversation,
  togglePinConversation,
  getConversationById,
};

import supabase from "../config/db.js";
import { OpenAI } from "openai"; // Or your preferred AI service SDK

const openai = new OpenAI(process.env.OPENAI_API_KEY); // Initialize your AI service

export async function sendPromptToAi(req, res) {
  try {
    const { conversationId } = req.params;
    const { prompt, metadata = {} } = req.body;

    // 1. Save user message
    const { data: userMessage, error: userError } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          content: prompt,
          is_from_user: true,
          metadata,
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    // 2. Create placeholder for AI response
    const { data: aiMessage, error: aiError } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          content: "",
          is_from_user: false,
          metadata: {
            ...metadata,
            status: "streaming",
          },
        },
      ])
      .select()
      .single();

    if (aiError) throw aiError;

    // 3. Update conversation preview
    await supabase
      .from("conversation_sessions")
      .update({
        preview_text: truncatePreview(prompt),
        preview_sender: true,
        updated_at: new Date().toISOString(),
        message_count: supabase.rpc("increment", {
          table_name: "conversation_sessions",
          column_name: "message_count",
          id: conversationId,
          increment: 1,
        }),
      })
      .eq("id", conversationId);

    // 4. Set up streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Message-Id", aiMessage.id);

    // 5. Fetch database schema
    const schema = await fetchDatabaseSchema();
    const schemaContext = generateSchemaContext(schema);

    // 6. Generate SQL query from prompt
    const { query, queryExplanation, title } = await generateSQLFromPrompt(
      prompt,
      schemaContext,
    );
    await updateConversationTitle(conversationId, title);
    // 7. Execute the generated query
    let artifact;
    let formattedResults;
    if (query !== "") {
      const queryResult = await executeQuery(query);
      formattedResults = formatQueryResults(queryResult);

      // 8. Determine best visualization types
      // 9. Create artifact for this query with multiple visualizations
      const { data, error: artifactError } = await supabase
        .from("artifacts")
        .insert([
          {
            name: `Analysis: ${truncatePreview(prompt, 30)}`,
            description: queryExplanation,
            sql_query: query,
            visualization_type: ["bar"],
            conversation_id: conversationId,
            columns: formattedResults.columns,
            data_samples: formattedResults.sampleData,
            last_run_at: new Date().toISOString(),
            row_count: formattedResults.rowCount,
          },
        ])
        .select()
        .single();

      if (artifactError) throw artifactError;

      artifact = data;
      // First send the data results with visualization suggestions
      res.write(
        `data: ${JSON.stringify({
          artifactId: artifact.id,
          columns: formattedResults.columns,
          data: formattedResults.sampleData,
          visualizationTypes: ["table", "bar"], // Array of suggested visualization types
          sql_query: query,
        })}\n\n`,
      );
    }

    // 10. Generate natural language response
    const aiResponse = await generateAIResponse(
      prompt,
      query,
      formattedResults,
      conversationId
    );

    // 11. Stream the response to client
    let fullResponse = "";
    let chunkCount = 0;
    const updateInterval = 3;

    // Then stream the text response
    for (let i = 0; i < aiResponse.length; i += 20) {
      const chunk = aiResponse.substring(i, i + 20);
      fullResponse += chunk;
      chunkCount++;

      res.write(
        `data: ${JSON.stringify({ id: aiMessage.id, content: chunk, is_from_user: false, created_at: aiMessage.created_at })}\n\n`,
      );

      if (chunkCount % updateInterval === 0) {
        await updateAIMessage(
          aiMessage.id,
          fullResponse,
          chunkCount,
          {
            ...metadata,
            artifact_id: artifact?.id || undefined,
          },
          false,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate streaming
    }

    // Final update
    await updateAIMessage(
      aiMessage.id,
      fullResponse,
      chunkCount,
      {
        ...metadata,
        artifact_id: artifact?.id || undefined,
      },
      true,
    );
    res.end();
  } catch (error) {
    console.error("Error in message streaming:", error);

    if (res.getHeader("X-Message-Id")) {
      await supabase
        .from("messages")
        .update({
          metadata: {
            status: "error",
            error: error.message,
          },
        })
        .eq("id", res.getHeader("X-Message-Id"));
    }

    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
      );
      res.end();
    }
  }
}

// New helper functions for visualization determination
function determineVisualizations(columns) {
  const visualizations = ["table"]; // Always include table view

  // Check for potential chart types based on column types
  const numericColumns = columns.filter((col) =>
    ["integer", "number", "float", "decimal"].includes(col.type.toLowerCase()),
  );
  const dateColumns = columns.filter((col) =>
    ["date", "timestamp", "datetime"].includes(col.type.toLowerCase()),
  );
  const categoricalColumns = columns.filter((col) =>
    ["string", "text", "varchar"].includes(col.type.toLowerCase()),
  );

  // Add chart types based on data characteristics
  if (numericColumns.length >= 1 && categoricalColumns.length >= 1) {
    visualizations.push("bar", "line");
  }

  if (numericColumns.length >= 2) {
    visualizations.push("scatter");
  }

  if (numericColumns.length >= 1 && categoricalColumns.length >= 1) {
    visualizations.push("pie");
  }
  // Remove duplicates and return
  return [...new Set(visualizations)];
}

// Modified formatQueryResults to include type detection
function formatQueryResults(data) {
  if (!data || data.length === 0) {
    return {
      columns: [],
      sampleData: [],
      rowCount: 0,
    };
  }

  // Detect column types from first row
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  return {
    columns,
    sampleData: data,
    rowCount: data.length,
  };
}
// Helper functions
async function fetchDatabaseSchema() {
  const { data, error } = await supabase.rpc("get_db_schema");
  if (error) throw error;
  return data;
}

function generateSchemaContext(schema) {
  // Group columns by table_name
  const tableMap = {};

  for (const row of schema) {
    if (!tableMap[row.table_name]) {
      tableMap[row.table_name] = [];
    }
    tableMap[row.table_name].push(`${row.column_name}: ${row.data_type}`);
  }

  // Convert to schema context string
  return Object.entries(tableMap)
    .map(([tableName, columns]) => `Table ${tableName} (${columns.join(", ")})`)
    .join("\n");
}

async function generateSQLFromPrompt(prompt, schemaContext) {
  const systemPrompt = `
You are a SQL query generator. Given a user prompt and a database schema, you generate a SQL query and explain it. Also provide a title that can be displayed for this conversation. The query should return the same field name no matter the relations its querying from. Dont include the "id" field in the results. If you get a prompt like "Hello" or "How are you?" or anything prompt which is not related to querying or asking about something that could be stored in a database data then you must return the "query" field as an empty string.
Respond in this JSON format:
{
  "query": "...",
  "queryExplanation": "...",
  "title":"..."
}
`;

  const userMessage = `Prompt: ${prompt}\nSchema:\n${schemaContext}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4", // or "gpt-3.5-turbo"
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
  });

  try {
    const json = JSON.parse(response.choices[0].message.content);
    return json;
  } catch (e) {
    return {
      query: "",
      queryExplanation: "Could not parse the response from OpenAI",
    };
  }
}

async function executeQuery(query) {
  const cleanQuery = query.replace(/;\s*$/, "");
  const { data, error } = await supabase.rpc("execute_safe_query", {
    query_text: cleanQuery,
  });
  if (error) throw error;
  return data;
}

async function generateAIResponse(prompt, query, results, conversationId) {
  // In production, you would call an AI service here
  const systemPrompt =
    "You are an ai chatbot that reads what the user has found and provides a summary acting like you found it. Dont mention 'id' field. Also if you recieve 'No Query' in the start of the prompt just give a normal AI response";
  let userMessage;
  if (query !== "")
    userMessage =
      `I found ${results?.rowCount} results for "${prompt}". Here's what I discovered:\n\n` +
      `I used this SQL query: \`${query}\`\n\n` +
      `The results show ${results?.rowCount} records matching your request.` +
      `Here are the results: ${JSON.stringify(results?.sampleData)}`;
  else userMessage = `No Query. Prompt "${prompt}"`;

  // Get prev messages for context
  const { data: messagesFromDb, error } = await supabase
    .from("messages")
    .select("content,is_from_user")
    .eq("conversation_id", conversationId);
  console.log({ messagesFromDb });
  let parsedContext;
  if (messagesFromDb)
    parsedContext = messagesFromDb.map((msg) => ({
      role: msg.is_from_user ? "user" : "system",
      content: msg.content,
    }));

  const response = await openai.chat.completions.create({
    model: "gpt-4", // or "gpt-3.5-turbo"
    messages: [
      ...(parsedContext ? parsedContext : []),
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
  });
  console.log({ res: response.choices[0].message.content });
  return response.choices[0].message.content;
}

async function updateAIMessage(
  messageId,
  content,
  chunkCount,
  metadata,
  isComplete = false,
) {
  await supabase
    .from("messages")
    .update({
      content,
      metadata: {
        ...metadata,
        status: isComplete ? "completed" : "streaming",
        chunks_received: chunkCount,
        ...(isComplete && { completed_at: new Date().toISOString() }),
      },
    })
    .eq("id", messageId);
}

function updateConversationTitle(conversationId, content) {
  return supabase
    .from("conversation_sessions")
    .update({
      title: content,
      preview_sender: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}

function truncatePreview(text, length = 50) {
  return text.length > length ? `${text.substring(0, length - 3)}...` : text;
}

export async function getConversationMessages(req, res) {
  const conversationId = req.params.conversationId;

  const page = 1;
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  try {
    const { data, error, count } = await supabase
      .from("messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const resData = {
      messages: data,
      total: count,
      page,
      pageSize,
    };
    res.json(resData);
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
}

export async function updateMessage(messageId, updates) {
  const { data, error } = await supabase
    .from("messages")
    .update(updates)
    .eq("id", messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

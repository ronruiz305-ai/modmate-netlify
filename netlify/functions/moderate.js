exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { message } = JSON.parse(event.body);

    if (!message || message.trim().length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No message provided" }) };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: `You are an AI chat moderator for a live Twitch stream. Analyze the chat message and respond ONLY with valid JSON, no markdown:
{"safe": true/false, "reason": "brief reason if unsafe, else empty string", "action": "ban/timeout/warn/none"}
- ban: hate speech, severe threats, slurs
- timeout: spam, flooding, self-promotion, links
- warn: borderline content, mild violations
- none: message is perfectly fine`,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    const raw = data.content.map(b => b.text || "").join("");
    const clean = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong" })
    };
  }
};

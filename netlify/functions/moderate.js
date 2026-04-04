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
        max_tokens: 200,
        system: `You are an AI chat moderator for a live Twitch stream. Analyze the chat message and respond ONLY with valid JSON, no markdown, no extra text.

Always use this exact format:
{"safe": true or false, "reason": "always write a reason here even if safe", "action": "ban or timeout or warn or none"}

Rules:
- ban: hate speech, slurs, severe threats, extreme harassment
- timeout: spam, flooding, self-promotion, unsolicited links, mild harassment
- warn: borderline content, slightly rude language, mild violations
- none: message is completely fine and friendly

IMPORTANT: The "reason" field must NEVER be empty or null. Always write a short explanation like "Message is friendly and appropriate" for safe messages, or explain the violation for unsafe ones.`,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    const raw = data.content.map(b => b.text || "").join("");
    const clean = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    // Fallback — make sure reason is never undefined
    if (!result.reason || result.reason.trim() === "") {
      result.reason = result.safe
        ? "Message looks clean and appropriate."
        : "Violates community guidelines.";
    }

    // Make sure action is never undefined
    if (!result.action) {
      result.action = result.safe ? "none" : "warn";
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(result)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        safe: false,
        reason: "Could not connect to AI — please try again.",
        action: "none"
      })
    };
  }
};

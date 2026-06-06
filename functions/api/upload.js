// functions/api/upload.js
// POST /api/upload  (multipart/form-data)
//   fields: image (File), name, location, date

export async function onRequestPost({ request, env, ctx }) {

  const uid = request.headers.get("cf-access-authenticated-user-email") || "jeevan";
  
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file     = formData.get("image");
  const name     = (formData.get("name")     || "Unknown").trim();
  const location = (formData.get("location") || "Unknown").trim();
  const date     = formData.get("date")      || new Date().toISOString().split("T")[0];

  if (!file || typeof file === "string") {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  const id  = crypto.randomUUID();
  const ext = file.type === "image/png" ? "png" : "jpg";
  const key = `flowers/${id}.${ext}`;

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await env.R2_BUCKET.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type || "image/jpeg" }
  });

  const imageUrl = `${env.R2_PUBLIC_URL}/${key}`;

  // Save to D1
  await env.DB.prepare(
    `INSERT INTO flowers (id, name, location, date, image_url, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, location, date, imageUrl, uid).run();

  // Trigger AI tagging in background (non-blocking)
  const taggingPromise = tagFlower(id, imageUrl, env);
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(taggingPromise);
  } else {
    await taggingPromise;
  }
  return Response.json({
    id,
    imageUrl,
    name,
    location,
    date,
    message: "Uploaded! AI tagging in progress..."
  }, {
    headers: { "Access-Control-Allow-Origin": "*" }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

// ── AI tagging via Gemini 2.5 Flash-Lite ─────────────────────────────────────
async function tagFlower(id, imageUrl, env) {
  console.log("tagFlower started for:", id, imageUrl);
  try {
    console.log("Fetching image from R2...");
    const imgRes = await fetch(imageUrl);
    console.log("Image fetch status:", imgRes.status);
    const buffer = await imgRes.arrayBuffer();
    console.log("Buffer size:", buffer.byteLength);
    const bytes  = new Uint8Array(buffer);
    let binary   = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const body = {
      contents: [{
        parts: [
          { text: `Identify this flower. Reply ONLY with this exact JSON, no markdown:
{"name":"Malayalam common name if known, else English common name","species":"Latin/scientific name","category":"single-word","tags":["tag1","tag2","tag3"]}` },  
          { inline_data: { mime_type: "image/jpeg", data: base64 } }
        ]
      }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.1 }
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${env.GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    const raw  = await res.text();
    console.log("Gemini status:", res.status);
    console.log("Gemini response:", raw.slice(0, 300));

    if (!res.ok) return;

    const data   = JSON.parse(raw);
    const text   = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean  = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    await env.DB.prepare(
      `UPDATE flowers SET name=?, species=?, category=?, tags=? WHERE id=?`
    ).bind(
      parsed.name     || "Unknown flower",
      parsed.species  || "",
      parsed.category || parsed.tags?.[0] || "",
      JSON.stringify(parsed.tags || []),
      id
    ).run();

    console.log("Tagged successfully:", parsed.name);
  } catch (e) {
    console.error("AI tagging failed:", e.message);
  }
}

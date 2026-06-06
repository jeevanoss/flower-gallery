// functions/api/flowers/fav.js
export async function onRequestPost({ request, env }) {
  const uid = request.headers.get("cf-access-authenticated-user-email") || "jeevan";

  const { flower_id } = await request.json();

  const existing = await env.DB.prepare(
    "SELECT 1 FROM favorites WHERE user_id=? AND flower_id=?"
  ).bind(uid, flower_id).first();

  if (existing) {
    await env.DB.prepare(
      "DELETE FROM favorites WHERE user_id=? AND flower_id=?"
    ).bind(uid, flower_id).run();
    return Response.json({ saved: false }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } else {
    await env.DB.prepare(
      "INSERT INTO favorites (user_id, flower_id) VALUES (?,?)"
    ).bind(uid, flower_id).run();
    return Response.json({ saved: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
  }
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

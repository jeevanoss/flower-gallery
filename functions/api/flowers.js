// functions/api/flowers.js
// GET  /api/flowers        → list all flowers (with favorites for user)
// GET  /api/flowers?id=X   → single flower
// POST /api/flowers/fav    → toggle favorite

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id  = url.searchParams.get("id");
  const uid = request.headers.get("cf-access-authenticated-user-email") || "guest";

  if (id) {
    const row = await env.DB.prepare(
      "SELECT f.*, (SELECT 1 FROM favorites WHERE user_id=? AND flower_id=f.id) AS is_fav FROM flowers f WHERE f.id=?"
    ).bind(uid, id).first();
    return Response.json(row || {}, corsHeaders());
  }

  const { results } = await env.DB.prepare(
    `SELECT f.*,
      (SELECT 1 FROM favorites WHERE user_id=? AND flower_id=f.id) AS is_fav
     FROM flowers f
     ORDER BY f.date DESC`
  ).bind(uid).all();

  return Response.json(results, corsHeaders());
}

export async function onRequestPost({ request, env }) {
  const url  = new URL(request.url);
  const uid  = request.headers.get("cf-access-authenticated-user-email") || "guest";

  if (url.pathname.endsWith("/fav")) {
    const { flower_id } = await request.json();
    const existing = await env.DB.prepare(
      "SELECT 1 FROM favorites WHERE user_id=? AND flower_id=?"
    ).bind(uid, flower_id).first();

    if (existing) {
      await env.DB.prepare(
        "DELETE FROM favorites WHERE user_id=? AND flower_id=?"
      ).bind(uid, flower_id).run();
      return Response.json({ saved: false }, corsHeaders());
    } else {
      await env.DB.prepare(
        "INSERT INTO favorites (user_id, flower_id) VALUES (?,?)"
      ).bind(uid, flower_id).run();
      return Response.json({ saved: true }, corsHeaders());
    }
  }

  return new Response("Not found", { status: 404 });
}

function corsHeaders() {
  return {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  };
}

/** GET /api/docs/ui → Swagger UI (loads spec from /api/docs). */
export function GET() {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Woven Essence API</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css"></head>
<body><div id="swagger"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
<script>window.onload=()=>SwaggerUIBundle({url:'/api/docs',dom_id:'#swagger',withCredentials:true});</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

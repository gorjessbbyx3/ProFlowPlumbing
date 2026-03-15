export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Intercept /api/* routes — return proper JSON error instead of HTML
    if (url.pathname.startsWith("/api/")) {
      // CORS headers for frontend
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      // Handle preflight
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Health check endpoint
      if (url.pathname === "/api/healthz") {
        return Response.json({ status: "ok", message: "Frontend deployed. Backend API not yet connected." }, { headers: corsHeaders });
      }

      // Dashboard stats — return empty/zero defaults so the UI renders
      if (url.pathname === "/api/dashboard/stats") {
        return Response.json({
          todayBookings: 0,
          pendingInvoices: 0,
          totalRevenue: "0",
          activeEmployees: 0,
          pendingTodos: 0,
          recentBookings: [],
        }, { headers: corsHeaders });
      }

      // All other /api/* routes — return empty array (most list endpoints expect arrays)
      return Response.json([], { headers: corsHeaders });
    }

    // Everything else — serve static assets via the asset binding
    return env.ASSETS.fetch(request);
  },
};

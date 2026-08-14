// Supabase Edge Function: send-email
// Resend API üzerinden sunucu tarafında CORS engelsiz e-posta gönderimi sağlar.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

serve(async (req: Request) => {
  // CORS Preflight istekleri için OPTIONS yanıtı
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Kimlik Doğrulama (JWT/Auth Kontrolü)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header.", debug: "No auth header found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseKey, { 
      global: { headers: { Authorization: authHeader } } 
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("[send-email Edge Function] Auth Error:", authError);
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized request.", 
          debug: {
            authError: authError ? authError.message : "No user found",
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey
          }
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Resend API Kontrolü ve İstek İşleme
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY secret is not set in Supabase Edge Functions." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: EmailPayload = await req.json();
    const { to, subject, html, from = "Codentra CRM <davet@codentra.com.tr>" } = payload;

    const recipients = Array.isArray(to) ? to : [to];

    // Resend REST API'ye sunucu tarafında istek atma (CORS engeli yok)
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: from,
        to: recipients,
        subject: subject,
        html: html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-email Edge Function] Resend API Error:", resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData }),
        { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, provider: "resend-edge", data: resendData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-email Edge Function] Unexpected Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

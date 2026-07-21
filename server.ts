import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Initialize Supabase client dynamically per request to prevent serverless container schema caching
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    return createClient(url, key, {
      auth: { persistSession: false }
    });
  }
  return null;
}

// In-memory fallback database state
let inMemoryPadelData = {
  events: [] as any[],
  activeEventId: null as string | null
};

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for AI features. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
    });
  }
  return aiClient;
}

const app = express();

// Disable HTTP caching for API endpoints to prevent 304 Not Modified browser cache
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Set higher body limits to allow base64 screenshot uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // Check Supabase DB status & health
  app.get("/api/db-status", async (req, res) => {
    try {
      const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const supabase = getSupabase();

      if (!url || !key) {
        return res.json({
          connected: false,
          storage: "in-memory-fallback",
          reason: "SUPABASE_URL or SUPABASE_KEY/SUPABASE_SECRET_KEY environment variable is not configured on the server.",
          hint: "Add SUPABASE_URL and SUPABASE_KEY to Environment Variables in your server/Vercel settings."
        });
      }

      if (!supabase) {
        return res.json({
          connected: false,
          storage: "in-memory-fallback",
          reason: "Failed to initialize Supabase client."
        });
      }

      const { data, error } = await supabase
        .from("padel_data")
        .select("id, updated_at, data")
        .eq("id", "active_state")
        .maybeSingle();

      const urlHost = url ? new URL(url).hostname : null;

      if (error) {
        return res.json({
          connected: false,
          storage: "in-memory-fallback",
          urlHost,
          reason: `Supabase database error: ${error.message} (Code: ${error.code})`,
          hint: "Ensure table 'padel_data' exists with schema: CREATE TABLE padel_data (id text primary key, data jsonb, updated_at timestamptz) and RLS is disabled."
        });
      }

      return res.json({
        connected: true,
        storage: "supabase",
        urlHost,
        hasState: !!data,
        updatedAt: data?.updated_at || null,
        eventsCount: data?.data?.events?.length || 0
      });
    } catch (err: any) {
      return res.json({
        connected: false,
        storage: "in-memory-fallback",
        reason: err?.message || "Failed to query Supabase database."
      });
    }
  });

  // Get Padel Scheduler state (events and activeEventId)
  app.get("/api/events", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        console.log("[Supabase] Fetching padel data...");
        const { data, error } = await supabase
          .from("padel_data")
          .select("data")
          .eq("id", "active_state")
          .maybeSingle();

        if (error) {
          console.warn("[Supabase] Query error (falling back to memory):", error.message);
          return res.json(inMemoryPadelData);
        }

        if (data && data.data) {
          // Keep inMemoryPadelData synced
          inMemoryPadelData = data.data;
          return res.json(data.data);
        } else {
          console.log("[Supabase] No data found in table, returning memory state.");
          return res.json(inMemoryPadelData);
        }
      } else {
        // Fallback to in-memory storage
        console.log("[Memory Fallback] Fetching in-memory padel data...");
        return res.json(inMemoryPadelData);
      }
    } catch (err: any) {
      console.error("Failed to get events:", err);
      return res.json(inMemoryPadelData);
    }
  });

  // Save Padel Scheduler state (events and activeEventId)
  app.post("/api/events", async (req, res) => {
    try {
      const { events, activeEventId, allowEmpty } = req.body;
      if (!Array.isArray(events)) {
        return res.status(400).json({ error: "Invalid payload: events must be an array." });
      }

      // Always update inMemoryPadelData first so server memory stays current
      if (events.length > 0 || allowEmpty || inMemoryPadelData.events.length === 0) {
        inMemoryPadelData = { events, activeEventId };
      }

      const supabase = getSupabase();
      
      if (supabase) {
        // Safety protection: Do not overwrite non-empty DB data with an empty array unless allowEmpty is true
        if (events.length === 0 && !allowEmpty) {
          const { data: existing } = await supabase
            .from("padel_data")
            .select("data")
            .eq("id", "active_state")
            .maybeSingle();

          if (existing?.data?.events && existing.data.events.length > 0) {
            console.warn("[Supabase Protection] Ignored empty save request to prevent overwriting existing data.");
            return res.json({ success: true, protected: true, existingCount: existing.data.events.length });
          }
        }

        console.log(`[Supabase] Saving padel data (${events.length} events)...`);
        const { error } = await supabase
          .from("padel_data")
          .upsert({
            id: "active_state",
            data: { events, activeEventId },
            updated_at: new Date()
          });

        if (error) {
          console.warn("[Supabase] Save error (saved in memory fallback):", error.message);
          return res.json({ success: true, warning: error.message });
        }
        console.log("[Supabase] Save successful.");
        return res.json({ success: true });
      } else {
        console.log(`[Memory Fallback] Saved to in-memory padel data (${events.length} events)...`);
        return res.json({ success: true });
      }
    } catch (err: any) {
      console.error("Failed to save events:", err);
      return res.json({ success: true, warning: err?.message });
    }
  });

  // ============================================================
  // COTTA FINANCE API ROUTES
  // ============================================================

  /** Helper: generate a short unique ID */
  function genId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  /** Helper: write an audit log entry (best-effort, non-blocking) */
  async function writeAuditLog(
    supabase: any,
    tableName: string,
    recordId: string,
    action: string,
    oldData: any,
    newData: any
  ) {
    try {
      await supabase.from("finance_audit_log").insert({
        id: genId("aud"),
        table_name: tableName,
        record_id: recordId,
        action,
        old_data: oldData || null,
        new_data: newData || null,
        performed_by: "admin",
        performed_at: new Date().toISOString(),
      });
    } catch (e) {
      // non-blocking
    }
  }

  // ----------------------------------------------------------
  // GET /api/finance/events — List all finance events
  // ----------------------------------------------------------
  app.get("/api/finance/events", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.json({ events: [] });

      const { data, error } = await supabase
        .from("finance_events")
        .select("*")
        .order("session_date", { ascending: false });

      if (error) {
        console.warn("[Finance] Error fetching events:", error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ events: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // POST /api/finance/events — Create a new finance event
  // ----------------------------------------------------------
  app.post("/api/finance/events", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { event_id, event_name, session_date, court_fee, additional_fee, tax_type, tax_value, discount, notes } = req.body;
      if (!event_id || !event_name) {
        return res.status(400).json({ error: "event_id and event_name are required" });
      }

      const subtotal = (parseFloat(court_fee) || 0) + (parseFloat(additional_fee) || 0);
      const taxAmount = tax_type === "percentage"
        ? subtotal * ((parseFloat(tax_value) || 0) / 100)
        : (parseFloat(tax_value) || 0);
      const finalTotal = subtotal + taxAmount - (parseFloat(discount) || 0);

      const id = genId("fe");
      const record = {
        id,
        event_id,
        event_name,
        session_date: session_date || new Date().toISOString().split("T")[0],
        court_fee: parseFloat(court_fee) || 0,
        additional_fee: parseFloat(additional_fee) || 0,
        tax_type: tax_type || "percentage",
        tax_value: parseFloat(tax_value) || 0,
        discount: parseFloat(discount) || 0,
        final_total: Math.max(0, finalTotal),
        notes: notes || null,
        status: "draft",
        created_by: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("finance_events").insert(record);
      if (error) return res.status(500).json({ error: error.message });

      await writeAuditLog(supabase, "finance_events", id, "create", null, record);
      return res.json({ success: true, id });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/finance/events/:id — Get single finance event
  // ----------------------------------------------------------
  app.get("/api/finance/events/:id", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { data, error } = await supabase
        .from("finance_events")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: "Finance event not found" });
      return res.json({ event: data });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // PUT /api/finance/events/:id — Update finance event
  // ----------------------------------------------------------
  app.put("/api/finance/events/:id", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { court_fee, additional_fee, tax_type, tax_value, discount, notes, status, event_name, session_date } = req.body;

      // Fetch old record for audit
      const { data: oldRecord } = await supabase
        .from("finance_events")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

      const subtotal = (parseFloat(court_fee) || 0) + (parseFloat(additional_fee) || 0);
      const taxAmount = tax_type === "percentage"
        ? subtotal * ((parseFloat(tax_value) || 0) / 100)
        : (parseFloat(tax_value) || 0);
      const finalTotal = subtotal + taxAmount - (parseFloat(discount) || 0);

      const updates: any = {
        court_fee: parseFloat(court_fee) || 0,
        additional_fee: parseFloat(additional_fee) || 0,
        tax_type: tax_type || "percentage",
        tax_value: parseFloat(tax_value) || 0,
        discount: parseFloat(discount) || 0,
        final_total: Math.max(0, finalTotal),
        notes: notes ?? oldRecord?.notes,
        updated_at: new Date().toISOString(),
      };
      if (status) updates.status = status;
      if (event_name) updates.event_name = event_name;
      if (session_date) updates.session_date = session_date;

      const { error } = await supabase.from("finance_events").update(updates).eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });

      await writeAuditLog(supabase, "finance_events", req.params.id, "update", oldRecord, updates);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // DELETE /api/finance/events/:id — Delete finance event
  // ----------------------------------------------------------
  app.delete("/api/finance/events/:id", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { data: oldRecord } = await supabase
        .from("finance_events")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

      const { error } = await supabase.from("finance_events").delete().eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });

      await writeAuditLog(supabase, "finance_events", req.params.id, "delete", oldRecord, null);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/finance/events/:id/participants — Get participants
  // ----------------------------------------------------------
  app.get("/api/finance/events/:id/participants", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.json({ participants: [] });

      const { data, error } = await supabase
        .from("finance_participants")
        .select("*")
        .eq("finance_event_id", req.params.id)
        .order("player_name");

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ participants: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // POST /api/finance/events/:id/participants — Bulk upsert participants
  // ----------------------------------------------------------
  app.post("/api/finance/events/:id/participants", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { participants } = req.body;
      if (!Array.isArray(participants)) {
        return res.status(400).json({ error: "participants must be an array" });
      }

      // Delete all existing participants for this event then re-insert
      await supabase.from("finance_participants").delete().eq("finance_event_id", req.params.id);

      if (participants.length > 0) {
        const records = participants.map((p: any) => ({
          id: p.id || genId("fp"),
          finance_event_id: req.params.id,
          player_id: p.player_id,
          player_name: p.player_name,
          attendance_status: p.attendance_status || "hadir",
          split_type: p.split_type || "equal",
          custom_amount: parseFloat(p.custom_amount) || 0,
          final_charge: parseFloat(p.final_charge) || 0,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from("finance_participants").insert(records);
        if (error) return res.status(500).json({ error: error.message });
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/finance/payments?event_id=xxx — Get payments
  // ----------------------------------------------------------
  app.get("/api/finance/payments", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.json({ payments: [] });

      let query = supabase
        .from("finance_payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (req.query.event_id) {
        query = query.eq("finance_event_id", req.query.event_id as string);
      }
      if (req.query.player_id) {
        query = query.eq("player_id", req.query.player_id as string);
      }

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ payments: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // POST /api/finance/payments — Record a payment
  // ----------------------------------------------------------
  app.post("/api/finance/payments", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { finance_event_id, player_id, player_name, amount, payment_date, payment_method, notes, proof_url } = req.body;
      if (!finance_event_id || !player_id || !amount) {
        return res.status(400).json({ error: "finance_event_id, player_id, and amount are required" });
      }

      const id = genId("pay");
      const record = {
        id,
        finance_event_id,
        player_id,
        player_name,
        amount: parseFloat(amount),
        payment_date: payment_date || new Date().toISOString().split("T")[0],
        payment_method: payment_method || "transfer",
        notes: notes || null,
        proof_url: proof_url || null,
        recorded_by: "admin",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("finance_payments").insert(record);
      if (error) return res.status(500).json({ error: error.message });

      // Auto-create corresponding cash transaction income entry
      await supabase.from("finance_cash_transactions").insert({
        id: genId("cash"),
        transaction_date: record.payment_date,
        type: "income",
        category: "member_payment",
        description: `Pembayaran dari ${player_name}`,
        amount: parseFloat(amount),
        finance_event_id,
        reference_id: id,
        recorded_by: "admin",
        created_at: new Date().toISOString(),
      });

      await writeAuditLog(supabase, "finance_payments", id, "create", null, record);
      return res.json({ success: true, id });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // DELETE /api/finance/payments/:id — Delete a payment
  // ----------------------------------------------------------
  app.delete("/api/finance/payments/:id", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { data: oldRecord } = await supabase
        .from("finance_payments")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

      const { error } = await supabase.from("finance_payments").delete().eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });

      // Remove corresponding auto-generated cash transaction
      if (oldRecord) {
        await supabase.from("finance_cash_transactions").delete().eq("reference_id", req.params.id);
      }

      await writeAuditLog(supabase, "finance_payments", req.params.id, "delete", oldRecord, null);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/finance/cash — Get cash transactions
  // ----------------------------------------------------------
  app.get("/api/finance/cash", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.json({ transactions: [] });

      let query = supabase
        .from("finance_cash_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (req.query.type) query = query.eq("type", req.query.type as string);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ transactions: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // POST /api/finance/cash — Add manual cash transaction
  // ----------------------------------------------------------
  app.post("/api/finance/cash", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { transaction_date, type, category, description, amount, finance_event_id } = req.body;
      if (!type || !category || !description || !amount) {
        return res.status(400).json({ error: "type, category, description, amount are required" });
      }

      const id = genId("cash");
      const record = {
        id,
        transaction_date: transaction_date || new Date().toISOString().split("T")[0],
        type,
        category,
        description,
        amount: parseFloat(amount),
        finance_event_id: finance_event_id || null,
        reference_id: null,
        recorded_by: "admin",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("finance_cash_transactions").insert(record);
      if (error) return res.status(500).json({ error: error.message });

      await writeAuditLog(supabase, "finance_cash_transactions", id, "create", null, record);
      return res.json({ success: true, id });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // DELETE /api/finance/cash/:id — Delete cash transaction
  // ----------------------------------------------------------
  app.delete("/api/finance/cash/:id", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { data: oldRecord } = await supabase
        .from("finance_cash_transactions")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

      const { error } = await supabase.from("finance_cash_transactions").delete().eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });

      await writeAuditLog(supabase, "finance_cash_transactions", req.params.id, "delete", oldRecord, null);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/finance/balance — All members balance summary
  // ----------------------------------------------------------
  app.get("/api/finance/balance", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.json({ balances: [] });

      const { data: participants } = await supabase
        .from("finance_participants")
        .select("player_id, player_name, final_charge, attendance_status");

      const { data: payments } = await supabase
        .from("finance_payments")
        .select("player_id, player_name, amount");

      const balanceMap: Record<string, any> = {};

      (participants || []).forEach((p: any) => {
        if (p.attendance_status !== "hadir") return;
        if (!balanceMap[p.player_id]) {
          balanceMap[p.player_id] = { player_id: p.player_id, player_name: p.player_name, total_sessions: 0, total_charged: 0, total_paid: 0 };
        }
        balanceMap[p.player_id].total_sessions += 1;
        balanceMap[p.player_id].total_charged += parseFloat(p.final_charge) || 0;
      });

      (payments || []).forEach((pay: any) => {
        if (!balanceMap[pay.player_id]) {
          balanceMap[pay.player_id] = { player_id: pay.player_id, player_name: pay.player_name, total_sessions: 0, total_charged: 0, total_paid: 0 };
        }
        balanceMap[pay.player_id].total_paid += parseFloat(pay.amount) || 0;
      });

      const balances = Object.values(balanceMap).map((b: any) => ({
        ...b,
        outstanding: Math.max(0, b.total_charged - b.total_paid),
        credit: Math.max(0, b.total_paid - b.total_charged),
      }));

      return res.json({ balances });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/finance/dashboard — Dashboard summary
  // ----------------------------------------------------------
  app.get("/api/finance/dashboard", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.json({ summary: {} });

      const [eventsRes, cashRes, participantsRes, paymentsRes] = await Promise.all([
        supabase.from("finance_events").select("id, final_total, status"),
        supabase.from("finance_cash_transactions").select("type, amount, transaction_date"),
        supabase.from("finance_participants").select("player_id, player_name, final_charge, attendance_status"),
        supabase.from("finance_payments").select("player_id, player_name, amount, payment_date"),
      ]);

      const events = eventsRes.data || [];
      const cashTx = cashRes.data || [];
      const participants = participantsRes.data || [];
      const payments = paymentsRes.data || [];

      const totalIncome = cashTx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + parseFloat(t.amount), 0);
      const totalExpense = cashTx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + parseFloat(t.amount), 0);

      // Outstanding per player
      const chargeMap: Record<string, number> = {};
      const paidMap: Record<string, number> = {};
      participants.forEach((p: any) => {
        if (p.attendance_status === "hadir") {
          chargeMap[p.player_id] = (chargeMap[p.player_id] || 0) + parseFloat(p.final_charge || 0);
        }
      });
      payments.forEach((pay: any) => {
        paidMap[pay.player_id] = (paidMap[pay.player_id] || 0) + parseFloat(pay.amount || 0);
      });
      const totalOutstanding = Object.keys(chargeMap).reduce((sum, pid) => {
        return sum + Math.max(0, (chargeMap[pid] || 0) - (paidMap[pid] || 0));
      }, 0);

      // Monthly data (last 6 months)
      const monthlyMap: Record<string, { income: number; expense: number }> = {};
      cashTx.forEach((t: any) => {
        const month = t.transaction_date?.substring(0, 7) || "unknown";
        if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
        if (t.type === "income") monthlyMap[month].income += parseFloat(t.amount);
        else monthlyMap[month].expense += parseFloat(t.amount);
      });
      const monthlyData = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({ month, ...data }));

      // Top payers
      const playerPaidMap: Record<string, { player_name: string; total_paid: number; sessions: number }> = {};
      payments.forEach((pay: any) => {
        if (!playerPaidMap[pay.player_id]) {
          playerPaidMap[pay.player_id] = { player_name: pay.player_name, total_paid: 0, sessions: 0 };
        }
        playerPaidMap[pay.player_id].total_paid += parseFloat(pay.amount);
        playerPaidMap[pay.player_id].sessions += 1;
      });
      const topPayers = Object.values(playerPaidMap)
        .sort((a, b) => b.total_paid - a.total_paid)
        .slice(0, 10);

      return res.json({
        summary: {
          total_cash: totalIncome - totalExpense,
          total_income: totalIncome,
          total_expense: totalExpense,
          total_outstanding: totalOutstanding,
          total_events: events.length,
          total_revenue: events.reduce((s: number, e: any) => s + parseFloat(e.final_total || 0), 0),
          monthly_data: monthlyData,
          top_payers: topPayers,
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/finance/reports — Reports with filters
  // ----------------------------------------------------------
  app.get("/api/finance/reports", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.json({ report: {} });

      const { from_date, to_date, event_id, player_id } = req.query;

      let eventsQuery = supabase.from("finance_events").select("*").order("session_date", { ascending: false });
      let paymentsQuery = supabase.from("finance_payments").select("*").order("payment_date", { ascending: false });
      let cashQuery = supabase.from("finance_cash_transactions").select("*").order("transaction_date", { ascending: false });

      if (from_date) {
        eventsQuery = eventsQuery.gte("session_date", from_date as string);
        paymentsQuery = paymentsQuery.gte("payment_date", from_date as string);
        cashQuery = cashQuery.gte("transaction_date", from_date as string);
      }
      if (to_date) {
        eventsQuery = eventsQuery.lte("session_date", to_date as string);
        paymentsQuery = paymentsQuery.lte("payment_date", to_date as string);
        cashQuery = cashQuery.lte("transaction_date", to_date as string);
      }
      if (event_id) eventsQuery = eventsQuery.eq("id", event_id as string);
      if (player_id) paymentsQuery = paymentsQuery.eq("player_id", player_id as string);

      const [eventsRes, paymentsRes, cashRes] = await Promise.all([eventsQuery, paymentsQuery, cashQuery]);

      return res.json({
        report: {
          events: eventsRes.data || [],
          payments: paymentsRes.data || [],
          cash_transactions: cashRes.data || [],
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // ============================================================
  // END COTTA FINANCE ROUTES
  // ============================================================

  // Server-side AI Extraction API endpoint with multi-model fallback resiliency
  app.post("/api/extract-players", async (req, res) => {

    try {
      const { base64Data, mimeType } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Missing image base64Data parameter." });
      }

      const client = getGemini();

      // Use the best available high-speed model with a generous timeout to ensure reliability
      const candidateModels = ["gemini-3.5-flash"];
      let lastError: any = null;
      let textResponse: string | null = null;

      for (const modelName of candidateModels) {
        try {
          console.log(`[AI Extraction] Attempting player extraction with model: ${modelName}`);
          
          const imagePart = {
            inlineData: {
              data: base64Data,
              mimeType: mimeType || "image/png"
            }
          };

          const textPart = {
            text: `Analyze this image, which is a screenshot of the Reclub mobile app sports participants list.

CRITICAL EXTRACTION RULES:
1. Find the header indicating the count of confirmed participants (e.g., "Dikonfirmasi • 12" or "Confirmed • 12" or "Going • 12"). This count represents the exact number of active players we want to extract.
2. Extract the exact count number as "confirmed_count". For example, if it says "Dikonfirmasi • 12", confirmed_count should be 12.
3. Directly under that header, you will see a grid of circular player avatar bubbles. Directly beneath each avatar bubble is the display name of that player (written in blue/dark blue text, e.g., 'Irfan Pribadi', 'IBRA', 'Haickal', 'Fio', 'w. Adi', 'Mas Rizal', 'Bes', 'Ipank rafa', 'Fajar', 'JayR', 'Adi', 'Aziz').
4. Extract ONLY these exact names that correspond to the active/confirmed player avatars in the grid.
5. DO NOT extract names from any other sections (like waitlist, maybe, organizers, or past matches) if they exist.
6. DO NOT invent, guess, or hallucinate names. The list must match the visual count (e.g., if the header says 12, there should be exactly 12 players extracted).
7. For each player, determine or guess their gender (use "Laki-laki" for male or "Perempuan" for female). If the name is ambiguous, default to "Laki-laki".`
          };

          // Wrap the AI model call with a strict 4-second timeout to guarantee we don't hit Vercel's 10-second limit
          const aiCallPromise = client.models.generateContent({
            model: modelName,
            contents: { parts: [imagePart, textPart] },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  confirmed_count: { type: Type.INTEGER, description: "The exact number from the header, e.g., 12" },
                  players: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        gender: { type: Type.STRING, description: "Must be 'Laki-laki' or 'Perempuan'" }
                      },
                      required: ["name", "gender"]
                    }
                  }
                },
                required: ["confirmed_count", "players"]
              }
            }
          });

          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`AI Model call timed out for ${modelName} after 8 seconds`)), 8000)
          );

          const apiResponse = await Promise.race([aiCallPromise, timeoutPromise]);

          if (apiResponse && apiResponse.text) {
            textResponse = apiResponse.text;
            console.log(`[AI Extraction] Extraction Succeeded using model: ${modelName}`);
            console.log(`[AI Extraction] Raw JSON Response:\n${textResponse}`);
            break; // Succeeded! Exit the loop.
          }
        } catch (err: any) {
          console.warn(`[AI Extraction] Model ${modelName} encountered an error:`, err?.message || err);
          lastError = err;
          // Continue loop to try next fallback model
        }
      }

      if (!textResponse) {
        throw new Error(lastError?.message || "Semua model AI sedang sibuk. Silakan coba beberapa saat lagi.");
      }

      // Parse and apply strict filters (confirmed_count slice, duplicate removal) on server-side
      const parsed = JSON.parse(textResponse);
      const rawPlayers = parsed.players || [];
      const confirmedCount = parsed.confirmed_count || rawPlayers.length;

      const seen = new Set<string>();
      const uniquePlayers: any[] = [];
      for (const p of rawPlayers) {
        if (!p.name) continue;
        const norm = p.name.trim().toLowerCase();
        if (!seen.has(norm)) {
          seen.add(norm);
          uniquePlayers.push({
            name: p.name.trim(),
            gender: p.gender === "Perempuan" ? "Perempuan" : "Laki-laki"
          });
        }
      }

      let finalPlayers = uniquePlayers;
      if (finalPlayers.length > confirmedCount) {
        console.log(`[AI Extraction] Slicing players from ${finalPlayers.length} to ${confirmedCount} based on confirmed_count`);
        finalPlayers = finalPlayers.slice(0, confirmedCount);
      }

      res.setHeader("Content-Type", "application/json");
      res.json({ players: finalPlayers });
    } catch (err: any) {
      console.error("AI player extraction completely failed:", err);
      res.status(500).json({ error: err?.message || "Gagal mengekstrak nama pemain karena lalu lintas server padat. Silakan coba kembali." });
    }
  });

  // HTML entity decoder helper for script tags
  function decodeHTMLEntities(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  // Heuristic parser helper if Nuxt state is missing or the page format is modified/copied as text
  function tryExtractPlayersHeuristically(input: string) {
    const playersList: { id: string; username: string; name: string; gender: string; skillLevel: string }[] = [];
    
    // Strip HTML tags to extract clean text lines
    const cleanText = input.replace(/<[^>]+>/g, '\n');
    const lines = cleanText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
      
    const blacklist = new Set([
      'reclub', 'reclub.co', 'confirmed', 'going', 'participants', 'join', 'leave', 'invite',
      'intermediate', 'advanced', 'beginner', 'laki-laki', 'perempuan', 'male', 'female',
      'game', 'match', 'sport', 'tennis', 'badminton', 'racket', 'home', 'profile', 'settings',
      'search', 'notifications', 'chat', 'feed', 'map', 'explore', 'create', 'event', 'events',
      'upcoming', 'past', 'members', 'atlet', 'pemain', 'rincian', 'permainan', 'detail',
      'batal', 'daftar', 'simpan', 'tambah', 'hapus', 'edit', 'logout', 'login', 'sign up',
      'sign in', 'indonesia', 'jakarta', 'bandung', 'surabaya', 'medan', 'angkatan', 'keluar',
      'masuk', 'unduh', 'upload', 'unggah', 'berkas', 'file', 'template', 'kembali', 'selanjutnya',
      'sebelumnya', 'halaman', 'bantuan', 'kontak', 'tentang', 'kebijakan', 'privasi', 'syarat',
      'ketentuan', 'hubungi', 'kami', 'hak', 'cipta', 'terpelihara', 'semua', 'populer', 'baru'
    ]);

    const seenNames = new Set<string>();
    
    // State to trace sections so we stop extracting once we leave the "Confirmed"/"Going" section
    // and enter sections like "Waitlist", "Interested", "Invited", or "Past Matches"
    let currentSection = 'confirmed';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      
      // Section boundary detection:
      // If we see waitlist, interested, maybe, cancelled, or invited, stop extraction of confirmed/going players.
      if (
        lower.includes('daftar tunggu') || 
        lower.includes('waitlist') || 
        lower.includes('interested') || 
        lower.includes('maybe') || 
        lower.includes('mungkin') || 
        lower.includes('tidak hadir') || 
        lower.includes('not going') || 
        lower.includes('undangan') || 
        lower.includes('invited') || 
        lower.includes('belum respon') ||
        lower.includes('batal') ||
        lower.includes('declined')
      ) {
        currentSection = 'skipped';
        console.log(`[Reclub Import] Heuristics: Hit stop section text "${line}". Skipping subsequent players.`);
        continue;
      }
      
      if (currentSection === 'skipped') {
        continue;
      }

      // Ignore short lines, long lines, or numeric only
      if (line.length < 2 || line.length > 40) continue;
      if (/^[0-9\s\.\,\-\#\:\/\(\)]+$/.test(line)) continue;
      
      if (blacklist.has(lower)) continue;
      if (lower.includes('reclub') || lower.includes('http') || lower.includes('.com') || lower.includes('.co')) continue;
      if (['confirmed', 'going', 'maybe', 'not going', 'waitlist', 'organizer', 'host', 'admin', 'moderator'].includes(lower)) continue;
      
      let cleanedName = line.replace(/^\d+[\.\-\s)]+/, '').trim();
      cleanedName = cleanedName.replace(/\(Confirmed\)/i, '').trim();
      cleanedName = cleanedName.replace(/\(Going\)/i, '').trim();
      cleanedName = cleanedName.replace(/\(Organizer\)/i, '').trim();
      cleanedName = cleanedName.replace(/\(Host\)/i, '').trim();
      cleanedName = cleanedName.replace(/[^a-zA-Z0-9\s\.\-\'\(\)]/g, '').trim();
      
      if (cleanedName.length < 2 || cleanedName.length > 40) continue;
      if (blacklist.has(cleanedName.toLowerCase())) continue;
      
      let gender = 'Laki-laki';
      let skillLevel = 'Intermediate';
      
      // Search adjacent lines for gender or skill cues
      for (let j = 1; j <= 4; j++) {
        if (i + j < lines.length) {
          const nextLine = lines[i + j].toLowerCase();
          if (nextLine.includes('perempuan') || nextLine.includes('female') || nextLine.includes('wanita') || nextLine === 'f' || nextLine === 'p') {
            gender = 'Perempuan';
          } else if (nextLine.includes('laki') || nextLine.includes('male') || nextLine.includes('pria') || nextLine === 'm' || nextLine === 'l') {
            gender = 'Laki-laki';
          }
          
          if (nextLine.includes('beginner') || nextLine.includes('pemula')) {
            skillLevel = 'Beginner';
          } else if (nextLine.includes('intermediate') || nextLine.includes('menengah')) {
            skillLevel = 'Intermediate';
          } else if (nextLine.includes('advanced') || nextLine.includes('mahir')) {
            skillLevel = 'Advanced';
          }
        }
      }
      
      const norm = cleanedName.toLowerCase();
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        playersList.push({
          id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          username: cleanedName.toLowerCase().replace(/\s+/g, '_'),
          name: cleanedName,
          gender,
          skillLevel
        });
      }
    }
    return playersList;
  }

  // Server-side Reclub scrap-and-import API endpoint
  app.post("/api/import-reclub", async (req, res) => {
    try {
      const { url, rawHtml } = req.body;
      let html = "";
      let urlSlug = "";

      if (rawHtml) {
        html = rawHtml;
        console.log(`[Reclub Import] Parsing via raw HTML source payload (${rawHtml.length} chars)`);
      } else {
        if (!url) {
          return res.status(400).json({ error: "Masukkan link URL Reclub terlebih dahulu." });
        }

        let targetUrl = url.trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = 'https://' + targetUrl;
        }

        const lowerUrl = targetUrl.toLowerCase();
        if (!lowerUrl.includes("reclub.co")) {
          return res.status(400).json({ error: "URL harus berasal dari reclub.co" });
        }

        try {
          const parsedUrl = new URL(targetUrl);
          const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            urlSlug = pathParts[pathParts.length - 1].toLowerCase().trim();
            console.log(`[Reclub Import] Parsed urlSlug from target URL: ${urlSlug}`);
          }
        } catch (e) {}

        console.log(`[Reclub Import] Fetching URL: ${targetUrl}`);
        
        let success = false;
        let lastErrorMsg = "";

        const fetchStrategies = [
          // 1. Google Focus Proxy (Extremely reliable bypass via Google crawler IPs)
          {
            name: "Google Focus Proxy",
            fn: async () => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3500);
              try {
                // Append small cache buster param to targetUrl to ensure fresh fetch
                const cbUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + `_cb=${Date.now()}`;
                const proxyUrl = `https://images-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=1&url=${encodeURIComponent(cbUrl)}`;
                const res = await fetch(proxyUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!res.ok) {
                  throw new Error(`Google Proxy HTTP Status ${res.status}`);
                }
                const body = await res.text();
                if (!body || body.trim().length < 200) {
                  throw new Error("Returned payload too short or empty");
                }
                if (body.includes("Cloudflare") && (body.includes("Access denied") || body.includes("security check"))) {
                  throw new Error("Blocked by Cloudflare on Google proxy");
                }
                return { html: body, url: targetUrl };
              } catch (e) {
                clearTimeout(timeoutId);
                throw e;
              }
            }
          },
          // 2. Direct Fetch with Browser User-Agent
          {
            name: "Direct Fetch",
            fn: async () => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              try {
                const res = await fetch(targetUrl, {
                  signal: controller.signal,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                  }
                });
                clearTimeout(timeoutId);
                if (!res.ok) {
                  throw new Error(`HTTP Status ${res.status}`);
                }
                const body = await res.text();
                return { html: body, url: res.url };
              } catch (e) {
                clearTimeout(timeoutId);
                throw e;
              }
            }
          },
          // 3. CorsProxy.io Bypass
          {
            name: "CorsProxy.io",
            fn: async () => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              try {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
                const res = await fetch(proxyUrl, {
                  signal: controller.signal,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                  }
                });
                clearTimeout(timeoutId);
                if (!res.ok) {
                  throw new Error(`Proxy HTTP Status ${res.status}`);
                }
                const body = await res.text();
                if (body.includes("Cloudflare") && (body.includes("Access denied") || body.includes("security check"))) {
                  throw new Error("Blocked by Cloudflare on proxy");
                }
                return { html: body, url: targetUrl };
              } catch (e) {
                clearTimeout(timeoutId);
                throw e;
              }
            }
          },
          // 4. AllOrigins.win Bypass
          {
            name: "AllOrigins.win",
            fn: async () => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
                const res = await fetch(proxyUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!res.ok) {
                  throw new Error(`Proxy HTTP Status ${res.status}`);
                }
                const json = await res.json() as any;
                if (!json.contents) {
                  throw new Error("Empty contents from AllOrigins");
                }
                return { html: json.contents, url: targetUrl };
              } catch (e) {
                clearTimeout(timeoutId);
                throw e;
              }
            }
          },
          // 5. CodeTabs Proxy Bypass
          {
            name: "CodeTabs Proxy",
            fn: async () => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              try {
                const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
                const res = await fetch(proxyUrl, {
                  signal: controller.signal,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                  }
                });
                clearTimeout(timeoutId);
                if (!res.ok) {
                  throw new Error(`Proxy HTTP Status ${res.status}`);
                }
                const body = await res.text();
                return { html: body, url: targetUrl };
              } catch (e) {
                clearTimeout(timeoutId);
                throw e;
              }
            }
          }
        ];

        // Run all strategies concurrently for maximum speed and fallback capability.
        // Promise.any resolves with the fastest successful strategy, and fails if all fail.
        const strategyPromises = fetchStrategies.map(async (strategy) => {
          try {
            console.log(`[Reclub Import] Triggered parallel strategy: ${strategy.name}`);
            const result = await strategy.fn();
            if (result.html && result.html.trim().length > 100) {
              console.log(`[Reclub Import] Strategy succeeded first: ${strategy.name}`);
              return result;
            }
            throw new Error(`Strategy ${strategy.name} returned empty or invalid content`);
          } catch (err: any) {
            console.warn(`[Reclub Import] Parallel strategy failed: ${strategy.name} (${err?.message || err})`);
            throw err;
          }
        });

        try {
          const result = await Promise.any(strategyPromises);
          html = result.html;
          success = true;

          // Handle redirection detection for final urlSlug update
          if (result.url && result.url !== targetUrl) {
            console.log(`[Reclub Import] Redirected to final URL: ${result.url}`);
            try {
              const finalUrlObj = new URL(result.url);
              const pathParts = finalUrlObj.pathname.split('/').filter(Boolean);
              if (pathParts.length > 0) {
                const finalSlug = pathParts[pathParts.length - 1].toLowerCase().trim();
                if (finalSlug) {
                  urlSlug = finalSlug;
                  console.log(`[Reclub Import] Updated urlSlug from final redirected URL: ${urlSlug}`);
                }
              }
            } catch (err) {}
          }
        } catch (aggregateError: any) {
          console.error("[Reclub Import] All concurrent strategies failed:", aggregateError);
          lastErrorMsg = "Semua proxy / link bypass gagal merespon atau diblokir oleh Cloudflare.";
        }

        if (!success) {
          throw new Error(`Koneksi diblokir oleh Cloudflare Reclub (${lastErrorMsg}). Batasan keamanan Cloudflare memblokir akses langsung dari server cloud (baik Vercel maupun AI Studio). Silakan klik tombol kuning "⚠️ Link Error? Gunakan Metode Paste HTML" di atas untuk menyalin langsung data halaman permainan Anda!`);
        }
      }

      // Extract the confirmed/going count from the HTML if possible as a safeguard
      let confirmedCount: number | null = null;
      // Strip HTML tags so regex matches even if separated by tags like <span>Dikonfirmasi</span> • <span>12</span>
      const strippedHtmlForCount = html.replace(/<[^>]+>/g, ' ');
      const confirmedMatch = strippedHtmlForCount.match(/(?:Dikonfirmasi|Confirmed|Going|Hadir|Ikut)\s*[\s•·\.\-\:\(\[|*]+\s*(\d+)/i) || 
                             strippedHtmlForCount.match(/(?:Dikonfirmasi|Confirmed|Going|Hadir|Ikut)\s*\(\s*(\d+)\s*\)/i);
      if (confirmedMatch) {
        const val = parseInt(confirmedMatch[1], 10);
        if (!isNaN(val) && val > 0) {
          confirmedCount = val;
          console.log(`[Reclub Import] Text-stripped Regex detected confirmed count: ${confirmedCount}`);
        }
      }

      // Try to extract the HTML Page Title or og:title as a matching guide
      let htmlTitle = "";
      if (html) {
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) {
          htmlTitle = decodeHTMLEntities(titleMatch[1].trim());
        }
        const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
        if (ogTitleMatch) {
          htmlTitle = decodeHTMLEntities(ogTitleMatch[1].trim());
        }
        console.log(`[Reclub Import] Extracted htmlTitle for scoring: "${htmlTitle}"`);
      }

      // If urlSlug is not found yet, try extracting from HTML (e.g. from canonical URL, og:url meta tags, or any Reclub meet link)
      if (!urlSlug && html) {
        const ogUrlMatch = html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i) ||
                           html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i);
        if (ogUrlMatch) {
          try {
            const parsedUrl = new URL(ogUrlMatch[1]);
            const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
              urlSlug = pathParts[pathParts.length - 1].toLowerCase().trim();
              console.log(`[Reclub Import] Extracted urlSlug from HTML og:url/canonical: ${urlSlug}`);
            }
          } catch (e) {}
        }

        // Broad scan fallback: look for reclub.co/id/m/... or simply /m/SLUG inside HTML links or JSON values
        if (!urlSlug) {
          const mMatch = html.match(/reclub\.co\/(?:[a-z]{2}\/)?m\/([a-zA-Z0-9_-]+)/i) ||
                         html.match(/\/m\/([a-zA-Z0-9_-]+)/i);
          if (mMatch) {
            urlSlug = mMatch[1].toLowerCase().trim();
            console.log(`[Reclub Import] Broad regex extracted urlSlug from HTML links: ${urlSlug}`);
          }
        }
      }

      // Search for <script id="__NUXT_DATA__">
      let match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      let rawJson = "";
      let playersList: any[] = [];
      let eventName = "Roster Hasil Ekstraksi";
      let venue = "Reclub";
      let parsedSuccessfully = false;

      if (match || (html.trim().startsWith('[') && html.trim().endsWith(']'))) {
        try {
          if (match) {
            rawJson = decodeHTMLEntities(match[1].trim());
          } else {
            rawJson = html.trim();
          }

          const parsedArray = JSON.parse(rawJson);

          if (Array.isArray(parsedArray)) {
            // Unflatten the Nuxt data array
            const length = parsedArray.length;
            const hydrated = new Array(length);

            const walk = (index: number, visited = new Set<number>()): any => {
              if (index === -1) return undefined;
              if (index < 0 || index >= length) return undefined;
              if (index in hydrated) return hydrated[index];
              if (visited.has(index)) return undefined; // circular ref block

              visited.add(index);
              const value = parsedArray[index];

              if (value === null || typeof value === 'undefined') {
                hydrated[index] = value;
                return value;
              }

              if (typeof value !== 'object') {
                hydrated[index] = value;
                return value;
              }

              // Check if it's a wrapper array (like Vue Reactive/Ref wrapper)
              if (Array.isArray(value)) {
                if (value.length === 2 && typeof value[0] === 'string' && ['Reactive', 'ShallowReactive', 'Ref', 'ShallowRef'].includes(value[0])) {
                  const unwrapped = walk(value[1], visited);
                  hydrated[index] = unwrapped;
                  return unwrapped;
                }

                const arr: any[] = [];
                hydrated[index] = arr;
                for (const item of value) {
                  arr.push(typeof item === 'number' && item >= 0 && item < length ? walk(item, new Set(visited)) : item);
                }
                return arr;
              }

              // Object
              const obj: Record<string, any> = {};
              hydrated[index] = obj;
              for (const key of Object.keys(value)) {
                const val = value[key];
                obj[key] = (typeof val === 'number' && val >= 0 && val < length) ? walk(val, new Set(visited)) : val;
              }
              return obj;
            };

            // Walk all indices to hydrate
            for (let i = 0; i < length; i++) {
              walk(i);
            }

            // Build a unified users map from all objects in hydrated to maximize profile resolution
            const unifiedUsersMap: Record<string, any> = {};
            for (const item of hydrated) {
              if (!item || typeof item !== 'object') continue;

              // If it's a single user profile
              const possibleId = item.id || item.userId || item.uid || item.referenceId || item.memberId;
              const hasName = item.name || item.username || item.firstName || item.fullName || item.displayName;
              if (possibleId && hasName && !Array.isArray(item)) {
                unifiedUsersMap[String(possibleId)] = item;
              }

              // If it's a map/dictionary of users
              for (const key of Object.keys(item)) {
                const val = item[key];
                if (val && typeof val === 'object' && !Array.isArray(val)) {
                  const hasSubName = val.name || val.username || val.firstName || val.fullName || val.displayName;
                  if (hasSubName) {
                    unifiedUsersMap[String(key)] = val;
                    const subId = val.id || val.userId || val.uid || val.referenceId || val.memberId;
                    if (subId) {
                      unifiedUsersMap[String(subId)] = val;
                    }
                  }
                }
              }
            }

            console.log(`[Reclub Import] Compiled unifiedUsersMap with ${Object.keys(unifiedUsersMap).length} profiles.`);

            // Identify all potential meet/event candidate objects in hydrated state
            const meetCandidates: any[] = [];
            for (const item of hydrated) {
              if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

              const hasParticipants = (item.participants && Array.isArray(item.participants)) ||
                                      (item.members && Array.isArray(item.members)) ||
                                      (item.users && Array.isArray(item.users)) ||
                                      (item.attendees && Array.isArray(item.attendees));

              if (hasParticipants || item.sport || item.venue || item.location || item.meetCode) {
                meetCandidates.push(item);
              }
            }

            // Score candidate meets to find the primary/active one
            const scoredMeets: { meet: any; score: number }[] = [];
            for (const meet of meetCandidates) {
              let score = 0;
              const participants = meet.participants || meet.members || meet.users || meet.attendees || [];
              const pCount = participants.length;
              score += pCount * 15; // Higher participant count indicates active roster page

              const meetSlug = String(meet.slug || "").toLowerCase().trim();
              const meetId = String(meet.id || "").toLowerCase().trim();
              const meetCode = String(meet.code || meet.shortCode || meet.short_code || meet.meetCode || meet.meet_code || "").toLowerCase().trim();
              const meetName = String(meet.name || "").toLowerCase().trim();
              const normalizedName = meetName.replace(/[^a-z0-9]+/g, '-');

              if (urlSlug) {
                const cleanUrlSlug = urlSlug.toLowerCase().trim();
                if (meetCode === cleanUrlSlug || meetId === cleanUrlSlug || meetSlug === cleanUrlSlug) {
                  score += 100000; // Exact match on code, id, or slug is the absolute correct match
                } else if (
                  (meetCode && (cleanUrlSlug.includes(meetCode) || meetCode.includes(cleanUrlSlug))) ||
                  (meetId && (cleanUrlSlug.includes(meetId) || meetId.includes(cleanUrlSlug))) ||
                  (meetSlug && (cleanUrlSlug.includes(meetSlug) || meetSlug.includes(cleanUrlSlug)))
                ) {
                  score += 50000;
                }

                if (normalizedName === cleanUrlSlug) {
                  score += 60000;
                } else if (cleanUrlSlug.includes(normalizedName) || normalizedName.includes(cleanUrlSlug)) {
                  score += 30000;
                }
              }

              // Match against htmlTitle
              if (htmlTitle && meetName) {
                const normTitle = htmlTitle.toLowerCase();
                const normMeetName = meetName.toLowerCase();
                if (normTitle.includes(normMeetName) || normMeetName.includes(normTitle)) {
                  score += 40000;
                }
              }

              scoredMeets.push({ meet, score });
            }

            scoredMeets.sort((a, b) => b.score - a.score);
            const foundMeet = scoredMeets.length > 0 ? scoredMeets[0].meet : null;

            if (foundMeet) {
              console.log(`[Reclub Import] Selected best meet: "${foundMeet.name || 'Unnamed'}" with score ${scoredMeets[0].score}`);
              eventName = foundMeet.name || "Pertandingan Reclub";
              if (foundMeet.venue) {
                venue = foundMeet.venue.name || foundMeet.venue || venue;
              } else if (foundMeet.location) {
                venue = foundMeet.location.name || foundMeet.location || venue;
              }

              // Try to find the confirmed/going count inside foundMeet properties
              const possibleCountKeys = ['goingCount', 'going_count', 'confirmedCount', 'confirmed_count', 'spotsFilled', 'spots_filled', 'going'];
              for (const key of possibleCountKeys) {
                const val = foundMeet[key];
                if (val !== undefined && val !== null) {
                  const numVal = parseInt(val, 10);
                  if (!isNaN(numVal) && numVal > 0) {
                    if (confirmedCount === null) {
                      confirmedCount = numVal;
                      console.log(`[Reclub Import] Found confirmed count in meet.${key}: ${confirmedCount}`);
                    }
                    break;
                  }
                }
              }

              const participants = foundMeet.participants || foundMeet.members || foundMeet.users || foundMeet.attendees || [];
              
              for (const part of participants) {
                if (!part) continue;

                let refId = null;
                let userData = null;

                if (typeof part === 'object') {
                  refId = part.referenceId || part.userId || part.id || part.memberId || part.uid;
                  // Some participant objects contain the full user object inside them under 'user' or 'profile' key
                  userData = part.user || part.profile || part.member || part.userData;
                } else if (typeof part === 'string' || typeof part === 'number') {
                  refId = String(part);
                }

                if (!userData && refId) {
                  userData = unifiedUsersMap[String(refId)];
                }

                // Check and filter by participant status.
                // Reclub Nuxt payload represents status numerically:
                // 1 = Going / Confirmed
                // 2 = Maybe / Interested
                // 3 = Invited / Pending
                // 4 = Waitlisted / Queue
                // 5 = Declined / Not Going
                // -1 = Cancelled / Left
                let partStatus = "";
                if (part && typeof part === 'object') {
                  partStatus = String(part.status || part.state || part.registrationStatus || part.registrationState || "").trim().toLowerCase();
                }

                const isNumeric = /^-?\d+$/.test(partStatus);
                if (isNumeric) {
                  // Only status '1' indicates a confirmed / going player. Skip others (waitlist, maybe, cancelled, declined)
                  if (partStatus !== "1") {
                    console.log(`[Reclub Import] Nuxt: Skipping participant ${refId || 'unknown'} because numeric status is "${partStatus}" (not 1 / Going)`);
                    continue;
                  }
                } else if (partStatus) {
                  // Fallback for string status
                  if (['waitlist', 'waiting', 'maybe', 'interested', 'not_going', 'cancelled', 'declined', 'invited', 'pending'].includes(partStatus)) {
                    console.log(`[Reclub Import] Nuxt: Skipping participant ${refId || 'unknown'} because status is "${partStatus}"`);
                    continue;
                  }
                }

                // If we found the user data, extract details
                if (userData && typeof userData === 'object') {
                  const username = userData.username || userData.userName || userData.handle || "";
                  const firstName = userData.firstName || "";
                  const lastName = userData.lastName || "";
                  let name = userData.name || userData.displayName || userData.fullName || "";
                  if (!name && (firstName || lastName)) {
                    name = `${firstName} ${lastName}`.trim();
                  }

                  // Detect gender
                  let gender = "Laki-laki";
                  const g = userData.gender || userData.Gender || "";
                  if (typeof g === 'string') {
                    if (g === 'F' || g === 'Female' || g.toLowerCase().startsWith('p') || g.toLowerCase() === 'f') {
                      gender = "Perempuan";
                    }
                  }

                  // Detect level
                  let skillLevel = "Intermediate";
                  const l = userData.skillLevel || userData.level || userData.Level || "";
                  if (typeof l === 'string') {
                    const levelLower = l.toLowerCase();
                    if (levelLower.includes('begin') || levelLower.includes('pemula') || levelLower.includes('dasar')) {
                      skillLevel = "Beginner";
                    } else if (levelLower.includes('inter') || levelLower.includes('menengah')) {
                      skillLevel = "Intermediate";
                    } else if (levelLower.includes('adv') || levelLower.includes('mahir') || levelLower.includes('expert')) {
                      skillLevel = "Advanced";
                    }
                  }

                  if (name) {
                    const pId = refId || userData.id || userData.userId || name;
                    if (!playersList.some(p => p.name.toLowerCase() === name.toLowerCase() || p.id === String(pId))) {
                      playersList.push({ id: String(pId), username, name, gender, skillLevel });
                    }
                  }
                } else if (part && typeof part === 'object' && (part.name || part.displayName)) {
                  // Direct participant name (e.g. if the participant is just a simple object with name)
                  const name = part.name || part.displayName;
                  const username = part.username || "";
                  let gender = "Laki-laki";
                  let skillLevel = "Intermediate";
                  const pId = part.id || name;
                  if (!playersList.some(p => p.name.toLowerCase() === name.toLowerCase() || p.id === String(pId))) {
                    playersList.push({ id: String(pId), username, name, gender, skillLevel });
                  }
                }
              }

              parsedSuccessfully = playersList.length > 0;
            }

            // Fallback scan of hydrated array if no players found
            if (playersList.length === 0) {
              console.log("[Reclub Import] No players found via bestMeet, executing broad payload array scan...");
              for (const item of hydrated) {
                if (Array.isArray(item)) {
                  for (const sub of item) {
                    if (!sub || typeof sub !== 'object') continue;
                    const name = sub.name || sub.displayName || sub.fullName || (sub.firstName ? `${sub.firstName} ${sub.lastName || ''}`.trim() : "");
                    if (name) {
                      const pId = sub.id || sub.userId || sub.referenceId || name;
                      if (!playersList.some(p => p.name.toLowerCase() === name.toLowerCase() || p.id === String(pId))) {
                        playersList.push({
                          id: String(pId),
                          username: sub.username || "",
                          name,
                          gender: "Laki-laki",
                          skillLevel: "Intermediate"
                        });
                      }
                    }
                  }
                }
              }
              if (playersList.length > 0) {
                parsedSuccessfully = true;
              }
            }
          }
        } catch (err) {
          console.warn("[Reclub Import] Nuxt parsing failed, falling back to heuristic parsing:", err);
        }
      }

      if (!parsedSuccessfully) {
        console.log("[Reclub Import] Parsing via heuristic text extractor...");
        const extracted = tryExtractPlayersHeuristically(html);
        if (extracted && extracted.length > 0) {
          playersList = extracted;
          parsedSuccessfully = true;
        }
      }

      if (!parsedSuccessfully || playersList.length === 0) {
        throw new Error("Gagal menemukan data atlet dari input yang Anda masukkan. Pastikan Anda menyalin kode sumber (View Source) atau seluruh teks halaman daftar peserta Reclub dengan benar.");
      }

      // De-duplicate extracted players list
      const seen = new Set<string>();
      const uniquePlayers: any[] = [];
      for (const p of playersList) {
        if (!p.name) continue;
        const norm = p.name.trim().toLowerCase();
        if (!seen.has(norm)) {
          seen.add(norm);
          uniquePlayers.push(p);
        }
      }
      playersList = uniquePlayers;

      // Slice the playersList to confirmedCount if it's found/extracted
      if (confirmedCount !== null && playersList.length > confirmedCount) {
        console.log(`[Reclub Import] Slicing playersList from ${playersList.length} to ${confirmedCount} based on confirmedCount (${confirmedCount})`);
        playersList = playersList.slice(0, confirmedCount);
      }

      console.log(`[Reclub Import] Successfully extracted ${playersList.length} players from "${eventName}"`);
      res.json({
        eventName,
        venue,
        players: playersList
      });

    } catch (err: any) {
      console.error("Reclub Import Failed:", err);
      res.status(500).json({ error: err?.message || "Gagal mengimpor data Reclub karena kesalahan server." });
    }
  });

  // Serve static dist folder in production, or mount Vite middleware in development (skipped on Vercel)
  async function initServer() {
    if (!process.env.VERCEL) {
      if (process.env.NODE_ENV !== "production") {
        const { createServer: createViteServer } = require("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }

      const PORT = 3000;
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Cotta Master] Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
      });
    }
  }

  initServer().catch((err) => {
    console.error("Failed to initialize server:", err);
  });

export default app;

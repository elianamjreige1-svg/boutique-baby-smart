import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { incomeAmount, sumAmounts, totalIncome } from "./accounting";

const amount = z.number().finite().min(0).max(9999999999.99)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001, "Use at most two decimal places");

export const accountingQueryKey = ["admin-accounting"];

export const getAccounting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const role = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Admin access required");
    const [orders, settings, expenses] = await Promise.all([
      supabase.from("orders").select("id, customer_name, total, status, created_at, confirmed_at, picked_up_at").in("status", ["confirmed", "shipped", "picked-up"]).order("created_at", { ascending: false }),
      supabase.from("accounting_settings").select("income_adjustment").eq("id", 1).maybeSingle(),
      supabase.from("accounting_expenses").select("id, amount, description, created_at").order("created_at", { ascending: false }),
    ]);
    if (orders.error || settings.error || expenses.error) throw new Error("Could not load income and outcomes");
    const income = orders.data.map((order) => ({ ...order, income: incomeAmount(order) }));
    const adjustment = Number(settings.data?.income_adjustment ?? 0);
    return { income, adjustment, expenses: expenses.data, totalIncome: totalIncome(orders.data, adjustment), totalExpenses: sumAmounts(expenses.data.map((row) => Number(row.amount))) };
  });

export const saveIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ amount }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const role = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Admin access required");
    const result = await supabase.rpc("set_income_total", { _total: data.amount });
    if (result.error) throw new Error("Could not save income");
    return { success: true };
  });

export const saveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid().optional(), amount, description: z.string().trim().min(1).max(500) }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const role = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Admin access required");
    const values = { amount: data.amount, description: data.description };
    const result = data.id
      ? await supabase.from("accounting_expenses").update(values).eq("id", data.id).select("id").single()
      : await supabase.from("accounting_expenses").insert(values).select("id").single();
    if (result.error) throw new Error("Could not save outcome");
    return { id: result.data.id };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const role = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Admin access required");
    const result = await supabase.from("accounting_expenses").delete().eq("id", data.id);
    if (result.error) throw new Error("Could not delete outcome");
    return { success: true };
  });
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAccounting, saveIncome, saveExpense, deleteExpense, accountingQueryKey } from "@/lib/accounting.functions";
import { money } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const accountingOptions = queryOptions({
  queryKey: accountingQueryKey,
  queryFn: () => getAccounting(),
  refetchOnWindowFocus: "always",
  refetchInterval: 15000,
});

export const Route = createFileRoute("/_authenticated/in-out")({
  head: () => ({ meta: [
    { title: "In/Out — cuddlekids.lb Admin" },
    { name: "description", content: "Private income and outcome records for cuddlekids.lb." },
    { property: "og:title", content: "In/Out — cuddlekids.lb Admin" },
    { property: "og:description", content: "Manage store income totals and outcomes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountingOptions),
  component: Accounting,
});

type Editor = { kind: "income"; amount: string } | { kind: "expense"; id?: string; amount: string; description: string };

function Accounting() {
  const { data } = useSuspenseQuery(accountingOptions);
  const qc = useQueryClient();
  
    const { data } = useSuspenseQuery(accountingOptions);
    const net = data.totalIncome - data.totalExpenses;

  const saveTotal = useServerFn(saveIncome);
  const saveOutcome = useServerFn(saveExpense);
  const removeOutcome = useServerFn(deleteExpense);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: accountingQueryKey });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor || busy) return;
    if (!editor.amount.trim()) { toast.error("Enter an amount"); return; }
    const amount = Number(editor.amount);
    if (!Number.isFinite(amount) || amount < 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) {
      toast.error("Enter a valid amount with at most two decimal places"); return;
    }
    setBusy(true);
    try {
      if (editor.kind === "income") await saveTotal({ data: { amount } });
      else await saveOutcome({ data: { ...(editor.id ? { id: editor.id } : {}), amount, description: editor.description } });
      await refresh();
      setEditor(null);
      toast.success(editor.kind === "income" ? "Income total saved" : "Outcome saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await removeOutcome({ data: { id: deleting } });
      await refresh();
      setDeleting(null);
      toast.success("Outcome deleted");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete outcome"); }
    finally { setBusy(false); }
  };

  return <main className="mx-auto max-w-6xl px-4 py-10">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-4xl font-semibold">In/Out</h1>
      <Button variant="outline" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" />Admin Panel</Link></Button>
    </header>
    <Tabs defaultValue="income">
            <div className="flex items-center justify-between gap-2">
       
              <TabsList>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
        </TabsList>
        <span className={`text-xl font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
          {net >= 0 ? `+${money(net)}` : `-${money(Math.abs(net))}`}
        </span>
      </div>

      <TabsContent value="income">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-6">
          <div><p className="text-sm text-muted-foreground">Total income</p><p className="mt-1 text-3xl font-semibold" data-testid="total-income">{money(data.totalIncome)}</p></div>
          <Button variant="outline" onClick={() => setEditor({ kind: "income", amount: String(data.totalIncome) })}><Pencil className="h-4 w-4" />Edit total</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3 text-right whitespace-nowrap">Value ($)</th></tr></thead>
            <tbody>{data.income.map((row) => <tr key={row.id} className="border-b border-border"><td className="p-3 whitespace-nowrap">#{row.id.slice(0, 8)}</td><td className="p-3">{row.customer_name}</td><td className="p-3 capitalize whitespace-nowrap">{row.status}</td><td className="p-3 text-right">{money(row.income)}</td></tr>)}</tbody>
          </table>
        </div>
        {!data.income.length && <p className="py-8 text-center text-muted-foreground">No income orders yet.</p>}
        {data.adjustment !== 0 && <div className="flex justify-between border-b border-border p-3 text-sm"><span>Manual adjustment</span><span>{money(data.adjustment)}</span></div>}
      </TabsContent>
      <TabsContent value="outcomes">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-6">
          <div><p className="text-sm text-muted-foreground">Total outcomes</p><p className="mt-1 text-3xl font-semibold" data-testid="total-outcomes">{money(data.totalExpenses)}</p></div>
          <Button onClick={() => setEditor({ kind: "expense", amount: "", description: "" })}><Plus className="h-4 w-4" />Add outcome</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground"><tr><th className="p-3">Description</th><th className="p-3 text-right whitespace-nowrap">Value ($)</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{data.expenses.map((row) => <tr key={row.id} className="border-b border-border"><td className="max-w-sm break-words p-3">{row.description}</td><td className="p-3 text-right whitespace-nowrap">{money(Number(row.amount))}</td><td className="p-3"><div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" aria-label={`Edit outcome: ${row.description}`} title="Edit outcome" onClick={() => setEditor({ kind: "expense", id: row.id, amount: String(row.amount), description: row.description })}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={`Delete outcome: ${row.description}`} title="Delete outcome" onClick={() => setDeleting(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div></td></tr>)}</tbody>
          </table>
        </div>
        {!data.expenses.length && <p className="py-8 text-center text-muted-foreground">No outcomes yet.</p>}
      </TabsContent>
    </Tabs>
    <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !busy) setEditor(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{editor?.kind === "income" ? "Edit total income" : editor?.id ? "Edit outcome" : "Add outcome"}</DialogTitle></DialogHeader>
        {editor && <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="accounting-amount">{editor.kind === "income" ? "Total income ($)" : "Outcome value ($)"}</Label><Input autoFocus id="accounting-amount" type="number" min="0" max="9999999999.99" step="0.01" required value={editor.amount} onChange={(e) => setEditor({ ...editor, amount: e.target.value })} /></div>
          {editor.kind === "expense" && <div className="space-y-2"><Label htmlFor="outcome-description">Description</Label><Textarea id="outcome-description" required maxLength={500} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} /></div>}
          <div className="flex justify-end gap-2"><Button variant="outline" type="button" disabled={busy} onClick={() => setEditor(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
    <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete this outcome?</DialogTitle></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete"}</Button></div></DialogContent></Dialog>
  </main>;
}

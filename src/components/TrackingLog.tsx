import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TrackingLog({ orderId, admin = false }: { orderId: string; admin?: boolean }) {
  const qc = useQueryClient();
  const key = ["tracking", orderId];
  const { data } = useQuery({
    queryKey: key,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("order_tracking_events")
        .select("id, location, note, created_at").eq("order_id", orderId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [loc, setLoc] = useState("");
  const [note, setNote] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("order_tracking_events").insert({ order_id: orderId, location: loc.trim(), note: note.trim() });
    if (error) { toast.error(error.message); return; }
    setLoc(""); setNote(""); qc.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("order_tracking_events").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="mt-4 space-y-3">
      {admin && (
        <form onSubmit={add} className="flex flex-wrap gap-2">
          <Input required maxLength={120} placeholder="Current location (e.g. Mumbai hub)" value={loc} onChange={(e) => setLoc(e.target.value)} className="min-w-48 flex-1" />
          <Input maxLength={200} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="min-w-40 flex-1" />
          <Button type="submit" size="sm">Add update</Button>
        </form>
      )}
      {data && data.length > 0 ? (
        <ol className="space-y-3 border-l-2 border-primary/30 pl-4">
          {data.map((ev, i) => (
            <li key={ev.id} className="relative">
              <span className={`absolute -left-[1.4rem] top-1 size-3 rounded-full ${i === 0 ? "bg-primary ring-4 ring-primary/20" : "bg-border"}`} />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1 text-sm font-medium"><MapPin className="size-3.5 text-primary" />{ev.location}{i === 0 && <span className="ml-2 rounded-full bg-primary/10 px-2 text-xs text-primary">Latest</span>}</p>
                  {ev.note && <p className="text-sm text-muted-foreground">{ev.note}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</p>
                </div>
                {admin && <Button variant="ghost" size="icon" onClick={() => remove(ev.id)} aria-label="Delete update"><Trash2 className="size-4" /></Button>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No location updates yet.</p>
      )}
    </div>
  );
}

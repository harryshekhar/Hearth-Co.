CREATE TABLE public.order_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  location text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.order_tracking_events(order_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.order_tracking_events TO authenticated;
GRANT ALL ON public.order_tracking_events TO service_role;
ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read tracking of visible orders" ON public.order_tracking_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Admins add tracking" ON public.order_tracking_events FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete tracking" ON public.order_tracking_events FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
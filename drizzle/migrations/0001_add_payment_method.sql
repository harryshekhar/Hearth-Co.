ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod';
CREATE OR REPLACE FUNCTION public.place_order_v2(_items jsonb, _name text, _address text, _city text, _postal text, _payment_method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare _id uuid;
begin
  if _payment_method not in ('cod') then raise exception 'This payment method is not available yet'; end if;
  _id := public.place_order(_items, _name, _address, _city, _postal);
  update public.orders set payment_method = _payment_method, status = 'pending' where id = _id;
  return _id;
end; $$;
REVOKE ALL ON FUNCTION public.place_order_v2(jsonb,text,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.place_order_v2(jsonb,text,text,text,text,text) TO authenticated;
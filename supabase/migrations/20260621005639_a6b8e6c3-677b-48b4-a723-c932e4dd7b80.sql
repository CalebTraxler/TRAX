
-- Providers (companies)
CREATE TABLE public.providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#888888',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.providers TO anon, authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers are publicly readable"
  ON public.providers FOR SELECT
  USING (true);

-- Models
CREATE TYPE public.model_tier AS ENUM ('flagship', 'mid', 'small');

CREATE TABLE public.models (
  id text PRIMARY KEY,
  provider_id text NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  label text NOT NULL,
  tier public.model_tier NOT NULL,
  or_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX models_provider_idx ON public.models(provider_id);
GRANT SELECT ON public.models TO anon, authenticated;
GRANT ALL ON public.models TO service_role;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Models are publicly readable"
  ON public.models FOR SELECT
  USING (true);

-- Price points
CREATE TABLE public.model_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  price_date date NOT NULL,
  input_price numeric NOT NULL,
  output_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, price_date)
);
CREATE INDEX model_prices_model_date_idx ON public.model_prices(model_id, price_date);
GRANT SELECT ON public.model_prices TO anon, authenticated;
GRANT ALL ON public.model_prices TO service_role;
ALTER TABLE public.model_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Model prices are publicly readable"
  ON public.model_prices FOR SELECT
  USING (true);

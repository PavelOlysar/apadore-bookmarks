-- Optional seed data — run after the migration if you want a populated grid
-- without manually adding pins. Replace the saved_by uuid with a real profile id
-- from your project (Authentication → Users).

-- Categories
insert into public.categories (name, slug) values
  ('Web',         'web'),
  ('Branding',    'branding'),
  ('Typography',  'typography'),
  ('Editorial',   'editorial'),
  ('Interior',    'interior'),
  ('Product',     'product')
on conflict (name) do nothing;

-- Tags
insert into public.tags (name, slug) values
  ('minimal',   'minimal'),
  ('editorial', 'editorial'),
  ('serif',     'serif'),
  ('grid',      'grid'),
  ('archive',   'archive')
on conflict (name) do nothing;

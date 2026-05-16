insert into chains (code, name)
values
  ('albert', 'Albert'),
  ('lidl', 'Lidl'),
  ('billa', 'BILLA')
on conflict (code) do nothing;

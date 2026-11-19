-- Recorded (current) value of an item, kept separate from what was paid for it.
alter table public.items
  add column current_value_yen bigint check (current_value_yen between 0 and 1000000000000);

comment on column public.items.current_value_yen is 'User-recorded current value (JPY). Purchase cost lives in item_events.';

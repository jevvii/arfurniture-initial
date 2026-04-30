create table if not exists app_documents (
  collection text not null,
  id text not null,
  document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (collection, id)
);

create index if not exists app_documents_collection_idx
  on app_documents (collection);

create index if not exists app_documents_document_gin_idx
  on app_documents using gin (document);

create or replace function app_documents_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_app_documents_set_updated_at on app_documents;
create trigger trg_app_documents_set_updated_at
before update on app_documents
for each row
execute function app_documents_set_updated_at();

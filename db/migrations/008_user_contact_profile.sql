-- Optional contact phone for self-service account profiles.
alter table users add column if not exists phone text;

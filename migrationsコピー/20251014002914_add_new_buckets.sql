alter table "public"."spots" drop column "title";

alter table "public"."spots" add column "name" text not null;

alter table "public"."spots" alter column "address" set not null;

alter table "public"."spots" alter column "category" set data type text using "category"::text;

alter table "public"."spots" alter column "description" set not null;



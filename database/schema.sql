
DELETE SCHEMA IF EXISTS "radidone_schema" CASCADE;

CREATE SCHEMA IF NOT EXISTS "radidone_schema";

SET search_path TO "radidone_schema";

CREATE TABLE "users" (
  "id" serial PRIMARY KEY,
  "clerk_id" varchar UNIQUE NOT NULL,
  "name" varchar,
  "email" varchar UNIQUE NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN "users"."clerk_id" IS 'Clerk external auth id';

CREATE TABLE "sessions" (
  "id" serial PRIMARY KEY,
  "user_id" int NOT NULL,
  "status" varchar NOT NULL DEFAULT 'active',
  "started_at" timestamptz DEFAULT now(),
  "ended_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_status_check CHECK (status IN ('active', 'completed', 'archived'))
);

CREATE TABLE "xray_images" (
  "id" serial PRIMARY KEY,
  "session_id" int NOT NULL,
  "user_id" int NOT NULL,
  "upload_time" timestamptz NOT NULL DEFAULT now(),
  "metadata" jsonb
);

CREATE TABLE "annotations" (
  "id" serial PRIMARY KEY,
  "xray_image_id" int NOT NULL,
  "user_id" int NOT NULL,
  "session_id" int NOT NULL,
  "type" varchar NOT NULL,
  "geometry" jsonb NOT NULL,
  "finding_label" varchar,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "session_conversations" (
  "id" serial PRIMARY KEY,
  "session_id" int NOT NULL,
  "sender_role" varchar NOT NULL,
  "message_text" text,
  "turn_index" int NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sender_role_check CHECK (sender_role IN ('student', 'mentor'))
);

CREATE TABLE "audio_voices" (
  "id" serial PRIMARY KEY,
  "session_id" int NOT NULL,
  "user_id" int NOT NULL,
  "conversation_id" int NOT NULL,
  "transcript_text" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);



CREATE TABLE "ai_analysis" (
  "id" serial PRIMARY KEY,
  "xray_image_id" int NOT NULL,
  "analysis_json" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

/* Indexes */
CREATE INDEX "idx_users_clerk_id" ON "users" ("clerk_id");
CREATE INDEX "idx_users_email" ON "users" ("email");
CREATE INDEX "idx_sessions_user_id" ON "sessions" ("user_id");
CREATE INDEX "idx_sessions_status" ON "sessions" ("status");
CREATE INDEX "idx_sessions_created_at" ON "sessions" ("created_at");
CREATE INDEX "idx_xray_images_session_id" ON "xray_images" ("session_id");
CREATE INDEX "idx_xray_images_user_id" ON "xray_images" ("user_id");
CREATE INDEX "idx_xray_images_upload_time" ON "xray_images" ("upload_time");
CREATE INDEX "idx_annotations_xray_image_id" ON "annotations" ("xray_image_id");
CREATE INDEX "idx_annotations_user_id" ON "annotations" ("user_id");
CREATE INDEX "idx_annotations_session_id" ON "annotations" ("session_id");
CREATE INDEX "idx_annotations_created_at" ON "annotations" ("created_at");
CREATE INDEX "idx_session_conversations_session_id" ON "session_conversations" ("session_id");
CREATE INDEX "idx_session_conversations_turn_index" ON "session_conversations" ("turn_index");
CREATE INDEX "idx_audio_voices_session_id" ON "audio_voices" ("session_id");
CREATE INDEX "idx_audio_voices_user_id" ON "audio_voices" ("user_id");
CREATE INDEX "idx_audio_voices_conversation_id" ON "audio_voices" ("conversation_id");
CREATE INDEX "idx_audio_voices_created_at" ON "audio_voices" ("created_at");
CREATE INDEX "idx_ai_analysis_xray_image_id" ON "ai_analysis" ("xray_image_id");
CREATE INDEX "idx_ai_analysis_created_at" ON "ai_analysis" ("created_at");

/* Foreign Keys (with ON DELETE CASCADE where suitable for child records) */
ALTER TABLE "sessions"
  ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "xray_images"
  ADD FOREIGN KEY ("session_id") REFERENCES "sessions" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "annotations"
  ADD FOREIGN KEY ("xray_image_id") REFERENCES "xray_images" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  ADD FOREIGN KEY ("session_id") REFERENCES "sessions" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "session_conversations"
  ADD FOREIGN KEY ("session_id") REFERENCES "sessions" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "audio_voices"
  ADD FOREIGN KEY ("session_id") REFERENCES "sessions" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  ADD FOREIGN KEY ("conversation_id") REFERENCES "session_conversations" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ai_analysis"
  ADD FOREIGN KEY ("xray_image_id") REFERENCES "xray_images" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;


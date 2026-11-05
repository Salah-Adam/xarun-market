CREATE TABLE customers (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, salt TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE auth_sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, expires BIGINT NOT NULL);
--> statement-breakpoint
CREATE TABLE auth_attempts (id TEXT PRIMARY KEY, bucket BIGINT NOT NULL, attempts INTEGER NOT NULL);

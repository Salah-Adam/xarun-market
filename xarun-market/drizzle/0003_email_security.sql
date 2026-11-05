ALTER TABLE customers ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE customers ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE auth_sessions ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE email_tokens (token TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), purpose TEXT NOT NULL, expires BIGINT NOT NULL);
--> statement-breakpoint
CREATE TABLE legacy_order_owners (order_id TEXT PRIMARY KEY REFERENCES orders(id), email TEXT);

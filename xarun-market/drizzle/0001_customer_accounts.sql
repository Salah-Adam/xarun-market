ALTER TABLE orders ADD COLUMN user_id TEXT;
--> statement-breakpoint
CREATE INDEX orders_user_id ON orders(user_id);

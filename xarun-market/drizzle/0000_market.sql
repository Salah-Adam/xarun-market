CREATE TABLE orders (id TEXT PRIMARY KEY, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, customer TEXT NOT NULL, items TEXT NOT NULL, total INTEGER NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Received');
--> statement-breakpoint
CREATE TABLE admin (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, salt TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);

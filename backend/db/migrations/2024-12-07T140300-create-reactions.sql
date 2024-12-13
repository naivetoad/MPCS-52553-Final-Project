CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY,
    message_id INTEGER,
    user_id INTEGER,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(message_id, user_id, emoji)  -- Prevent duplicate reactions
);
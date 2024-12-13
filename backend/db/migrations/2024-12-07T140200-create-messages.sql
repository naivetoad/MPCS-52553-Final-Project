CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    channel_id INTEGER,
    user_id INTEGER,
    content TEXT NOT NULL,
    replies_to INTEGER DEFAULT NULL,  -- NULL for regular messages, message_id for replies
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (replies_to) REFERENCES messages(id)
);
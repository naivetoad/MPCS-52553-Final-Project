CREATE TABLE IF NOT EXISTS message_reads (
    user_id INTEGER,
    channel_id INTEGER,
    last_read_message_id INTEGER,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, channel_id),  -- One record per user per channel
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (channel_id) REFERENCES channels(id),
    FOREIGN KEY (last_read_message_id) REFERENCES messages(id)
);
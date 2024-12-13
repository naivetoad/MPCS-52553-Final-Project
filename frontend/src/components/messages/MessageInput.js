import React, { useState } from 'react';
import { authFetch } from '../../utils/api';

function MessageInput({ onSendMessage, channelId }) {  // Add channelId prop here
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() || !channelId) return;  // Check for channelId

        setIsSubmitting(true);
        try {
            await onSendMessage(message);
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="message-input">
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                    }
                }}
            />
            <button type="submit" disabled={isSubmitting || !message.trim()}>
                Send
            </button>
        </form>
    );
}

export default MessageInput;
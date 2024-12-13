import React from 'react';
import MessageItem from './MessageItem';
import '../../styles/messages.css';

function MessageList({ messages = [], channelId, onReplyClick }) {

  if (!messages.length) {
    return (
      <div className="message-list empty">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map(message => (
        <MessageItem 
          key={message.id} 
          message={message}
          channelId={channelId}
          onReplyClick={() => onReplyClick(message.id)}
        />
      ))}
    </div>
  );
}

export default MessageList;
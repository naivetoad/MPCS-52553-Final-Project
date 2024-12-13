import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../../utils/api';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import '../../styles/messages.css';

function ReplyThread({ messageId: propMessageId, channelId: propChannelId, onClose }) {
  const { channelId: urlChannelId, messageId: urlMessageId } = useParams();
  const channelId = propChannelId || urlChannelId;
  const messageId = propMessageId || urlMessageId;
  
  const [parentMessage, setParentMessage] = useState(null);
  const [replies, setReplies] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    if (!channelId || !messageId) return;

    const fetchParentMessage = async () => {
      try {
        const response = await authFetch(
          `http://127.0.0.1:5000/api/channels/${channelId}/messages/${messageId}`
        );
        if (response.ok) {
          const data = await response.json();
          setParentMessage(data);
          document.title = `Thread: ${data.content.substring(0, 30)}... - Belay`;
        }
      } catch (error) {
        console.error('Error fetching parent message:', error);
        setError('Failed to load parent message');
      }
    };

    const fetchReplies = async () => {
      try {
        const response = await authFetch(
          `http://127.0.0.1:5000/api/messages/${messageId}/replies`
        );
        if (response.ok) {
          const data = await response.json();
          setReplies(data);
        }
      } catch (error) {
        console.error('Error fetching replies:', error);
        setError('Failed to load replies');
      }
    };

    fetchParentMessage();
    fetchReplies();
    const pollInterval = setInterval(fetchReplies, 500);
    return () => clearInterval(pollInterval);
  }, [channelId, messageId]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(`/channels/${channelId}`);
    }
  };

  if (!channelId || !messageId) {
    return <div>Invalid thread</div>;
  }

  return (
    <div className="thread-container">
      {isMobile && (
        <button 
          className="mobile-nav-button"
          onClick={handleClose}
        >
          ← Back to Channel
        </button>
      )}
      {error && <div className="error-message">{error}</div>}

      {parentMessage && (
        <div className="thread-parent-message">
          <MessageItem 
            message={parentMessage} 
            channelId={channelId}
          />
        </div>
      )}

      <div className="thread-replies">
        {replies.map(reply => (
          <MessageItem 
            key={reply.id} 
            message={reply}
            channelId={channelId}
            isReply={true}
          />
        ))}
      </div>

      <div className="thread-input">
        <MessageInput 
          channelId={channelId} 
          replyTo={messageId}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  );
}

export default ReplyThread;
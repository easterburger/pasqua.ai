document.addEventListener('DOMContentLoaded', () => {
    const chatbox = document.getElementById('chatbox');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');

    function addMessageToChatbox(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

        const paragraphElement = document.createElement('p');
        // Basic check for HTML content - render as text if it looks like an error message
        if (typeof text === 'string' && (text.startsWith('<') || text.includes('Error:'))) {
            paragraphElement.textContent = text; // Render simple strings directly
        } else if (typeof text === 'string') {
             paragraphElement.textContent = text;
        }
        else {
            // If we expect markdown or complex HTML later, this needs proper sanitization/rendering
            paragraphElement.textContent = JSON.stringify(text); // Fallback for unexpected types
        }
        messageElement.appendChild(paragraphElement);

        chatbox.appendChild(messageElement);
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    async function handleSendMessage() {
        const messageText = chatInput.value.trim();
        if (messageText === '') {
            return;
        }

        addMessageToChatbox('user', messageText);
        chatInput.value = '';

        // Add a thinking indicator
        // const thinkingMessageId = `ai-thinking-${Date.now()}`; // Not strictly needed with current removal logic
        addMessageToChatbox('ai', 'Thinking...');
        const thinkingElement = chatbox.lastElementChild; // Get the "Thinking..." message

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText })
            });

            // Remove "Thinking..." message
            if (thinkingElement && thinkingElement.parentElement === chatbox && thinkingElement.textContent.includes('Thinking...')) {
                chatbox.removeChild(thinkingElement);
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // If response is not JSON, use text
                    errorData = { error: await response.text() || `HTTP error! status: ${response.status}` };
                }
                console.error('API Error:', errorData);
                addMessageToChatbox('ai', `Error: ${errorData.error || 'Failed to get response from server.'}`);
                return;
            }

            const data = await response.json();
            if (data.reply) {
                addMessageToChatbox('ai', data.reply);
            } else if (data.error) {
                addMessageToChatbox('ai', `Error: ${data.error}`);
            } else {
                addMessageToChatbox('ai', 'Received an empty response from the server.');
            }

        } catch (error) {
            console.error('Error sending message:', error);
             if (thinkingElement && thinkingElement.parentElement === chatbox && thinkingElement.textContent.includes('Thinking...')) {
                chatbox.removeChild(thinkingElement);
            }
            addMessageToChatbox('ai', `Sorry, I encountered an error: ${error.message}`);
        }
    }

    sendButton.addEventListener('click', handleSendMessage);

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleSendMessage();
        }
    });
});

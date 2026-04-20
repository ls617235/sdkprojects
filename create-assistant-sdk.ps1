$body = @{
    name = "智能小助手"
    description = "悬窗式智能对话助手"
    status = "public"
    pages = @(@{
        page_id = "main"
        name = "主组件"
        code = @"
<style>
.sdk-assistant-container * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.sdk-floating-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    z-index: 999998;
}

.sdk-floating-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 30px rgba(102, 126, 234, 0.7);
}

.sdk-floating-btn svg {
    width: 28px;
    height: 28px;
    fill: white;
    transition: transform 0.3s ease;
}

.sdk-floating-btn.active svg {
    transform: rotate(45deg);
}

.sdk-chat-window {
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 380px;
    height: 520px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 60px rgba(0, 0, 0, 0.2);
    display: none;
    flex-direction: column;
    overflow: hidden;
    z-index: 999999;
    animation: slideUp 0.3s ease;
}

.sdk-chat-window.show {
    display: flex;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.sdk-chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.sdk-chat-title {
    display: flex;
    align-items: center;
    gap: 10px;
}

.sdk-chat-title .avatar {
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sdk-chat-title h3 {
    font-size: 16px;
    font-weight: 600;
}

.sdk-chat-title span {
    font-size: 12px;
    opacity: 0.8;
}

.sdk-close-btn {
    width: 28px;
    height: 28px;
    background: rgba(255,255,255,0.2);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.sdk-close-btn:hover {
    background: rgba(255,255,255,0.3);
}

.sdk-close-btn svg {
    width: 14px;
    height: 14px;
    fill: white;
}

.sdk-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f7f8fa;
}

.sdk-message {
    margin-bottom: 16px;
    display: flex;
    gap: 10px;
}

.sdk-message.user {
    flex-direction: row-reverse;
}

.sdk-message-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
}

.sdk-message.bot .sdk-message-avatar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.sdk-message.user .sdk-message-avatar {
    background: #e8e8e8;
    color: #666;
}

.sdk-message-content {
    max-width: 70%;
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.5;
}

.sdk-message.bot .sdk-message-content {
    background: white;
    color: #333;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.sdk-message.user .sdk-message-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
}

.sdk-message-content a {
    color: #667eea;
    text-decoration: underline;
}

.sdk-typing-indicator {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
}

.sdk-typing-indicator span {
    width: 8px;
    height: 8px;
    background: #999;
    border-radius: 50%;
    animation: typing 1.4s infinite;
}

.sdk-typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.sdk-typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-8px); opacity: 1; }
}

.sdk-chat-input-area {
    padding: 16px;
    background: white;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
}

.sdk-chat-input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #e0e0e0;
    border-radius: 24px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
}

.sdk-chat-input:focus {
    border-color: #667eea;
}

.sdk-send-btn {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, opacity 0.2s;
}

.sdk-send-btn:hover {
    transform: scale(1.05);
}

.sdk-send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.sdk-send-btn svg {
    width: 20px;
    height: 20px;
    fill: white;
}

.sdk-welcome-message {
    text-align: center;
    padding: 40px 20px;
    color: #666;
}

.sdk-welcome-message .icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.sdk-welcome-message h4 {
    font-size: 18px;
    color: #333;
    margin-bottom: 8px;
}

.sdk-welcome-message p {
    font-size: 14px;
    line-height: 1.6;
}
</style>

<div class="sdk-assistant-container">
    <!-- 悬窗按钮 -->
    <button class="sdk-floating-btn" id="sdkAssistantBtn" onclick="toggleAssistant()">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
    </button>

    <!-- 聊天窗口 -->
    <div class="sdk-chat-window" id="sdkChatWindow">
        <div class="sdk-chat-header">
            <div class="sdk-chat-title">
                <div class="avatar">🤖</div>
                <div>
                    <h3>智能小助手</h3>
                    <span>随时为您服务</span>
                </div>
            </div>
            <button class="sdk-close-btn" onclick="toggleAssistant()">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        
        <div class="sdk-chat-messages" id="sdkMessages">
            <div class="sdk-welcome-message">
                <div class="icon">👋</div>
                <h4>您好！我是智能小助手</h4>
                <p>有什么可以帮您的吗？您可以输入任何问题，我会尽力为您解答。</p>
            </div>
        </div>
        
        <div class="sdk-chat-input-area">
            <input type="text" class="sdk-chat-input" id="sdkInput" placeholder="输入您的问题..." onkeypress="handleKeyPress(event)">
            <button class="sdk-send-btn" id="sdkSendBtn" onclick="sendMessage()">
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
        </div>
    </div>
</div>

<script>
function toggleAssistant() {
    var btn = document.getElementById('sdkAssistantBtn');
    var window = document.getElementById('sdkChatWindow');
    
    btn.classList.toggle('active');
    window.classList.toggle('show');
    
    if (window.classList.contains('show')) {
        document.getElementById('sdkInput').focus();
    }
}

function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    var input = document.getElementById('sdkInput');
    var message = input.value.trim();
    
    if (!message) return;
    
    var messagesContainer = document.getElementById('sdkMessages');
    
    // 添加用户消息
    addMessage(message, 'user');
    input.value = '';
    
    // 显示加载状态
    showTypingIndicator();
    
    // 模拟AI回复
    setTimeout(function() {
        hideTypingIndicator();
        var reply = generateReply(message);
        addMessage(reply, 'bot');
    }, 1000);
}

function addMessage(text, type) {
    var messagesContainer = document.getElementById('sdkMessages');
    
    // 移除欢迎消息
    var welcome = messagesContainer.querySelector('.sdk-welcome-message');
    if (welcome) welcome.remove();
    
    var avatar = type === 'bot' ? '🤖' : '👤';
    var messageHtml = '<div class="sdk-message ' + type + '">' +
        '<div class="sdk-message-avatar">' + avatar + '</div>' +
        '<div class="sdk-message-content">' + escapeHtml(text) + '</div>' +
    '</div>';
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
    var messagesContainer = document.getElementById('sdkMessages');
    var typingHtml = '<div class="sdk-message bot" id="sdkTyping">' +
        '<div class="sdk-message-avatar">🤖</div>' +
        '<div class="sdk-message-content">' +
            '<div class="sdk-typing-indicator">' +
                '<span></span><span></span><span></span>' +
            '</div>' +
        '</div>' +
    '</div>';
    messagesContainer.insertAdjacentHTML('beforeend', typingHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    var typing = document.getElementById('sdkTyping');
    if (typing) typing.remove();
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateReply(question) {
    var q = question.toLowerCase();
    
    if (q.indexOf('你好') !== -1 || q.indexOf('hi') !== -1 || q.indexOf('hello') !== -1) {
        return '您好！很高兴见到您！有什么我可以帮助您的吗？ 😊';
    }
    
    if (q.indexOf('帮助') !== -1 || q.indexOf('help') !== -1) {
        return '我可以帮您解答各种问题！比如：\n• 回答常见问题\n• 提供信息查询\n• 技术支持\n\n请告诉我您需要什么帮助！';
    }
    
    if (q.indexOf('谢谢') !== -1 || q.indexOf('thank') !== -1) {
        return '不客气！很高兴能帮到您！还有其他问题吗？ 🌟';
    }
    
    if (q.indexOf('名字') !== -1 || q.indexOf('叫什么') !== -1) {
        return '我是智能小助手！您可以叫我"小助"或者"助手"都可以哦～ 🤖';
    }
    
    if (q.indexOf('时间') !== -1 || q.indexOf('现在几点') !== -1) {
        var now = new Date();
        return '现在是 ' + now.toLocaleString('zh-CN') + ' 📅';
    }
    
    var replies = [
        '这是个很好的问题！让我想想... 🤔',
        '感谢您的提问！我正在思考如何回答... 💭',
        '您的想法很有趣！让我为您详细解答... ✨',
        '好的，我明白了！这是我的回答... 🌈',
        '非常感谢您的询问！以下是相关信息... 📚'
    ];
    
    return replies[Math.floor(Math.random() * replies.length)] + '\n\n（这是一条模拟回复，实际使用时可以对接真实的AI服务）';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('[SDK] 智能小助手已加载');
});
</script>
"@
        is_default = $true
    })
    config = @{ type = "pure"; name = "智能小助手" }
}

$json = $body | ConvertTo-Json -Depth 15
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/sdk" -Method POST -Body $json -ContentType "application/json" -TimeoutSec 60
$response | ConvertTo-Json -Depth 5
-- ============================================
-- SDK Share Platform - 完整数据库 Schema
-- 支持用户系统、API Key 认证、应用管理
-- ============================================

-- ==========================================
-- 1. 用户表
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(32) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user',  -- user, admin
    status VARCHAR(20) DEFAULT 'active',  -- active, disabled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ==========================================
-- 2. API Key 表
-- ==========================================
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,           -- Key 名称
    key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA256(key)
    key_prefix VARCHAR(8) NOT NULL,       -- Key 前缀（用于展示：sk_xxxx）
    permissions JSONB DEFAULT '["read", "write"]',  -- 权限列表
    rate_limit INTEGER DEFAULT 1000,      -- 每小时请求限制
    usage_count BIGINT DEFAULT 0,         -- 累计使用次数
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,               -- 过期时间（NULL 永不过期）
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ==========================================
-- 3. 应用/场景表
-- ==========================================
CREATE TABLE IF NOT EXISTS apps (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,           -- 应用名称
    description TEXT,                     -- 应用描述
    scene VARCHAR(50),                    -- 场景类型：float_button, modal, embed, custom
    status VARCHAR(20) DEFAULT 'active',  -- active, disabled
    config JSONB DEFAULT '{}',            -- 应用配置
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_user ON apps(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_scene ON apps(scene);

-- ==========================================
-- 4. SDK 主表（关联应用）
-- ==========================================
CREATE TABLE IF NOT EXISTS sdk_shares (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) REFERENCES apps(id) ON DELETE CASCADE,
    user_id VARCHAR(32) REFERENCES users(id) ON DELETE CASCADE,  -- 可为空，兼容匿名创建
    name VARCHAR(255) NOT NULL,
    description TEXT,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    config JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT TRUE,  -- 是否公开
    status VARCHAR(20) DEFAULT 'active',
    view_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdk_shares_token ON sdk_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_sdk_shares_user ON sdk_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_sdk_shares_app ON sdk_shares(app_id);

-- ==========================================
-- 5. SDK 页面表
-- ==========================================
CREATE TABLE IF NOT EXISTS sdk_pages (
    id VARCHAR(32) PRIMARY KEY,
    sdk_id VARCHAR(32) NOT NULL REFERENCES sdk_shares(id) ON DELETE CASCADE,
    page_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code TEXT NOT NULL,
    page_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sdk_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_sdk_pages_sdk_id ON sdk_pages(sdk_id);
CREATE INDEX IF NOT EXISTS idx_sdk_pages_order ON sdk_pages(sdk_id, page_order);

-- ==========================================
-- 6. 使用日志表（可选，用于统计分析）
-- ==========================================
CREATE TABLE IF NOT EXISTS usage_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL,
    api_key_id VARCHAR(32) REFERENCES api_keys(id) ON DELETE SET NULL,
    sdk_id VARCHAR(32) REFERENCES sdk_shares(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,          -- embed, download, api_call
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);

-- ==========================================
-- 触发器：自动更新 updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用到所有需要的表
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;
CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON apps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sdk_shares_updated_at ON sdk_shares;
CREATE TRIGGER update_sdk_shares_updated_at BEFORE UPDATE ON sdk_shares FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sdk_pages_updated_at ON sdk_pages;
CREATE TRIGGER update_sdk_pages_updated_at BEFORE UPDATE ON sdk_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 7. 模型配置表
-- ==========================================
CREATE TABLE IF NOT EXISTS model_configs (
    id VARCHAR(32) PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL,       -- 模型实际调用 ID
    name VARCHAR(100) NOT NULL,           -- 显示名称
    description TEXT,                     -- 描述
    provider VARCHAR(50) DEFAULT 'custom',-- 提供商：doubao, deepseek, kimi, custom
    api_endpoint VARCHAR(500),            -- 自定义 API 端点
    api_key_env VARCHAR(100),             -- API Key 环境变量名
    system_prompt TEXT,                   -- 系统提示词（定义AI角色和行为）
    config JSONB DEFAULT '{}',            -- 其他配置
    is_default BOOLEAN DEFAULT FALSE,     -- 是否默认模型
    is_active BOOLEAN DEFAULT TRUE,       -- 是否启用
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_configs_provider ON model_configs(provider);
CREATE INDEX IF NOT EXISTS idx_model_configs_default ON model_configs(is_default);

DROP TRIGGER IF EXISTS update_model_configs_updated_at ON model_configs;
CREATE TRIGGER update_model_configs_updated_at BEFORE UPDATE ON model_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 8. 重构文件表
-- ==========================================
CREATE TABLE IF NOT EXISTS refactor_files (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,           -- 文件名称
    description TEXT,                     -- 描述
    html TEXT NOT NULL,                   -- 重构后的 HTML
    css TEXT NOT NULL,                    -- 重构后的 CSS
    js TEXT NOT NULL,                     -- 重构后的 JavaScript
    original_code TEXT,                   -- 原始代码
    original_framework VARCHAR(20),       -- 原始框架：react, vue
    model VARCHAR(100),                   -- 使用的模型
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refactor_files_created ON refactor_files(created_at);

DROP TRIGGER IF EXISTS update_refactor_files_updated_at ON refactor_files;
CREATE TRIGGER update_refactor_files_updated_at BEFORE UPDATE ON refactor_files FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 9. AI助手SDK表
-- ==========================================
-- AI助手配置（一个SDK可关联一个AI助手）
CREATE TABLE IF NOT EXISTS ai_agents (
    id VARCHAR(32) PRIMARY KEY,
    sdk_id VARCHAR(32) REFERENCES sdk_shares(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,              -- 助手名称
    avatar VARCHAR(500),                      -- 助手头像
    greeting TEXT,                           -- 欢迎语
    description TEXT,                        -- 助手描述
    model VARCHAR(100),                      -- AI模型（如 deepseek, kimi）
    system_prompt TEXT,                      -- 系统提示词
    config JSONB DEFAULT '{}',               -- 额外配置：按钮样式、主题色等
    is_active BOOLEAN DEFAULT TRUE,         -- 是否启用
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_sdk ON ai_agents(sdk_id);

DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 10. AI对话会话表
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_sessions (
    id VARCHAR(32) PRIMARY KEY,
    agent_id VARCHAR(32) NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    session_token VARCHAR(64) UNIQUE NOT NULL,  -- 会话Token（用于验证）
    user_name VARCHAR(100),                      -- 用户名（第三方透传）
    user_id VARCHAR(100),                       -- 用户标识
    client_ip VARCHAR(45),                      -- 客户端IP
    user_agent TEXT,                            -- 浏览器UA
    last_message_at TIMESTAMPTZ,                -- 最后消息时间
    status VARCHAR(20) DEFAULT 'active',       -- active, closed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_agent ON ai_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_token ON ai_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(user_id);

-- ==========================================
-- 11. AI对话消息表
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_messages (
    id VARCHAR(32) PRIMARY KEY,
    session_id VARCHAR(32) NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,               -- user, assistant, system
    content TEXT NOT NULL,                   -- 消息内容
    message_token VARCHAR(64) UNIQUE NOT NULL,  -- 消息Token（用于追踪）
    metadata JSONB DEFAULT '{}',             -- 额外数据：模型、耗时等
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_token ON ai_messages(message_token);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages(created_at);

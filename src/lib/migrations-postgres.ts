/**
 * PostgreSQL Migrations for Vercel deployment
 * Converted from SQLite schema and migrations
 */

import { query } from './db-postgres';
import { logger } from './logger';

type Migration = {
  id: string;
  up: () => Promise<void>;
};

const migrations: Migration[] = [
  {
    id: '001_init',
    up: async () => {
      await query(`
        -- Tasks Table - Core Kanban task management
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'inbox',
          priority TEXT NOT NULL DEFAULT 'medium',
          assigned_to TEXT,
          created_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          due_date TIMESTAMPTZ,
          estimated_hours INTEGER,
          actual_hours INTEGER,
          tags JSONB,
          metadata JSONB,
          workspace_id INTEGER NOT NULL DEFAULT 1
        );

        -- Agents Table - Squad management
        CREATE TABLE IF NOT EXISTS agents (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
          session_key TEXT UNIQUE,
          soul_content TEXT,
          status TEXT NOT NULL DEFAULT 'offline',
          last_seen TIMESTAMPTZ,
          last_activity TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          config JSONB,
          workspace_id INTEGER NOT NULL DEFAULT 1
        );

        -- Comments Table - Task discussion threads
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          author TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          parent_id INTEGER REFERENCES comments(id) ON DELETE SET NULL,
          mentions JSONB,
          workspace_id INTEGER NOT NULL DEFAULT 1
        );

        -- Activities Table - Real-time activity stream
        CREATE TABLE IF NOT EXISTS activities (
          id SERIAL PRIMARY KEY,
          type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          actor TEXT NOT NULL,
          description TEXT NOT NULL,
          data JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          workspace_id INTEGER NOT NULL DEFAULT 1
        );

        -- Notifications Table - @mentions and alerts
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          recipient TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          source_type TEXT,
          source_id INTEGER,
          read_at TIMESTAMPTZ,
          delivered_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          workspace_id INTEGER NOT NULL DEFAULT 1
        );

        -- Task Subscriptions - who follows which tasks
        CREATE TABLE IF NOT EXISTS task_subscriptions (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          agent_name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          workspace_id INTEGER NOT NULL DEFAULT 1,
          UNIQUE(task_id, agent_name)
        );

        -- Standup reports archive
        CREATE TABLE IF NOT EXISTS standup_reports (
          date TEXT PRIMARY KEY,
          report JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          workspace_id INTEGER NOT NULL DEFAULT 1
        );

        -- Gateway health logs
        CREATE TABLE IF NOT EXISTS gateway_health_logs (
          id SERIAL PRIMARY KEY,
          gateway_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          latency INTEGER,
          probed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          error TEXT
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
        CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
        CREATE INDEX IF NOT EXISTS idx_comments_workspace_id ON comments(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
        CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
        CREATE INDEX IF NOT EXISTS idx_activities_workspace_id ON activities(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_agents_session_key ON agents(session_key);
        CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
        CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_task_subscriptions_task_id ON task_subscriptions(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_subscriptions_agent_name ON task_subscriptions(agent_name);
        CREATE INDEX IF NOT EXISTS idx_standup_reports_created_at ON standup_reports(created_at);
        CREATE INDEX IF NOT EXISTS idx_gateway_health_logs_gateway_id ON gateway_health_logs(gateway_id);
        CREATE INDEX IF NOT EXISTS idx_gateway_health_logs_probed_at ON gateway_health_logs(probed_at);
      `);
      logger.info('PostgreSQL migration 001_init completed');
    },
  },
  {
    id: '002_quality_reviews',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS quality_reviews (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          reviewer TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          workspace_id INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_task_id ON quality_reviews(task_id);
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_reviewer ON quality_reviews(reviewer);
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_workspace_id ON quality_reviews(workspace_id);
      `);
      logger.info('PostgreSQL migration 002_quality_reviews completed');
    },
  },
  {
    id: '003_messages',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          from_agent TEXT NOT NULL,
          to_agent TEXT,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          metadata JSONB,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          workspace_id INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_agents ON messages(from_agent, to_agent);
        CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON messages(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);
      `);
      logger.info('PostgreSQL migration 003_messages completed');
    },
  },
  {
    id: '004_users',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'operator',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMPTZ,
          workspace_id INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          token TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_address TEXT,
          user_agent TEXT,
          workspace_id INTEGER NOT NULL DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_workspace_id ON user_sessions(workspace_id);
      `);
      logger.info('PostgreSQL migration 004_users completed');
    },
  },
  {
    id: '005_audit_log',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id SERIAL PRIMARY KEY,
          action TEXT NOT NULL,
          actor TEXT NOT NULL,
          actor_id INTEGER,
          target_type TEXT,
          target_id INTEGER,
          detail JSONB,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor);
        CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
      `);
      logger.info('PostgreSQL migration 005_audit_log completed');
    },
  },
  {
    id: '006_webhooks',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          secret TEXT,
          events JSONB NOT NULL DEFAULT '["*"]',
          enabled BOOLEAN NOT NULL DEFAULT true,
          last_fired_at TIMESTAMPTZ,
          last_status INTEGER,
          consecutive_failures INTEGER NOT NULL DEFAULT 0,
          created_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS webhook_deliveries (
          id SERIAL PRIMARY KEY,
          webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status_code INTEGER,
          response_body TEXT,
          error TEXT,
          duration_ms INTEGER,
          attempt INTEGER NOT NULL DEFAULT 0,
          next_retry_at TIMESTAMPTZ,
          is_retry BOOLEAN NOT NULL DEFAULT false,
          parent_delivery_id INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);
      `);
      logger.info('PostgreSQL migration 006_webhooks completed');
    },
  },
  {
    id: '007_settings',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL DEFAULT 'general',
          updated_by TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
      `);
      logger.info('PostgreSQL migration 007_settings completed');
    },
  },
  {
    id: '008_tenants_workspaces',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS workspaces (
          id SERIAL PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tenants (
          id SERIAL PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          linux_user TEXT NOT NULL UNIQUE,
          plan_tier TEXT NOT NULL DEFAULT 'standard',
          status TEXT NOT NULL DEFAULT 'pending',
          openclaw_home TEXT NOT NULL,
          workspace_root TEXT NOT NULL,
          gateway_port INTEGER,
          dashboard_port INTEGER,
          config JSONB NOT NULL DEFAULT '{}',
          created_by TEXT NOT NULL DEFAULT 'system',
          owner_gateway TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS provision_jobs (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          job_type TEXT NOT NULL DEFAULT 'bootstrap',
          status TEXT NOT NULL DEFAULT 'queued',
          dry_run BOOLEAN NOT NULL DEFAULT true,
          requested_by TEXT NOT NULL DEFAULT 'system',
          approved_by TEXT,
          runner_host TEXT,
          idempotency_key TEXT,
          request_json JSONB NOT NULL DEFAULT '{}',
          plan_json JSONB NOT NULL DEFAULT '[]',
          result_json JSONB,
          error_text TEXT,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS provision_events (
          id SERIAL PRIMARY KEY,
          job_id INTEGER NOT NULL REFERENCES provision_jobs(id) ON DELETE CASCADE,
          level TEXT NOT NULL DEFAULT 'info',
          step_key TEXT,
          message TEXT NOT NULL,
          data JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Insert default workspace
        INSERT INTO workspaces (id, slug, name, created_at, updated_at)
        VALUES (1, 'default', 'Default Workspace', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;

        CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
        CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
        CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
        CREATE INDEX IF NOT EXISTS idx_tenants_owner_gateway ON tenants(owner_gateway);
        CREATE INDEX IF NOT EXISTS idx_provision_jobs_tenant_id ON provision_jobs(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_provision_jobs_status ON provision_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_provision_jobs_created_at ON provision_jobs(created_at);
        CREATE INDEX IF NOT EXISTS idx_provision_events_job_id ON provision_events(job_id);
        CREATE INDEX IF NOT EXISTS idx_provision_events_created_at ON provision_events(created_at);
      `);
      logger.info('PostgreSQL migration 008_tenants_workspaces completed');
    },
  },
  {
    id: '009_auth_google',
    up: async () => {
      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'local';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_user_id TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

        UPDATE users SET provider = 'local' WHERE provider IS NULL OR provider = '';
        UPDATE users SET is_approved = true WHERE is_approved IS NULL;

        CREATE TABLE IF NOT EXISTS access_requests (
          id SERIAL PRIMARY KEY,
          provider TEXT NOT NULL DEFAULT 'google',
          email TEXT NOT NULL,
          provider_user_id TEXT,
          display_name TEXT,
          avatar_url TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          attempt_count INTEGER NOT NULL DEFAULT 1,
          reviewed_by TEXT,
          reviewed_at TIMESTAMPTZ,
          review_note TEXT,
          approved_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_email_provider ON access_requests(email, provider);
        CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
        CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);
      logger.info('PostgreSQL migration 009_auth_google completed');
    },
  },
  {
    id: '010_additional_tables',
    up: async () => {
      await query(`
        -- Workflow templates
        CREATE TABLE IF NOT EXISTS workflow_templates (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          model TEXT NOT NULL DEFAULT 'sonnet',
          task_prompt TEXT NOT NULL,
          timeout_seconds INTEGER NOT NULL DEFAULT 300,
          agent_role TEXT,
          tags JSONB,
          created_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMPTZ,
          use_count INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_workflow_templates_name ON workflow_templates(name);

        -- Alert rules
        CREATE TABLE IF NOT EXISTS alert_rules (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          enabled BOOLEAN NOT NULL DEFAULT true,
          entity_type TEXT NOT NULL,
          condition_field TEXT NOT NULL,
          condition_operator TEXT NOT NULL,
          condition_value TEXT NOT NULL,
          action_type TEXT NOT NULL DEFAULT 'notification',
          action_config JSONB NOT NULL DEFAULT '{}',
          cooldown_minutes INTEGER NOT NULL DEFAULT 60,
          last_triggered_at TIMESTAMPTZ,
          trigger_count INTEGER NOT NULL DEFAULT 0,
          created_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);

        -- Workflow pipelines
        CREATE TABLE IF NOT EXISTS workflow_pipelines (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          steps JSONB NOT NULL DEFAULT '[]',
          created_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          use_count INTEGER NOT NULL DEFAULT 0,
          last_used_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS pipeline_runs (
          id SERIAL PRIMARY KEY,
          pipeline_id INTEGER NOT NULL REFERENCES workflow_pipelines(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending',
          current_step INTEGER NOT NULL DEFAULT 0,
          steps_snapshot JSONB NOT NULL DEFAULT '[]',
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          triggered_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pipeline_id ON pipeline_runs(pipeline_id);
        CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);

        -- Claude sessions
        CREATE TABLE IF NOT EXISTS claude_sessions (
          id SERIAL PRIMARY KEY,
          session_id TEXT NOT NULL UNIQUE,
          project_slug TEXT NOT NULL,
          project_path TEXT,
          model TEXT,
          git_branch TEXT,
          user_messages INTEGER NOT NULL DEFAULT 0,
          assistant_messages INTEGER NOT NULL DEFAULT 0,
          tool_uses INTEGER NOT NULL DEFAULT 0,
          input_tokens INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0,
          estimated_cost REAL NOT NULL DEFAULT 0,
          first_message_at TIMESTAMPTZ,
          last_message_at TIMESTAMPTZ,
          last_user_prompt TEXT,
          is_active BOOLEAN NOT NULL DEFAULT false,
          scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_claude_sessions_active ON claude_sessions(is_active) WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_claude_sessions_project ON claude_sessions(project_slug);

        -- Token usage
        CREATE TABLE IF NOT EXISTS token_usage (
          id SERIAL PRIMARY KEY,
          model TEXT NOT NULL,
          session_id TEXT NOT NULL,
          input_tokens INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_token_usage_session_id ON token_usage(session_id);
        CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);
        CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage(model);

        -- Direct connections
        CREATE TABLE IF NOT EXISTS direct_connections (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          tool_name TEXT NOT NULL,
          tool_version TEXT,
          connection_id TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'connected',
          last_heartbeat TIMESTAMPTZ,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_direct_connections_agent_id ON direct_connections(agent_id);
        CREATE INDEX IF NOT EXISTS idx_direct_connections_connection_id ON direct_connections(connection_id);
        CREATE INDEX IF NOT EXISTS idx_direct_connections_status ON direct_connections(status);

        -- GitHub sync
        CREATE TABLE IF NOT EXISTS github_syncs (
          id SERIAL PRIMARY KEY,
          repo TEXT NOT NULL,
          last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          issue_count INTEGER NOT NULL DEFAULT 0,
          sync_direction TEXT NOT NULL DEFAULT 'inbound',
          status TEXT NOT NULL DEFAULT 'success',
          error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_github_syncs_repo ON github_syncs(repo);
        CREATE INDEX IF NOT EXISTS idx_github_syncs_created_at ON github_syncs(created_at);
      `);
      logger.info('PostgreSQL migration 010_additional_tables completed');
    },
  },
];

/**
 * Run all pending migrations
 */
export async function runPostgresMigrations() {
  const isTestMode = process.env.MISSION_CONTROL_TEST_MODE === '1';
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  if (isBuildPhase || isTestMode) {
    return;
  }

  try {
    // Check if migrations table exists
    await query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        migration_id TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get applied migrations
    const applied = await query<{ migration_id: string }>(
      'SELECT migration_id FROM _migrations ORDER BY id'
    );
    const appliedIds = new Set(applied.map((r) => r.migration_id));

    // Run pending migrations
    for (const migration of migrations) {
      if (!appliedIds.has(migration.id)) {
        logger.info({ migration: migration.id }, 'Running PostgreSQL migration');
        await migration.up();
        await query('INSERT INTO _migrations (migration_id) VALUES ($1)', [migration.id]);
      }
    }

    logger.info('PostgreSQL migrations completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'PostgreSQL migration failed');
    throw error;
  }
}

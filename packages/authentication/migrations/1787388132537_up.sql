CREATE TABLE IF NOT EXISTS sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade ,
    ip_address varchar(45),
    user_agent text,
    refresh_token_hash varchar(255) unique not null,
    expires_at timestamp not null ,
    revoked_at timestamp,
    d_at timestamp default now() not null ,
    updated_at timestamp default now() not null
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash);


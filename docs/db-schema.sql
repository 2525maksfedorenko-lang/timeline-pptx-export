-- projects
CREATE TABLE projects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(255) NOT NULL,
    scale         VARCHAR(10) NOT NULL DEFAULT 'weeks' CHECK (scale IN ('days','weeks','months')),
    owner_id      UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- tasks
CREATE TABLE tasks (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id          UUID REFERENCES tasks(id) ON DELETE CASCADE,
    label              VARCHAR(255) NOT NULL,
    start_date         DATE NOT NULL,
    end_date           DATE NOT NULL,
    progress           SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    group_name         VARCHAR(255),
    color              VARCHAR(7),
    milestone          BOOLEAN NOT NULL DEFAULT false,
    sort_order         INTEGER NOT NULL DEFAULT 0,
    include_in_export  BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date),
    CHECK (parent_id != id)
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX idx_tasks_dates ON tasks(start_date, end_date);

-- task_dependencies
CREATE TABLE task_dependencies (
    task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id  UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

-- task_comments
CREATE TABLE task_comments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    body          TEXT NOT NULL,
    is_pinned     BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id, created_at DESC);

-- export_settings
CREATE TABLE export_settings (
    project_id         UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    theme              VARCHAR(50) DEFAULT 'default',
    show_progress      BOOLEAN NOT NULL DEFAULT true,
    show_dependencies  BOOLEAN NOT NULL DEFAULT false,
    scale              VARCHAR(10) NOT NULL DEFAULT 'weeks' CHECK (scale IN ('days','weeks','months')),
    comment_mode       VARCHAR(10) NOT NULL DEFAULT 'latest' CHECK (comment_mode IN ('latest','pinned','all','none'))
);

-- saved_plans (для локального хранения нескольких планов в браузере)
CREATE TABLE saved_plans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

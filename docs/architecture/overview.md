# 架构总览

## 1. 系统架构

```mermaid
flowchart TB
  subgraph client [Client]
    PWA["PWA 浏览器 / 主屏幕<br/>Vite + React"]
  end

  subgraph prod [Production 腾讯云]
    Nginx["Nginx :80<br/>静态 dist + /api 反代"]
    API["Node API :3001<br/>Express"]
    PG[(PostgreSQL)]
    Nginx --> API
    API --> PG
  end

  subgraph local [Local dev]
    Vite["Vite :5173"]
    NodeDev["server npm run dev :3001"]
    PGlocal[(PostgreSQL :5432)]
    Vite --> NodeDev
    NodeDev --> PGlocal
  end

  PWA --> Nginx
```

## 2. 用户主流程

```mermaid
flowchart LR
  reg[注册/登录] --> profile[身体资料 BMR/TDEE]
  profile --> log[记录运动/饮食]
  log --> deficit[查看当日缺口]
  deficit --> wall[打卡墙/日历]
  wall --> community[社区动态 可选]
```

## 3. 数据模型（核心表）

```mermaid
erDiagram
  users ||--o| profiles : has
  users ||--o{ day_logs : owns
  day_logs ||--o{ exercises : contains
  day_logs ||--o{ meals : contains
  users ||--o{ exercise_templates : has
  users ||--o{ meal_templates : has
  users ||--o{ follows : social
  day_logs ||--o{ day_likes : social
  day_logs ||--o{ day_comments : social
```

另有：`community_member_order`、`log_item_reactions` 等，见 `server/migrations/`。

## 4. 贡献者工作流

```mermaid
sequenceDiagram
  participant Dev as Contributor
  participant Cursor as Cursor_rules
  participant GH as GitHub
  participant Owner as DavidZhan23

  Dev->>Cursor: 模糊需求
  Cursor->>Dev: 澄清 + milestone 文档
  Dev->>Cursor: 实现 + 本地 smoke
  Cursor->>Dev: confirm 摘要
  Dev->>Cursor: go
  Cursor->>GH: push feat + draft PR
  GH->>GH: CI lint/typecheck/build
  Dev->>GH: mark ready
  Owner->>GH: merge main
  Note over GH: Deploy 可选 owner 已启用
```

详见 [deploy-pipeline.md](deploy-pipeline.md) 与 [../CONTRIBUTING.md](../../CONTRIBUTING.md)。

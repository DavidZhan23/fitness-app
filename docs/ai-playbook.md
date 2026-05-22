# AI 协作手册（Cursor + 本项目 rules）

## 你说一句模糊需求时，AI 应该做什么

1. **规划**（`01-planning-clarify`）：最多 5 个澄清问题 + 边界清单 → 写 `docs/milestones/<slug>.md`
2. **实现**（`02-coding`）：按 milestone 改代码，本地 `lint` + `tsc`，卡两次则复盘
3. **确认闸门**（`03-commit-and-push`）：输出 confirm 摘要，**等你回复 `go`**
4. **提交**（`scripts/ai-flow.sh`）：commit → push `feat/*` → draft PR → 打印 CI 链接

## AI 不应该做什么

- 未经确认就 `git commit` / `git push`
- push 到 `main`
- 在 PR 未合并前在同一分支堆无关功能
- 把 Secret 写进代码或文档
- 替 owner 配置生产 SSH / GitHub Secrets

## 常用命令

```bash
# 开分支 + milestone 骨架
bash scripts/new-feature.sh my-feature

# 实现完成后（先本地 lint/build）
bash scripts/ai-flow.sh --message "feat(scope): description"
```

## 看 CI 进度（Cursor 内）

1. 终端里 **Cmd+Click** `ai-flow.sh` 打印的 PR / Actions / Run 链接
2. 或按 Enter 跑 `gh run watch`
3. **CD 部署**只有 owner merge 到 `main` 后才会跑；你看 Actions → Deploy 或 README Deploy 徽章

## Owner 配自动部署

Owner 在 Cursor 说「帮我配自动部署」，或读 [owner-setup-guide.md](architecture/owner-setup-guide.md)。

## Fork 贡献者

`ai-flow.sh` 默认 collaborator 路径。Fork 用户见根目录 [CONTRIBUTING.md](../CONTRIBUTING.md)。

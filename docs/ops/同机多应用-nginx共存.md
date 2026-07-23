# 同机多应用共存（健身 App + 另一站点）

> 健身 App 默认由 Docker `web` 容器占用宿主机 **80** 端口。
> 若另一应用也要用 80（常见：宿主机 nginx / OpenCloudOS 默认站点），二选一。

## 方案 A（推荐）：健身 App 继续占 80，另一应用用其它端口

例如另一应用监听 `8081` / `3000`，互不影响。升级后请保持：

```bash
systemctl stop nginx
systemctl disable nginx
```

避免宿主机 nginx 再次抢走 80。

## 方案 B：宿主机 nginx 占 80，按路径/域名反代到健身 App

1. 在服务器 `deploy/.env` 增加：

```env
WEB_HOST_PORT=8080
```

2. 重建 web：

```bash
cd /opt/fitness-app/deploy
docker compose up -d --force-recreate web
```

3. 宿主机 nginx 增加类似配置（路径示例，按你的另一应用调整）：

```nginx
# 健身 App（前端 + /api）
server {
    listen 80;
    server_name 你的公网IP或健身域名;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 2m;
    }

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 另一应用用不同 server_name 或不同 location
```

4. 重载宿主机 nginx：

```bash
nginx -t && systemctl reload nginx
```

前端构建时的 `VITE_API_URL` 仍应为 `http://公网IP/api`（走 80 上的反代），一般无需改。

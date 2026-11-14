# 腾讯云轻量服务器部署

这份说明给维护者自己用：把 CareerDesk 跑在一台长期在线的轻量应用服务器上，手机和电脑打开同一个地址改同一份数据。

开源交付物仍然是 Git 仓库。这里不提供账号、不把 3000 端口对公网开放，也不把仓库变成公开网站。程序没有登录，谁能打开地址谁就能改档案。

## 目录

| 路径 | 内容 |
| --- | --- |
| `/opt/careerdesk` | 代码，只从 GitHub 的 `main` 更新 |
| `/var/lib/careerdesk` | `careerdesk.sqlite` 与备份，不放进仓库 |

轻量控制台的防火墙只放行 22。不要放行 3000。

## 分支

`main` 是可以部署的分支。服务器只拉取这个分支，不在服务器上改代码，也不在服务器上建分支。

功能从 `main` 拉出，例如 `feat/resume-sheet`。本地验证后合并回 `main`，再在服务器上更新。已经推送的 `main` 不要强行改写历史。

一次部署成功后打标签，例如 `v0.2.0`。需要退回时在服务器上检出该标签，重新安装依赖并构建。数据目录保持不动。

## 首次安装

系统使用 Ubuntu 22.04，Node.js 20。内存 2GB 时，先加 2GB swap，再执行构建。

```bash
sudo adduser --disabled-password --gecos "" careerdesk
sudo mkdir -p /opt/careerdesk /var/lib/careerdesk
sudo chown careerdesk:careerdesk /opt/careerdesk /var/lib/careerdesk

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential python3

sudo -u careerdesk -H bash -lc '
  git clone https://github.com/harveychen6/enterprise-ai-workspace.git /opt/careerdesk
  cd /opt/careerdesk
  git checkout main
  npm ci
'
```

`/opt/careerdesk/.env.local` 只留在服务器上：

```bash
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=deepseek-chat
DATA_DIR=/var/lib/careerdesk
```

```bash
sudo chown careerdesk:careerdesk /opt/careerdesk/.env.local
sudo chmod 600 /opt/careerdesk/.env.local
sudo -u careerdesk -H bash -lc 'cd /opt/careerdesk && npm run build'
```

`/etc/systemd/system/careerdesk.service`：

```ini
[Unit]
Description=CareerDesk
After=network.target

[Service]
User=careerdesk
WorkingDirectory=/opt/careerdesk
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- --hostname 127.0.0.1 --port 3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now careerdesk
```

本机已有数据时，用侧栏导出 JSON，再在服务器页面导入。不要把本机 `data/` 目录提交进 Git。

## 访问

轻量服务器、手机和电脑安装 Tailscale，登录同一个账号。在服务器上执行 `tailscale ip -4`，得到 `100.x.x.x`。

Tailscale 流量不经过腾讯云防火墙。系统防火墙上允许这张网卡访问 3000，然后让进程监听所有网卡：

```bash
sudo ufw allow OpenSSH
sudo ufw allow in on tailscale0 to any port 3000 proto tcp
sudo ufw enable
```

把服务里的 `--hostname 127.0.0.1` 改成 `--hostname 0.0.0.0`，执行 `sudo systemctl restart careerdesk`。浏览器打开 `http://100.x.x.x:3000`。

更换密钥后重启同一服务。

## 更新

```bash
sudo systemctl stop careerdesk
sudo -u careerdesk -H bash -lc '
  cd /opt/careerdesk
  git fetch origin
  git checkout main
  git pull --ff-only origin main
  npm ci
  npm test
  npm run build
'
sudo systemctl start careerdesk
```

`git pull --ff-only` 不能快进时，先停止，不要在服务器上合并。`/var/lib/careerdesk` 不要删除。表结构由仓库里的 SQL 迁移在启动时升级。

发布前打包该目录，并在页面里再导出一份 JSON。

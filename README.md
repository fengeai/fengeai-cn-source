# fengeai.cn source

This repository contains the current server-side source snapshot for `fengeai.cn`.

## Services

- `fenge_upload_service`: main site, upload API, student works static hosting, and the shared Nginx entry config.
- `fenge_wechat_format`: `/wechat/` article formatting tool.
- `fenge_assistant`: `/assistant/` AI assistant service. The frontend is currently preserved as the deployed `dist/` artifact because the original frontend source was not present on the server.

## Production paths

The snapshot was pulled from these server directories:

- `/root/projects/fenge_upload_service`
- `/root/projects/fenge_wechat_format`
- `/root/projects/fenge_assistant`

The live Docker containers are:

- `fenge_uploader`
- `fenge_wechat`
- `fenge_assistant`
- `fenge_nginx`

## Secrets

Runtime `.env` files, certificates, uploaded student works, `node_modules`, zip deploy packages, and backup directories are intentionally excluded from Git.

Create per-service `.env` files from the included `.env.example` files before deploying.

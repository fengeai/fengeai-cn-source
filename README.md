# fengeai.cn source

This repository contains the current server-side source snapshot for `fengeai.cn`.

## Services

- `fenge_upload_service`: main site, upload API, student works static hosting, and the shared Nginx entry config.
- `fenge_wechat_format`: `/wechat/` article formatting tool.
- `fenge_video_creator`: `/video/` short video creation workflow.
- `content_factory/current`: current `/assistant/` content factory service.
- `fenge_assistant`: legacy assistant deployment snapshot kept for history.

## Production paths

The snapshot was pulled from these server directories:

- `/root/projects/fenge_upload_service`
- `/root/projects/fenge_wechat_format`
- `/root/projects/fenge_video_creator`
- `/root/projects/content_factory/current`

The live Docker containers are:

- `fenge_uploader`
- `fenge_wechat`
- `fenge_video_creator`
- `content_factory_web`
- `content_factory_api`
- `fenge_nginx`

## Secrets

Runtime `.env` files, certificates, uploaded student works, `node_modules`, zip deploy packages, and backup directories are intentionally excluded from Git.

Create per-service `.env` files from the included `.env.example` files before deploying.

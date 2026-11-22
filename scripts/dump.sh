#!/bin/sh
set -e
docker compose exec -T postgres pg_dump -U opsrag --no-owner --clean --if-exists opsrag | gzip -9 > data/dump.sql.gz
ls -lh data/dump.sql.gz

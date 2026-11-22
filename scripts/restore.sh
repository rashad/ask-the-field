#!/bin/sh
set -e
docker compose up -d --wait
gunzip -c data/dump.sql.gz | docker compose exec -T postgres psql -U opsrag -q -v ON_ERROR_STOP=1 opsrag > /dev/null
docker compose exec -T postgres psql -U opsrag -At -c "SELECT 'wells ' || count(*) FROM wells UNION ALL SELECT 'chunks ' || count(*) FROM chunks" opsrag

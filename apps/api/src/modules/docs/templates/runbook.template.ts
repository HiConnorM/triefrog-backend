import type { TemplateContext } from './readme.template';

export function generateRunbook(context: TemplateContext): string {
  const { projectName } = context;

  return `# Runbook — ${projectName}

> This runbook describes operational procedures for the ${projectName} platform. Keep it updated as the system evolves.

## Health Checks

### Service Health Endpoints

| Service | URL | Expected Response |
|---------|-----|-------------------|
| Gateway | \`GET /health\` | \`{ "status": "ok" }\` |
| Auth Service | \`GET /health\` | \`{ "status": "ok" }\` |
| Docs Service | \`GET /health\` | \`{ "status": "ok" }\` |
| Scanner Service | \`GET /health\` | \`{ "status": "ok" }\` |
| Graph Service | \`GET /health\` | \`{ "status": "ok" }\` |
| Check Service | \`GET /health\` | \`{ "status": "ok" }\` |

### Infrastructure Checks

\`\`\`bash
# Check PostgreSQL connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check Redis connectivity
redis-cli -u $REDIS_URL ping

# Check queue depths (BullMQ)
redis-cli -u $REDIS_URL llen "bull:docs:wait"
redis-cli -u $REDIS_URL llen "bull:scans:wait"
\`\`\`

## Restart Procedures

### Restart a Single Service

\`\`\`bash
# Railway
railway service restart <service-name>

# Docker Compose
docker compose restart <service-name>

# Kubernetes
kubectl rollout restart deployment/<service-name> -n triefrog
\`\`\`

### Full Platform Restart

\`\`\`bash
# Graceful restart (recommended)
docker compose down --timeout 30
docker compose up -d

# Force restart (last resort)
docker compose kill
docker compose up -d
\`\`\`

## Common Issues

### Issue: Gateway returns 502 Bad Gateway

**Symptoms:** Requests to the gateway return HTTP 502.

**Cause:** A downstream service is unavailable or unhealthy.

**Resolution:**
1. Check which service is failing: \`docker compose ps\`
2. Review logs: \`docker compose logs <service-name> --tail=100\`
3. Restart the failing service: \`docker compose restart <service-name>\`
4. If persists, check resource usage: \`docker stats\`

---

### Issue: BullMQ jobs stuck in waiting

**Symptoms:** Jobs enqueued but never processed. Queue depth rising.

**Cause:** Worker process crashed or Redis disconnected.

**Resolution:**
1. Check worker logs: \`docker compose logs docs-service --tail=200\`
2. Verify Redis connection: \`redis-cli ping\`
3. Restart the worker: \`docker compose restart docs-service\`
4. If jobs are stalled, clear stalled jobs:
   \`\`\`bash
   # Via BullMQ dashboard or CLI
   redis-cli -u $REDIS_URL del "bull:docs:stalled"
   \`\`\`

---

### Issue: Database connection pool exhausted

**Symptoms:** Errors like \`connection pool exhausted\` or \`too many clients\`.

**Cause:** Too many concurrent connections or a connection leak.

**Resolution:**
1. Check active connections: \`SELECT count(*) FROM pg_stat_activity;\`
2. Kill idle connections:
   \`\`\`sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';
   \`\`\`
3. Reduce Prisma pool size via \`DATABASE_URL\` params: \`?connection_limit=10\`

---

### Issue: High memory usage

**Symptoms:** Service OOM-killed or responding slowly.

**Resolution:**
1. Profile heap: Enable \`--inspect\` flag temporarily
2. Check for unprocessed queue accumulation
3. Scale horizontally: add another replica

---

### Issue: JWT authentication failures after secret rotation

**Symptoms:** 401 errors for all authenticated requests.

**Cause:** \`JWT_SECRET\` was rotated but old tokens are still in circulation.

**Resolution:**
1. Ensure new \`JWT_SECRET\` is deployed to all services simultaneously
2. Users will need to log in again to get new tokens
3. Consider a grace period with two valid secrets if zero-downtime is required

## Rollback Steps

### Code Rollback

\`\`\`bash
# 1. Identify the last good tag
git log --oneline --tags --simplify-by-decoration | head -10

# 2. Deploy the previous image
docker pull ghcr.io/triefrog/gateway:<previous-tag>
docker compose up -d --no-deps gateway

# Or via Railway
railway service rollback
\`\`\`

### Database Rollback

> Only perform a database rollback if schema changes are causing issues and no data migration has occurred.

\`\`\`bash
# List migrations
pnpm prisma migrate status

# Mark a migration as rolled back (schema only, no data recovery)
pnpm prisma migrate resolve --rolled-back <migration-name>

# Restore from backup (data recovery)
pg_restore -U $DB_USER -d $DB_NAME /path/to/backup.dump
\`\`\`

## Monitoring & Alerting

### Key Metrics to Watch

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|--------------------|
| HTTP error rate (5xx) | > 1% | > 5% |
| P95 response time | > 500ms | > 2000ms |
| Queue depth (docs) | > 100 | > 500 |
| CPU usage | > 70% | > 90% |
| Memory usage | > 80% | > 95% |
| DB connections | > 80% of limit | > 95% of limit |

### Useful Log Queries

\`\`\`bash
# All errors in the last hour
docker compose logs --since=1h | grep -i error

# Slow requests (>1s)
docker compose logs gateway | grep "duration" | awk '$NF > 1000'

# Failed BullMQ jobs
docker compose logs docs-service | grep "job failed"
\`\`\`

---

*Generated by [Triefrog](https://triefrog.dev)*
`;
}

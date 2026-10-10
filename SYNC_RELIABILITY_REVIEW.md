# Sync reliability review — 1.0.1281+325

The supplied source contains several independent causes of intermittent sync failure. This update fixes the Worker and the app together. No deployed Worker URL, production logs or deployment credentials were supplied, so this is a source and local database review, not a production uptime assessment.

## Causes and fixes

| Cause | Failure path | Fix |
| --- | --- | --- |
| Conflicts were removed from the outbox before pulling server history. | A timeout, expired session or server error during the pull discarded the durable payload/deletion intent. | Leave rejected operations queued until the complete pull and reconciliation succeed. Replace/discard them in a local database transaction. A failed pull leaves the cursor unchanged. |
| Only note edits were coalesced. Other records could send several mutations with the same base version. | Later edits/deletes conflicted with the device's own earlier write. An edit made while a request was in flight could miss the older operation's acknowledgement. | Coalesce every entity; upload legacy queues one mutation per entity per batch; use the attempted operation snapshot to advance newer pending edits after an acknowledgement. |
| Remote upserts could resurrect a pending local deletion. Conflict retries covered note deletes only. | Deleted finance records could reappear, or a rejected deletion could disappear from the queue. | Protect pending deletes for all entity types and rebase them against the actual pulled version. Respect remote note tombstones and preserve unattempted newer local mutations. |
| Refresh-token revocation and replacement issuance were separate writes. | A database failure or lost response invalidated the only refresh token known to the app. Concurrent refreshes could rotate the same session independently. | Commit issuance and rotation atomically. A deterministic replacement can be retrieved for two minutes while it remains active; logout, expiry, session reset and subsequent rotation prevent replay. Client callers share one refresh request. |
| Successful HTTP responses were trusted without validating their sync contents. | Missing receipts could leave a queue stuck; an unchanged cursor with `hasMore` could loop indefinitely. Repeated expired-token responses could recurse repeatedly. | Require a receipt/conflict for every submitted operation, validate ordered pull pages and cursor progress, and permit only one immediate retry after refreshing a session. |
| Malformed input and overlapping database writes surfaced as generic failures. | Invalid versions/payloads caused errors; overlapping lock acquisition could fail even though retrying was safe. | Validate input before writing and retry only acquisition of the write lock with a fresh connection and bounded delay. Keep mutations/history/receipts atomic; reconcile legacy receipts whose change history is missing. |

Preserved local rows are queued within their merge transaction, closing a gap where a newer user edit could be replaced. Pending preferences remain available while remote settings merge. The UI reports **Sync pending** until remaining work settles.

## Validation

- All **52 Worker tests pass**, including eleven new database/HTTP regression scenarios. Four of the initial regression cases failed against the previous backend, demonstrating the defects before the fixes.
- TypeScript strict type checking passes.
- Wrangler dry-run bundling passes. The ZIP includes the newly prepared Worker bundle for the app's deployment flow.
- Release readers pass all five LF/CRLF checks. All three Worker configurations now match app version **1.0.1281**, preventing the deployment workflow's version check from blocking the update.
- Existing APK signing, Android SDK package and Gradle download retry regression checks pass.
- Changed Dart files parse without syntax errors. The actual pending-operation SQL was exercised against SQLite with legacy duplicate rows and tied timestamps.
- Ten Flutter regression tests were added for coalescing, in-flight acknowledgements, legacy queues, local/remote conflicts, atomic preservation, deletion, interrupted pull/restart and invalid response handling. **Flutter/Dart SDKs are unavailable here, so these tests and full Flutter analysis must run in the existing build CI.** Syntax and SQL checks do not replace them.

## Apply the update

Build the updated app and deploy the updated self-hosted Worker, retaining the existing database and JWT secrets. The cloud table layout is unchanged; no database reset is required. Existing loan additions and the permanent APK signing fix remain included. Verify syncing between two signed-in devices after deployment, including an offline edit/delete followed by reconnection. Production network, database latency and service incidents still require live diagnostics if failures continue.

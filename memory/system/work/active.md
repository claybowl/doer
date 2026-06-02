# Active Work for Forge-Wright

Current assignments:
- DONA-56: Unresolved K8 Security Blockers - Require Immediate Attention (assigned, in_progress, critical)
- DONA-44: K8 E2E flow validation — assessment to lounge to report full pipeline (assigned, blocked, high)

Notes:
- Fixed HW-02: Raw error messages exposed to users in ResetPassword.tsx (generic error message)
- Added security headers middleware to set CSP, X-Frame-Options, HSTS, etc.
- Still need to fix: HW-01 (password min length 6→8), HW-04 (invitation token policy leaks email)
- DONA-44 is blocked on Supabase email confirmation - updated issue with comment explaining blocker
- Following blocked-task dedup rule, skipped until blocker resolved

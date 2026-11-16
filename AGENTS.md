# Agent Guidelines & Development Rules

This document outlines mandatory guidelines for AI agents (and human contributors) working on the NexusWealth / Expense Manager codebase.

---

## 🚀 Mandatory Release Notes Protocol for App Updates

Whenever implementing features, enhancements, or bug fixes intended for an app release:

1. **Always Update `RELEASE_NOTES.md`**:
   - Before completing tasks, committing, or pushing updates, check [`RELEASE_NOTES.md`](./RELEASE_NOTES.md).
   - Ensure the current target version section at the top (e.g., `## [v3.0.6]` or newly bumped version) clearly documents all user-facing changes.
   - Format entries as clean, benefit-focused bullet points:
     ```markdown
     ## [vX.Y.Z]
     - **Feature Name**: Clear, non-technical explanation of what was added or changed.
     - **Improvement / Fix**: What issue was resolved or what performance was improved.
     ```

2. **Never Expose Internal Developer Commits to End Users**:
   - Do NOT use internal jargon, commit hashes, or technical chore labels (`chore:`, `ci:`, `refactor:`) in `RELEASE_NOTES.md`.
   - The CI/CD pipeline ([`.github/workflows/build-apk.yml`](./.github/workflows/build-apk.yml)) automatically pulls the top section of `RELEASE_NOTES.md` and displays it directly inside the mobile app's update dialog (`AppUpdateModal.jsx`).

3. **Version Bump Checklist**:
   When bumping the app version:
   - Bump version in `frontend/package.json`
   - Update `CURRENT_APP_VERSION` in `frontend/src/utils/appUpdateManager.js`
   - Update `versionName` in `backend/controllers/appVersionController.js` (fallback)
   - Add new section at the top of `RELEASE_NOTES.md` (`## [vX.Y.Z]`)

---

## 🛠️ Testing & Verification Guidelines

Before completing any task:
- Run frontend lint and build: `cd frontend && npm run lint && npm run build`
- Run backend tests: `cd backend && npm test`
- Ensure 0 errors and all tests pass.

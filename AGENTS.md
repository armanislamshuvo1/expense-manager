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

3. **Mandatory Version Bumping on Every Change**:
   Every change (bug fix, feature, UI polish, or refactor) **must** include a version bump before committing:
   - **Autonomous Agent Decision**: The agent autonomously decides whether a change is minor (patch) or major (minor/major) based on SemVer:
     - **Patch Bump (`3.0.6` → `3.0.7`)**: For bug fixes, styling tweaks, minor UI updates, small performance adjustments, or maintenance.
     - **Feature / Minor Bump (`3.0.6` → `3.1.0`)**: For new user-facing features, new screens/modals, substantial additions (e.g. multi-currency transfers, backup export), or major workflow updates.
     - **Major Bump (`3.0.6` → `4.0.0`)**: For breaking architectural redesigns, major data migration overhauls, or when explicitly requested by the user.
     - *User Override*: If the user specifies an explicit target version (e.g. "bump to 3.2.0"), always follow the user's direction.

4. **Version Bump Synchronization Checklist**:
   When bumping the version, always update all 4 locations in tandem:
   - Bump `"version"` in [`frontend/package.json`](./frontend/package.json)
   - Update `CURRENT_APP_VERSION` in [`frontend/src/utils/appUpdateManager.js`](./frontend/src/utils/appUpdateManager.js)
   - Update fallback `versionName` & `tag` in [`backend/controllers/appVersionController.js`](./backend/controllers/appVersionController.js)
   - Add new target version header at the top of [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) (`## [vX.Y.Z]`)
   *(Note: The CI/CD pipeline in `.github/workflows/build-apk.yml` automatically extracts the version from `frontend/package.json` to build the APK and create the GitHub Release tag).*

---

## 🛠️ Testing & Verification Guidelines

Before completing any task:
- Run frontend lint and build: `cd frontend && npm run lint && npm run build`
- Run backend tests: `cd backend && npm test`
- Ensure 0 errors and all tests pass.

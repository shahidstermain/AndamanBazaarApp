# Removing Secrets from Git History

## Background

The file `gh_deploy_key` contained an **OpenSSH private key** and was accidentally committed
to this repository. It **must be treated as fully compromised**. This PR removes the file
from the HEAD commit and prevents it from being re-added via `.gitignore`, but the key
material **still exists in git history** until maintainers explicitly rewrite history.

---

## ⚠️ Urgent actions (do these immediately)

1. **Revoke the key on GitHub** – go to the repository **Settings → Deploy keys**, find the
   key associated with `gh_deploy_key`, and delete it.
2. **Remove from server `authorized_keys`** – on every server where this key was deployed,
   remove its entry from `~/.ssh/authorized_keys` (or the relevant system account).
3. **Rotate credentials** – generate a new SSH key pair, add the public key back as a deploy
   key on GitHub, and update any CI/CD secrets or environment variables that referenced the
   old key.
4. **Audit access logs** – review server and GitHub audit logs for unauthorized access using
   this key.

---

## Purging the file from git history

> **This PR does NOT rewrite git history.** The commands below must be run by a repository
> owner/maintainer who has permission to force-push all branches and tags.

### Option A – git-filter-repo (recommended)

```bash
# 1. Create a fresh mirror clone (never rewrite your regular working copy directly)
git clone --mirror https://github.com/YOUR-ORG/YOUR-REPO.git repo-mirror
cd repo-mirror

# 2. Install git-filter-repo if not already present
#    pip install git-filter-repo
#    or: brew install git-filter-repo

# 3. Remove gh_deploy_key and its public counterpart from every commit in one pass
git filter-repo --path gh_deploy_key --path gh_deploy_key.pub --invert-paths

# 4. Force-push all branches and tags back to GitHub
git push --force --all
git push --force --tags
```

### Option B – BFG Repo-Cleaner

```bash
# 1. Create a fresh mirror clone
git clone --mirror https://github.com/YOUR-ORG/YOUR-REPO.git repo-mirror
cd repo-mirror

# 2. Download BFG (https://rtyley.github.io/bfg-repo-cleaner/)
#    java -jar bfg.jar --delete-files gh_deploy_key

java -jar bfg.jar --delete-files gh_deploy_key
java -jar bfg.jar --delete-files gh_deploy_key.pub

# 3. Expire old objects and force-push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --all
git push --force --tags
```

---

## Post-history-rewrite checklist

After force-pushing the rewritten history:

- [ ] **Inform all collaborators** – every contributor must delete their local clone and
      re-clone the repository (`git clone`). Existing local copies reference old objects and
      will re-introduce them if pushed.
- [ ] **Rotate all keys and secrets** – even after the history rewrite, revoke and replace the
      key if not done already (see Urgent Actions above).
- [ ] **Enable GitHub secret scanning** – go to **Settings → Security → Secret scanning** and
      enable it so future accidental key commits are detected automatically.
- [ ] **Add a pre-commit hook** – use tools such as
      [detect-secrets](https://github.com/Yelp/detect-secrets),
      [truffleHog](https://github.com/trufflesecurity/trufflehog), or
      [git-secrets](https://github.com/awslabs/git-secrets) to block secrets before they reach
      the repository.
- [ ] **Move secrets to a secrets manager** – store SSH keys, API keys, and other credentials
      in GitHub Actions Secrets, HashiCorp Vault, or a similar secrets-management system rather
      than in the repository.
- [ ] **Verify the file is gone** – after the force-push, run:
      ```bash
      git log --all --full-history -- gh_deploy_key
      ```
      The output should be empty.

---

## References

- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [GitHub – Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)

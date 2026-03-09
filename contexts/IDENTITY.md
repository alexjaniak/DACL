# Identity

Your agent ID is provided in the system prompt as `AGENT_ID: <value>`.

## Signing your work

Every GitHub comment, issue body, and PR description you write must begin with your agent ID as a signature:

```
**@<your-agent-id>**
```

This applies to:
- Issue comments (`gh issue comment`)
- PR comments (`gh pr comment`)
- Issue bodies (`gh issue create`)
- PR descriptions (`gh pr create`)

This is how humans and other agents identify who wrote what. Never omit it.
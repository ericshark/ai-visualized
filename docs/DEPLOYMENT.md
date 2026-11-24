# Deploy AI Under the Hood

The existing Vercel project, `ai-visualized`, builds the Next.js app from the `web` root directory. The production branch is `main` and the custom domain is [ai-visualized.ericzwierzynski.dev](https://ai-visualized.ericzwierzynski.dev). Next.js serves the lesson and its two same-origin API routes. Sample mode works on every deployment.

## Enable Claude Live

1. In the Claude Console, create a dedicated workspace and API key for the lesson. Set its monthly spend cap under **Spend limits → Workspace limits**. Start at $5 and adjust to your budget. [Claude workspace limits](https://platform.claude.com/docs/en/manage-claude/workspaces)
2. In the Vercel project, open **Firewall → Configure**. Add a rate-limit rule matching the request path `/api/chat/stream` and method `POST`. Use a **Fixed Window** of 60 seconds, a limit of five requests, **IP** as the counting key, and the default **429** action. Publish the rule before enabling paid requests. Vercel Hobby includes one rate-limit rule per project, so check for conflicts with any rule already in use. [Vercel rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
3. Open **Vercel → ai-visualized → Settings → Environment Variables**. Add `CLAUDE_API_KEY` as a **Secret** for **Production**. Preview deployments can continue in Sample mode. [Vercel environment variables](https://vercel.com/docs/environment-variables)
4. Deploy the Next.js update and open the production site. Run a sample, then select **Claude Live**, send a short question, and confirm the streamed response and measurements. Check that exceeding the configured request limit returns HTTP 429. If retiring the old deployment configuration, remove any stale `NEXT_PUBLIC_API_URL` variable.

The server fixes the model and instructions, allows 500 prompt characters and 256 output tokens, and gives Claude 25 seconds to respond. To disable paid requests, remove the Vercel secret and redeploy. Revoke the dedicated key in the Claude Console for immediate cutoff. Roll back a deployment from the Vercel project’s Deployments page.

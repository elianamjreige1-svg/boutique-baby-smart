<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store confidential product prices in a separate admin-RLS table, never in public products; shopper SELECT queries must not reveal them.
- Save product details and confidential prices through the security-invoker save_admin_product RPC so both writes commit atomically.
- Use the shared per-purpose consent module and first-head defaults for privacy decisions; gate every Meta initialization/event on advertising permission and revoke on cross-tab changes to prevent consent bypasses.

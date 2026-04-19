# principle
- prefer use `pnpm` instead of `npm`

- When the `#plan` command is triggered, ask for confirmation before executing.
- Ask for confirmation before adding new production dependencies.

- All functional changes should be covered by unit tests.
- Always run `npm test` after modifying JavaScript/Typescript files. 
- Use `vitest` for the testing framework.
- Mock external dependencies like `uuid` in tests.

- PR must include a changes summary in the description.
- Branch names and PR titles must follow semantic conventions.
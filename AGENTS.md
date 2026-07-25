# principle

- When the `#plan` command is triggered, always ask if any part is not clear/missing, DO NOT make assumption.
- Ask for confirmation before adding new production dependencies.
- All functional changes should be covered by unit tests.

# frontend

- prefer use `pnpm` instead of `npm`.
- Always run `pnpm test` after finished modify JavaScript/Typescript files, no confirmation required.
- text content or label prefer translated.
- Use `vitest` for the testing framework. All test files should be place in /tests folder.
- Prefer form element / component have aria label to meet WACG requirement.
- Use javascript Date is forbidden in src and tests. Always use Temporal.
- large dataset in store prefer indexed by id, prefer Record type or Map, Set, but not array.

<!-- - Mock external dependencies like `uuid` in tests. -->

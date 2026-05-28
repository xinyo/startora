export async function navigateAfterLogin(
  router: { push: (path: string) => Promise<unknown> | unknown },
) {
  await router.push("/");
}

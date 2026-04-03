/** Resolves with a greeting message. */
export async function greet(): Promise<string> {
  return "hello";
}

void greet();

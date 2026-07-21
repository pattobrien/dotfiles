export function getUserName(id: number): string {
  return `user-${id}`;
}

export const first = getUserName(1);
export const second = getUserName(2);
export const third = getUserName(3);

export function omit<T extends object, K extends keyof T>(
    obj: T,
    omit: K,
): Omit<T, K> {
    const { [omit]: _, ...rest } = obj;

    return rest;
}

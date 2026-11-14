type RefreshTask = (isCurrent: () => boolean) => Promise<boolean>;
type RefreshOptions = { force?: boolean; replace?: boolean; requestKey?: string };
type Entry = { pending?: Promise<void>; refreshedAt?: number; requestKey?: string };

export function createScreenRefresh<Resource extends string>(ttlMs: number) {
  const entries = new Map<Resource, Entry>();
  let active = true;

  return {
    run(resource: Resource, task: RefreshTask, options: RefreshOptions = {}): Promise<void> {
      if (!active) return Promise.resolve();
      const previous = entries.get(resource);
      if (previous && previous.requestKey === options.requestKey && !options.replace) {
        if (previous.pending) return previous.pending;
        if (!options.force && previous.refreshedAt !== undefined
          && Date.now() - previous.refreshedAt < ttlMs) return Promise.resolve();
      }

      const entry: Entry = { requestKey: options.requestKey };
      entries.set(resource, entry);
      const isCurrent = () => entries.get(resource) === entry;
      const pending = Promise.resolve()
        .then(async () => {
          if (isCurrent() && await task(isCurrent) && isCurrent()) entry.refreshedAt = Date.now();
        })
        .finally(() => { entry.pending = undefined; });
      entry.pending = pending;
      return pending;
    },
    invalidate(resource: Resource) { entries.delete(resource); },
    activate() { active = true; },
    dispose() {
      active = false;
      entries.clear();
    },
  };
}

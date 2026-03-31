const all = ['datasets'];
export const datasetsKeys = {
  all,
  records: (id: string, offset?: number, limit?: number) => [...all, id, 'records', offset ?? 0, limit ?? 20],
  schema: (id: string) => [...all, id, 'schema'],
};

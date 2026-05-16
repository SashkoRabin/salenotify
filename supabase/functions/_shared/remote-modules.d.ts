declare module "https://esm.sh/@supabase/supabase-js@2" {
  type DynamicData = string & {
    [key: string]: DynamicData;
    length: number;
    map(callback: (item: DynamicData) => unknown): DynamicData[];
  };

  type QueryResult = {
    data: DynamicData;
    error: {
      message: string;
    } | null;
  };

  type QueryBuilder = PromiseLike<QueryResult> & {
    select(columns?: string): QueryBuilder;
    insert(values: unknown): QueryBuilder;
    update(values: unknown): QueryBuilder;
    upsert(values: unknown, options?: unknown): QueryBuilder;
    delete(): QueryBuilder;
    eq(column: string, value: unknown): QueryBuilder;
    in(column: string, values: unknown[]): QueryBuilder;
    match(query: unknown): QueryBuilder;
    or(expression: string): QueryBuilder;
    not(column: string, operator: string, value: unknown): QueryBuilder;
    order(column: string, options?: unknown): QueryBuilder;
    limit(count: number): QueryBuilder;
    single(): Promise<QueryResult>;
    maybeSingle(): Promise<QueryResult>;
  };

  type SupabaseClient = {
    from(table: string): QueryBuilder;
  };

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: unknown,
  ): SupabaseClient;
}

import type { FormState } from "../state";
import { FilterList } from "./FilterList";
import { OrderList } from "./OrderList";
import { PreferSection } from "./PreferSection";
import { InfoTip } from "./InfoTip";

type Props = {
   state: FormState;
   setState: React.Dispatch<React.SetStateAction<FormState>>;
};

const METHODS = ["GET", "POST", "PATCH", "DELETE", "HEAD"] as const;

const inputCls =
   "w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/50";
const labelCls =
   "text-[10px] uppercase tracking-wider text-gray-500 mb-0.5 flex items-center gap-1";

function Section({
   title,
   children,
}: {
   title: string;
   children: React.ReactNode;
}) {
   return (
      <section className="mb-4">
         <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-800 pb-1 mb-2">
            {title}
         </h3>
         {children}
      </section>
   );
}

export function RequestForm({ state, setState }: Props) {
   const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
      setState((s) => ({ ...s, [key]: val }));

   const hasBody = state.method !== "GET" && state.method !== "HEAD";

   return (
      <div className="space-y-0">
         <Section title="Basics">
            <div className="flex gap-2 mb-2">
               <select
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
                  value={state.method}
                  onChange={(e) =>
                     set("method", e.target.value as FormState["method"])
                  }
               >
                  {METHODS.map((m) => (
                     <option key={m}>{m}</option>
                  ))}
               </select>
               <div className="flex items-center gap-1 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                     <input
                        type="radio"
                        name="resourceType"
                        value="table"
                        checked={state.resourceType === "table"}
                        onChange={() => set("resourceType", "table")}
                        className="accent-blue-500"
                     />
                     table
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                     <input
                        type="radio"
                        name="resourceType"
                        value="rpc"
                        checked={state.resourceType === "rpc"}
                        onChange={() => set("resourceType", "rpc")}
                        className="accent-blue-500"
                     />
                     rpc
                  </label>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div>
                  <label className={labelCls}>Resource name</label>
                  <input
                     className={inputCls}
                     value={state.resourceName}
                     onChange={(e) => set("resourceName", e.target.value)}
                  />
               </div>
               <div>
                  <label className={labelCls}>
                     Schema
                     <InfoTip
                        text="Maps to Accept-Profile (GET/HEAD) or Content-Profile (mutations). Routes the request to a non-default PostgreSQL schema."
                        position="bottom-right"
                     />
                  </label>
                  <input
                     className={inputCls}
                     placeholder="default"
                     value={state.schema}
                     onChange={(e) => set("schema", e.target.value)}
                  />
               </div>
            </div>
         </Section>

         <Section title="Select & Transforms">
            <div className="space-y-2">
               <div>
                  <label className={labelCls}>
                     Select
                     <InfoTip text="PostgREST select syntax. Columns, renames (alias:col), casts (col::text), embeds (relation(col)), spreads (...relation(col)), aggregates (col.sum())." />
                  </label>
                  <input
                     className={inputCls}
                     placeholder="id,name,relation(col)"
                     value={state.select}
                     onChange={(e) => set("select", e.target.value)}
                  />
               </div>
               <div>
                  <label className={labelCls}>Order</label>
                  <OrderList
                     orders={state.orders}
                     onChange={(orders) => set("orders", orders)}
                  />
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <div>
                     <label className={labelCls}>Limit</label>
                     <input
                        className={inputCls}
                        type="number"
                        min="0"
                        placeholder="no limit"
                        value={state.limit}
                        onChange={(e) => set("limit", e.target.value)}
                     />
                  </div>
                  <div>
                     <label className={labelCls}>Offset</label>
                     <input
                        className={inputCls}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={state.offset}
                        onChange={(e) => set("offset", e.target.value)}
                     />
                  </div>
               </div>
            </div>
         </Section>

         <Section title="Filters">
            <FilterList
               filters={state.filters}
               onChange={(filters) => set("filters", filters)}
            />
         </Section>

         <Section title="Headers">
            <div className="grid grid-cols-2 gap-2">
               <div>
                  <label className={labelCls}>
                     Accept
                     <InfoTip text="Response format. pgrst.object+json returns a single object (error if not exactly 1 row). pgrst.plan returns the query execution plan instead of data." />
                  </label>
                  <select
                     className={inputCls}
                     value={state.accept}
                     onChange={(e) => set("accept", e.target.value)}
                  >
                     <option value="">default</option>
                     <option value="application/json">application/json</option>
                     <option value="application/vnd.pgrst.object+json">
                        pgrst.object+json
                     </option>
                     <option value="text/csv">text/csv</option>
                     <option value="application/octet-stream">
                        octet-stream
                     </option>
                     <option value="application/vnd.pgrst.plan">
                        pgrst.plan
                     </option>
                     <option value="application/vnd.pgrst.plan+json">
                        pgrst.plan+json
                     </option>
                  </select>
               </div>
               <div>
                  <label className={labelCls}>
                     Content-Type{" "}
                     {!hasBody && (
                        <span className="text-gray-600 normal-case tracking-normal">
                           ({state.method} has no body)
                        </span>
                     )}
                  </label>
                  <select
                     className={`${inputCls} ${!hasBody ? "opacity-40" : ""}`}
                     value={state.contentType}
                     disabled={!hasBody}
                     onChange={(e) => set("contentType", e.target.value)}
                  >
                     <option value="">default</option>
                     <option value="application/json">application/json</option>
                     <option value="text/csv">text/csv</option>
                     <option value="application/x-www-form-urlencoded">
                        form-urlencoded
                     </option>
                     <option value="application/octet-stream">
                        octet-stream
                     </option>
                  </select>
               </div>
            </div>
         </Section>

         <Section title="Prefer">
            <PreferSection state={state} onChange={set} />
         </Section>

         <Section title="Body & Upsert">
            <div className="space-y-2">
               <div>
                  <label className={labelCls}>
                     Body{" "}
                     {!hasBody && (
                        <span className="text-gray-600">
                           (disabled for {state.method})
                        </span>
                     )}
                  </label>
                  <textarea
                     className={`${inputCls} h-24 font-mono`}
                     disabled={!hasBody}
                     placeholder='{"key": "value"}'
                     value={state.body}
                     onChange={(e) => set("body", e.target.value)}
                  />
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <div>
                     <label className={labelCls}>
                        on_conflict
                        <InfoTip text="Column(s) for upsert conflict target. Maps to ON CONFLICT (column). Used with Prefer: resolution=merge-duplicates or ignore-duplicates." />
                     </label>
                     <input
                        className={inputCls}
                        placeholder="id"
                        value={state.onConflict}
                        onChange={(e) => set("onConflict", e.target.value)}
                     />
                  </div>
                  <div>
                     <label className={labelCls}>
                        columns
                        <InfoTip text="Restrict which columns can be inserted/updated. Columns not listed are set to DB defaults. Useful for bulk inserts with heterogeneous JSON objects." />
                     </label>
                     <input
                        className={inputCls}
                        placeholder="col1,col2"
                        value={state.columns}
                        onChange={(e) => set("columns", e.target.value)}
                     />
                  </div>
               </div>
            </div>
         </Section>
      </div>
   );
}

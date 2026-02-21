import { useState, useEffect, useMemo } from "react";
import { format } from "sql-formatter";
import { highlight } from "../lib/shiki";
import type { Dialect, DeparseResult } from "postgrest-ast";

type SqlResult = { result?: DeparseResult; error?: string };
type Props = {
   postgres: SqlResult;
   sqlite: SqlResult;
};

function formatSql(sql: string, dialect: Dialect): string {
   try {
      return format(sql, {
         language: dialect === "postgres" ? "postgresql" : "sqlite",
         tabWidth: 2,
         keywordCase: "upper",
      });
   } catch {
      return sql;
   }
}

function SqlPane({ label, data, dialect }: { label: string; data: SqlResult; dialect: Dialect }) {
   const [highlighted, setHighlighted] = useState<string | null>(null);

   const sqlText = useMemo(() => {
      if (!data.result) return "";
      const formatted = formatSql(data.result.sql, dialect);
      return `${formatted}\n\n-- params: ${JSON.stringify(data.result.parameters)}`;
   }, [data.result, dialect]);

   useEffect(() => {
      if (!sqlText) { setHighlighted(null); return; }
      highlight(sqlText, "sql").then(setHighlighted);
   }, [sqlText]);

   return (
      <div className="flex-1 flex flex-col gap-1 min-w-0">
         <h2 className="text-[10px] uppercase tracking-wider text-gray-500">{label}</h2>
         {data.error ? (
            <pre className="flex-1 bg-gray-900 rounded p-3 text-xs font-mono overflow-auto min-h-[60px] text-red-400">
               {data.error}
            </pre>
         ) : highlighted ? (
            <div
               className="flex-1 bg-gray-900 rounded p-3 text-xs font-mono overflow-auto min-h-[60px] [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:m-0!"
               dangerouslySetInnerHTML={{ __html: highlighted }}
            />
         ) : (
            <pre className="flex-1 bg-gray-900 rounded p-3 text-xs font-mono overflow-auto min-h-[60px] text-gray-600">
               Waiting...
            </pre>
         )}
      </div>
   );
}

export function SqlPreview({ postgres, sqlite }: Props) {
   return (
      <div className="flex gap-3 min-h-0 max-h-[400px]">
         <SqlPane label="PostgreSQL" data={postgres} dialect="postgres" />
         <SqlPane label="SQLite" data={sqlite} dialect="sqlite" />
      </div>
   );
}

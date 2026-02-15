type Props = { ast: unknown; error: string | null };

export function AstOutput({ ast, error }: Props) {
   return (
      <div className="flex-1 min-h-0 flex flex-col">
         <h2 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            AST Output
         </h2>
         <pre className="flex-1 bg-gray-900 rounded p-3 text-xs font-mono overflow-auto min-h-0">
            {error ? (
               <span className="text-red-400">{error}</span>
            ) : ast ? (
               <span className="text-blue-300">
                  {JSON.stringify(ast, null, 2)}
               </span>
            ) : (
               <span className="text-gray-600">Waiting...</span>
            )}
         </pre>
      </div>
   );
}

import { useState, useEffect } from 'react'
import { highlight } from '../lib/shiki'

type Props = { ast: unknown; error: string | null };

export function AstOutput({ ast, error }: Props) {
   const [highlighted, setHighlighted] = useState<string | null>(null)

   useEffect(() => {
      if (!ast) { setHighlighted(null); return }
      highlight(JSON.stringify(ast, null, 2), 'json').then(setHighlighted)
   }, [ast])

   return (
      <div className="flex-1 min-h-0 flex flex-col">
         <h2 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            AST Output
         </h2>
         {error ? (
            <pre className="flex-1 bg-gray-900 rounded p-3 text-xs font-mono overflow-auto min-h-0 text-red-400">
               {error}
            </pre>
         ) : highlighted ? (
            <div
               className="flex-1 bg-gray-900 rounded p-3 text-xs font-mono overflow-auto min-h-0 [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:m-0!"
               dangerouslySetInnerHTML={{ __html: highlighted }}
            />
         ) : ast ? (
            <pre className="flex-1 bg-gray-900 rounded p-3 text-xs font-mono overflow-auto min-h-0 text-blue-300">
               {JSON.stringify(ast, null, 2)}
            </pre>
         ) : (
            <pre className="flex-1 bg-gray-900 rounded p-3 text-xs font-mono overflow-auto min-h-0 text-gray-600">
               Waiting...
            </pre>
         )}
      </div>
   );
}

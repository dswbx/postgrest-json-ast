import { useState, useEffect } from 'react'
import type { FormState } from '../state'
import { buildRequestPreview } from '../state'
import { highlight } from '../lib/shiki'

type Props = { state: FormState }

export function RequestPreview({ state }: Props) {
   const [encode, setEncode] = useState(false)
   const preview = buildRequestPreview(state, encode)
   const [highlighted, setHighlighted] = useState<string | null>(null)

   useEffect(() => {
      highlight(preview, 'http').then(setHighlighted)
   }, [preview])

   return (
      <div className="shrink-0">
         <div className="flex items-center justify-between mb-1">
            <h2 className="text-[10px] uppercase tracking-wider text-gray-500">
               Request Preview
            </h2>
            <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer select-none">
               <input
                  type="checkbox"
                  className="accent-blue-500"
                  checked={encode}
                  onChange={(e) => setEncode(e.target.checked)}
               />
               URL-encode
            </label>
         </div>
         {highlighted ? (
            <div
               className="bg-gray-900 rounded max-h-48 overflow-y-auto text-xs font-mono [&_pre]:bg-transparent! [&_pre]:p-3! [&_pre]:m-0! [&_pre]:whitespace-pre-wrap! [&_pre]:break-all!"
               dangerouslySetInnerHTML={{ __html: highlighted }}
            />
         ) : (
            <pre className="bg-gray-900 rounded p-3 text-xs text-gray-400 font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
               {preview}
            </pre>
         )}
      </div>
   );
}

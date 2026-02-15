import { useState } from 'react'
import type { FormState } from '../state'
import { buildRequestPreview } from '../state'

type Props = { state: FormState }

export function RequestPreview({ state }: Props) {
   const [encode, setEncode] = useState(false)
   const preview = buildRequestPreview(state, encode)

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
         <pre className="bg-gray-900 rounded p-3 text-xs text-gray-400 font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
            {preview}
         </pre>
      </div>
   );
}

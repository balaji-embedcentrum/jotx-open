/**
 * DocumentInfoContext - facts about the open document that blocks may show,
 * such as its title in the top navigation of a one-file site.
 */

import { createContext, useContext } from 'react'

export interface DocumentInfo {
  title?: string
}

export const DocumentInfoContext = createContext<DocumentInfo>({})

export const useDocumentInfo = () => useContext(DocumentInfoContext)

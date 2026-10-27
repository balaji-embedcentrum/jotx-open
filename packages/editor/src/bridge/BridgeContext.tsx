/**
 * Bridge Context for platform-agnostic editor
 */
import React, { createContext, useContext } from 'react'
import { EditorPlatformBridge, defaultBridge } from './types'

const BridgeContext = createContext<EditorPlatformBridge>(defaultBridge)

export interface BridgeProviderProps {
    bridge: EditorPlatformBridge
    children: React.ReactNode
}

export function BridgeProvider({ bridge, children }: BridgeProviderProps) {
    return (
        <BridgeContext.Provider value={bridge}>
            {children}
        </BridgeContext.Provider>
    )
}

export function useBridge(): EditorPlatformBridge {
    return useContext(BridgeContext)
}

export { BridgeContext }

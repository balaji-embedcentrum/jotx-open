/**
 * ReadonlyMermaid - Renders a readonly Mermaid diagram
 * Used in JotxLink expanded view for referenced mermaid blocks
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMermaid } from '../utils/lazyLibs';
import { useIsDark } from '../utils/useIsDark';

interface ReadonlyMermaidProps {
    src: string;
}

export function ReadonlyMermaid({ src }: ReadonlyMermaidProps) {
    const svgRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const instanceId = useMemo(() => `rdmmd_${Math.random().toString(36).slice(2)}`, []);
    const isDark = useIsDark(svgRef);
    const mermaid = useMermaid();

    // Initialize mermaid
    useEffect(() => {
        if (!mermaid) return;
        try {
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: isDark ? 'dark' : 'default'
            });
        } catch {
            // ignore
        }
    }, [isDark, mermaid]);

    // Render diagram
    useEffect(() => {
        const el = svgRef.current;
        if (!el || !src.trim()) {
            if (el) el.innerHTML = '';
            setError(null);
            return;
        }

        if (!mermaid) return;
        let cancelled = false;
        (async () => {
            try {
                const { svg } = await mermaid.render(instanceId, src);
                if (cancelled) return;
                el.innerHTML = svg;
                setError(null);
            } catch (e: any) {
                if (cancelled) return;
                el.innerHTML = '';
                setError(e?.message || 'Invalid Mermaid diagram');
            }
        })();

        return () => { cancelled = true; };
    }, [src, instanceId, isDark, mermaid]);

    return (
        <div className="readonly-mermaid-container">
            {error && <div className="readonly-mermaid-error">{error}</div>}
            <div ref={svgRef} className="readonly-mermaid-svg" />
            <div className="readonly-mermaid-source">
                <details>
                    <summary>📝 Source Code</summary>
                    <pre>{src}</pre>
                </details>
            </div>
        </div>
    );
}

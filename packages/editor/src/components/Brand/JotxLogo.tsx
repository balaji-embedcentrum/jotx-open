import React from 'react'

export interface JotxLogoProps {
  size?: number
  className?: string
}

/**
 * Monochrome jotx logo (theme-invertable): uses currentColor.
 */
export function JotxLogo({ size = 28, className }: JotxLogoProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      role="img"
      aria-label="jotx"
      fill="none"
    >
      <rect
        x="36"
        y="36"
        width="184"
        height="184"
        rx="44"
        stroke="currentColor"
        strokeWidth="18"
      />
      <text
        x="128"
        y="140"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="124"
        fontWeight="700"
        fontStyle="italic"
        fontFamily={`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`}
        transform="translate(128 140) skewX(-10) translate(-128 -140)"
      >
        j
      </text>
    </svg>
  )
}



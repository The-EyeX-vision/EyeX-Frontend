'use client'

/**
 * EyeXLogo — Official brand mark for the EyeX Exam Monitoring Platform
 * Matches the SVG specification from stitch_eyex_exam_monitoring_platform/eyex_logo/code.html
 */

interface EyeXLogoProps {
  /** Width in px — height auto-scales proportionally */
  width?: number
  /** Optional className for positioning/spacing */
  className?: string
  /** Show/hide the "EXAM MONITOR" tagline */
  showTagline?: boolean
  /** Variant: 'full' = icon + wordmark, 'icon' = icon only, 'wordmark' = wordmark only */
  variant?: 'full' | 'icon' | 'wordmark'
}

export function EyeXLogo({
  width = 180,
  className = '',
  showTagline = true,
  variant = 'full',
}: EyeXLogoProps) {
  const height = showTagline ? width * 0.25 : width * 0.2

  if (variant === 'icon') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 44 44"
        width={height}
        height={height}
        fill="none"
        className={className}
        aria-label="EyeX"
      >
        <rect width="44" height="44" rx="10" fill="#1D4ED8" />
        <path
          d="M8 22C11.5 16 17.5 12 22 12C26.5 12 32.5 16 36 22C32.5 28 26.5 32 22 32C17.5 32 11.5 28 8 22Z"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="22" r="5" fill="#FFFFFF" />
        <circle cx="22" cy="22" r="2" fill="#1D4ED8" />
        <path
          d="M22 8V10M22 34V36M6 22H8M36 22H38"
          stroke="#93C5FD"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={showTagline ? '0 0 240 60' : '0 0 240 50'}
      width={width}
      height={height}
      fill="none"
      className={className}
      aria-label="EyeX Exam Monitor"
    >
      {variant !== 'wordmark' && (
        <>
          {/* Icon Background */}
          <rect width="44" height="44" x="8" y="8" rx="10" fill="#1D4ED8" />
          {/* Stylized Eye Aperture */}
          <path
            d="M16 30C19.5 24 25.5 20 30 20C34.5 20 40.5 24 44 30C40.5 36 34.5 40 30 40C25.5 40 19.5 36 16 30Z"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Lens */}
          <circle cx="30" cy="30" r="5" fill="#FFFFFF" />
          <circle cx="30" cy="30" r="2" fill="#1D4ED8" />
          {/* Focus Crosshairs */}
          <path
            d="M30 16V18M30 42V44M14 30H16M44 30H46"
            stroke="#93C5FD"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Wordmark */}
      <text
        x={variant === 'wordmark' ? 4 : 62}
        y="35"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="24"
        fontWeight="800"
        fill="#0B2A4A"
        letterSpacing="-0.5"
      >
        Eye<tspan fill="#1D4ED8">X</tspan>
      </text>
      {showTagline && (
        <text
          x={variant === 'wordmark' ? 4 : 63}
          y="47"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize="9"
          fontWeight="600"
          fill="#64748B"
          letterSpacing="1.2"
        >
          EXAM MONITOR
        </text>
      )}
    </svg>
  )
}

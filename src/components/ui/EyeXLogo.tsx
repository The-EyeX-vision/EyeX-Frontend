'use client'

import Image from 'next/image'

interface EyeXLogoProps {
  /** Width in px — scales proportionally */
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
  // Height / size calculation based on requested width
  const iconSize = variant === 'icon'
    ? (width <= 48 ? width : Math.max(32, Math.round(width * 0.28)))
    : Math.max(28, Math.min(44, Math.round(width * 0.25)))

  if (variant === 'icon') {
    return (
      <Image
        src="/image.jpeg"
        alt="EyeX Logo"
        width={iconSize}
        height={iconSize}
        className={`rounded-xl object-cover shadow-sm border border-gray-700/60 shrink-0 ${className}`}
        style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        priority
      />
    )
  }

  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex flex-col justify-center leading-none ${className}`}>
        <span className="font-sans text-xl font-extrabold text-[#0B2A4A] tracking-tight">
          Eye<span className="text-[#1D4ED8]">X</span>
        </span>
        {showTagline && (
          <span className="font-sans text-[9px] font-semibold text-[#64748B] tracking-[1.2px] uppercase mt-0.5">
            EXAM MONITOR
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/image.jpeg"
        alt="EyeX Logo"
        width={iconSize}
        height={iconSize}
        className="rounded-xl object-cover shadow-sm border border-gray-700/60 shrink-0"
        style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        priority
      />
      <div className="flex flex-col justify-center leading-none">
        <span
          className="font-sans font-extrabold text-[#0B2A4A] tracking-tight leading-none"
          style={{ fontSize: `${Math.max(15, Math.round(width * 0.15))}px` }}
        >
          Eye<span className="text-[#1D4ED8]">X</span>
        </span>
        {showTagline && (
          <span
            className="font-sans font-semibold text-[#64748B] tracking-[1.2px] uppercase mt-1 leading-none"
            style={{ fontSize: `${Math.max(8, Math.round(width * 0.06))}px` }}
          >
            EXAM MONITOR
          </span>
        )}
      </div>
    </div>
  )
}

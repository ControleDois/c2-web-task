import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps, children: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlusIcon = (p: IconProps) => base(p, <path d="M12 5v14M5 12h14" />)
export const XIcon = (p: IconProps) => base(p, <path d="M6 6l12 12M18 6L6 18" />)
export const DotsIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </>
  )
export const ClockIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  )
export const TextIcon = (p: IconProps) => base(p, <path d="M4 6h16M4 12h16M4 18h10" />)
export const CommentIcon = (p: IconProps) =>
  base(p, <path d="M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z" />)
export const PaperclipIcon = (p: IconProps) =>
  base(p, <path d="M21 11.5l-8.6 8.6a5 5 0 01-7.1-7.1l9-9a3.3 3.3 0 014.7 4.7l-9 9a1.7 1.7 0 01-2.4-2.4l8.3-8.3" />)
export const ChecklistIcon = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  )
export const TagIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M3 12.6V4.5A1.5 1.5 0 014.5 3h8.1a1.5 1.5 0 011.06.44l7.4 7.4a1.5 1.5 0 010 2.12l-7.1 7.1a1.5 1.5 0 01-2.12 0l-7.4-7.4A1.5 1.5 0 013 12.6z" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </>
  )
export const UserPlusIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0113 0M19 8v6M16 11h6" />
    </>
  )
export const ImageIcon = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 8" />
    </>
  )
export const ArchiveIcon = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3" y="4" width="18" height="4.5" rx="1.2" />
      <path d="M5 8.5V19a1 1 0 001 1h12a1 1 0 001-1V8.5M10 13h4" />
    </>
  )
export const TrashIcon = (p: IconProps) =>
  base(p, <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12M9 7V4h6v3" />)
export const CheckIcon = (p: IconProps) => base(p, <path d="M5 12.5l4.5 4.5L19 7.5" />)
export const ChevronLeftIcon = (p: IconProps) => base(p, <path d="M15 5l-7 7 7 7" />)
export const ChevronDownIcon = (p: IconProps) => base(p, <path d="M5 9l7 7 7-7" />)
export const BoardIcon = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 7v7M15 7v4" />
    </>
  )
export const FilterIcon = (p: IconProps) => base(p, <path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" />)
export const SearchIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4-4" />
    </>
  )
export const PencilIcon = (p: IconProps) => base(p, <path d="M4 20l1-4 11-11 3 3-11 11-4 1zM14 7l3 3" />)
export const MoveIcon = (p: IconProps) => base(p, <path d="M5 12h14M13 6l6 6-6 6" />)
export const CopyIcon = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7.5a2 2 0 002 2h2.5" />
    </>
  )

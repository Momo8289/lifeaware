import * as React from "react"
import { ChevronRight, Home, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {concatClasses} from "utils/helpers";

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  segments: {
    title: string
    href: string
  }[]
  separator?: React.ReactNode
  homeLink?: string
  maxItems?: number
}

export function Breadcrumb({
  segments,
  separator = <ChevronRight className="size-3.5 text-muted-foreground flex-shrink-0" />,
  homeLink = "/",
  maxItems = 2, // Show max 2 items on mobile, more on desktop
  className,
  ...props
}: BreadcrumbProps) {
  const segmentsLength = segments.length
  
  // Determine if we need to collapse items (be more lenient)
  const shouldCollapse = segmentsLength > maxItems
  
  // Get visible segments (always show first and last)
  const getVisibleSegments = () => {
    if (!shouldCollapse) return segments
    
    if (segmentsLength <= 2) return segments
    
    // Show first segment, ellipsis, and last segment
    return [
      segments[0],
      ...segments.slice(-(maxItems - 1))
    ]
  }
  
  // Get hidden segments for dropdown
  const getHiddenSegments = () => {
    if (!shouldCollapse || segmentsLength <= 2) return []
    
    return segments.slice(1, -(maxItems - 1))
  }
  
  const visibleSegments = getVisibleSegments()
  const hiddenSegments = getHiddenSegments()
  const hasHiddenSegments = hiddenSegments.length > 0
  
  return (
    <nav
      aria-label="Breadcrumb"
      className={concatClasses("flex items-center text-xs sm:text-sm", className)}
      {...props}
    >
      <ol className="flex items-center gap-1 md:gap-1.5 min-w-0">
        {/* Home Link */}
        <li className="flex items-center flex-shrink-0">
          <Link
            href={homeLink}
            className="flex items-center text-muted-foreground transition-colors hover:text-foreground p-1 rounded-md hover:bg-accent"
            aria-label="Home"
          >
            <Home className="size-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        
        {/* Handle the case where we need to show ellipsis */}
        {hasHiddenSegments && (
          <>
            <li className="flex items-center text-muted-foreground flex-shrink-0">
              {separator}
            </li>
            <li className="flex items-center flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Show ${hiddenSegments.length} hidden pages`}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[200px] max-w-[280px]">
                  {hiddenSegments.map((segment, index) => (
                    <DropdownMenuItem key={`${segment.href}-${index}`} asChild>
                      <Link 
                        href={segment.href}
                        className="flex items-center w-full truncate"
                        title={segment.title}
                      >
                        {segment.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          </>
        )}
        
        {/* Visible segments */}
        {visibleSegments.map((segment, index) => {
          const actualIndex = hasHiddenSegments && index > 0 
            ? segments.findIndex(s => s.href === segment.href)
            : index
          const isLastSegment = actualIndex === segmentsLength - 1
          
          return (
            <React.Fragment key={`${segment.href}-${actualIndex}`}>
              <li className="flex items-center text-muted-foreground flex-shrink-0">
                {separator}
              </li>
              <li className="min-w-0 max-w-[150px] sm:max-w-[200px]">
                {isLastSegment ? (
                  <span 
                    className="font-medium text-foreground block px-1 py-1 text-xs sm:text-sm leading-tight truncate"
                    title={segment.title}
                  >
                    {segment.title}
                  </span>
                ) : (
                  <Link
                    href={segment.href}
                    className="transition-colors hover:text-foreground block px-1 py-1 rounded-md hover:bg-accent text-xs sm:text-sm leading-tight truncate"
                    title={segment.title}
                  >
                    {segment.title}
                  </Link>
                )}
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

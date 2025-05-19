import * as React from "react"
import { ChevronRight, Home, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  segments: {
    title: string
    href: string
  }[]
  separator?: React.ReactNode
  homeLink?: string
}

export function Breadcrumb({
  segments,
  separator = <ChevronRight className="size-3.5 text-muted-foreground" />,
  homeLink = "/",
  className,
  ...props
}: BreadcrumbProps) {
  const segmentsLength = segments.length
  
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 text-sm", className)}
      {...props}
    >
      <ol className="flex items-center gap-1.5">
        <li className="flex items-center gap-1.5">
          <Link
            href={homeLink}
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="size-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        
        {segments.map((segment, index) => {
          const isLastSegment = index === segmentsLength - 1
          
          return (
            <React.Fragment key={`${segment.href}-${index}`}>
              <li className="flex items-center gap-1.5 text-muted-foreground">
                {separator}
              </li>
              <li>
                {isLastSegment ? (
                  <span className="font-medium text-foreground">{segment.title}</span>
                ) : (
                  <Link
                    href={segment.href}
                    className="transition-colors hover:text-foreground"
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

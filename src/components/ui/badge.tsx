import { cn } from "@/lib/utils"

interface BadgeProps {
    status: 'danger' | 'warning' | 'ok' | 'default'
    children: React.ReactNode
    className?: string
}

export function Badge({ status, children, className }: BadgeProps) {
    const styles = {
        danger: "bg-red-100 text-red-700 border-red-200",
        warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
        ok: "bg-green-100 text-green-700 border-green-200",
        default: "bg-blue-100 text-blue-700 border-blue-200"
    }

    return (
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border", styles[status], className)}>
            {children}
        </span>
    )
}

"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

const DialogContext = React.createContext<{
    open: boolean
    setOpen: (open: boolean) => void
}>({ open: false, setOpen: () => { } })

export const Dialog = ({ children, open, onOpenChange }: any) => {
    const [uncontrolled, setUncontrolled] = React.useState(false)
    const isControlled = open !== undefined
    const isOpen = isControlled ? open : uncontrolled
    const setOpen = (newOpen: boolean) => {
        if (isControlled) {
            onOpenChange(newOpen)
        } else {
            setUncontrolled(newOpen)
        }
    }

    return (
        <DialogContext.Provider value={{ open: isOpen, setOpen }}>
            {children}
        </DialogContext.Provider>
    )
}

export const DialogTrigger = ({ asChild, children, ...props }: any) => {
    const { setOpen } = React.useContext(DialogContext)
    const Comp = asChild ? Slot : "button"

    return (
        <Comp onClick={() => setOpen(true)} {...props}>
            {children}
        </Comp>
    )
}

export const DialogContent = ({ children, className }: any) => {
    const { open, setOpen } = React.useContext(DialogContext)

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
                onClick={() => setOpen(false)}
            />

            {/* Content */}
            <div className={cn("relative z-50 w-full max-w-lg bg-background p-6 shadow-lg rounded-lg animate-in fade-in zoom-in-95 duration-200 border border-border mx-4", className)}>
                <button
                    onClick={() => setOpen(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
                {children}
            </div>
        </div>
    )
}

export const DialogHeader = ({ className, ...props }: any) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)

export const DialogTitle = ({ className, ...props }: any) => (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
)

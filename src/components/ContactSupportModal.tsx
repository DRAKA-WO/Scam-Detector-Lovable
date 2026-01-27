import { X, Mail, HelpCircle, MessageCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ContactSupportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ContactSupportModal({ open, onOpenChange }: ContactSupportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-purple-500/10 via-card to-card border border-purple-500/20 text-foreground p-0 [&>button]:hidden shadow-2xl shadow-purple-500/10 backdrop-blur-sm overflow-hidden">
        {/* Decorative blur element */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl"></div>
        
        <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <MessageCircle className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">Contact Us</DialogTitle>
              <DialogDescription className="sr-only">
                Contact support for billing issues, receipts, and general assistance
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10 p-1.5 rounded-md hover:bg-muted/50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>
        
        <div className="px-6 py-6 space-y-4 relative z-10">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
            <HelpCircle className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                For all support inquiries, including billing issues, receipts, and general assistance, please email us at:
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 group-hover:from-purple-700 group-hover:to-pink-700 transition-all">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Email Support</p>
              <a 
                href="mailto:support@scamguard.ai" 
                className="text-base font-semibold text-purple-400 hover:text-purple-300 transition-colors group-hover:underline"
              >
                support@scamguard.ai
              </a>
            </div>
          </div>
          
          <div className="pt-2 text-xs text-muted-foreground">
            <p>We typically respond within 24-48 hours during business days.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

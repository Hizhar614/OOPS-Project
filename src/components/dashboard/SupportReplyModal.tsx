import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CustomerQuery } from "@/contexts/MockDataContext";
import { Send } from "lucide-react";

interface SupportReplyModalProps {
  query: CustomerQuery | null;
  isOpen: boolean;
  onClose: () => void;
  onSend: (queryId: string) => void;
}

const SupportReplyModal = ({ query, isOpen, onClose, onSend }: SupportReplyModalProps) => {
  const [replyMessage, setReplyMessage] = useState("");

  const handleSend = () => {
    if (!query || !replyMessage.trim()) {
      return;
    }

    onSend(query.id);
    setReplyMessage("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reply to Customer</DialogTitle>
        </DialogHeader>

        {query && (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-accent/5 rounded-lg">
              <p className="text-sm font-semibold mb-1">{query.customerName}</p>
              <p className="text-sm text-muted-foreground">{query.message}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-message">Your Reply</Label>
              <Textarea
                id="reply-message"
                placeholder="Type your response to the customer..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSend}
                disabled={!replyMessage.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Reply
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupportReplyModal;

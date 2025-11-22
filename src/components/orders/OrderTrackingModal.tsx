import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Clock, Truck, Package, MapPin } from "lucide-react";
import { Order } from "@/contexts/MockDataContext";
import { format } from "date-fns";

interface OrderTrackingModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderTrackingModal = ({ order, isOpen, onClose }: OrderTrackingModalProps) => {
  if (!order) return null;

  const orderSteps = [
    {
      status: "placed",
      label: "Order Placed",
      description: "Your order has been confirmed",
      icon: Package,
    },
    {
      status: "processed",
      label: "Processing",
      description: "Your order is being prepared",
      icon: Clock,
    },
    {
      status: "out_for_delivery",
      label: "Out for Delivery",
      description: "Your order is on the way",
      icon: Truck,
    },
    {
      status: "delivered",
      label: "Delivered",
      description: "Your order has been delivered",
      icon: Check,
    },
  ];

  const currentStepIndex = orderSteps.findIndex((step) => step.status === order.status);

  const getStepState = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return "completed";
    if (stepIndex === currentStepIndex) return "active";
    return "upcoming";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Track Your Order</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Order #{order.id.slice(-8)}
          </p>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Order Info Card */}
          <div className="p-4 bg-accent/10 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Total</span>
              <span className="text-lg font-bold text-primary">₹{order.total.toFixed(0)}</span>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Delivery Address</p>
                <p className="text-sm">{order.deliveryAddress}</p>
              </div>
            </div>
            {order.scheduledDelivery && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Scheduled Delivery</span>
                  <span className="text-sm font-medium">
                    {format(new Date(order.scheduledDelivery), "PPP")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Order Status Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">Order Status</h3>
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />

              {/* Steps */}
              <div className="space-y-6">
                {orderSteps.map((step, index) => {
                  const state = getStepState(index);
                  const Icon = step.icon;
                  const isCompleted = state === "completed";
                  const isActive = state === "active";
                  const isUpcoming = state === "upcoming";

                  return (
                    <div key={step.status} className="relative flex items-start gap-4">
                      {/* Step Icon Circle */}
                      <div
                        className={`
                          relative z-10 flex items-center justify-center 
                          h-10 w-10 rounded-full border-2 transition-all
                          ${
                            isCompleted
                              ? "bg-primary border-primary text-primary-foreground"
                              : isActive
                              ? "bg-primary/10 border-primary text-primary animate-pulse"
                              : "bg-background border-border text-muted-foreground"
                          }
                        `}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4
                            className={`font-semibold ${
                              isUpcoming ? "text-muted-foreground" : ""
                            }`}
                          >
                            {step.label}
                          </h4>
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Done
                            </Badge>
                          )}
                        </div>
                        <p
                          className={`text-sm ${
                            isUpcoming
                              ? "text-muted-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.description}
                        </p>
                        {isCompleted && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(order.createdAt), "PPP p")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Estimated Delivery */}
          {order.status !== "delivered" && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">
                    {order.scheduledDelivery
                      ? `Scheduled for ${format(new Date(order.scheduledDelivery), "PPP")}`
                      : "Estimated delivery in 2-3 days"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    We'll notify you once your order is delivered
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTrackingModal;

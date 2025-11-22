import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Order } from "@/contexts/MockDataContext";
import { format, isSameDay, isToday, isTomorrow, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, Package, AlertCircle } from "lucide-react";
import { useState } from "react";

interface DeliveryScheduleProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order["status"]) => void;
}

const DeliverySchedule = ({ orders, onUpdateOrderStatus }: DeliveryScheduleProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Filter orders with scheduled deliveries
  const scheduledOrders = orders.filter(
    (order) => order.scheduled_delivery && order.status !== "delivered" && order.status !== "cancelled"
  );

  // Get orders for selected date
  const ordersForDate = selectedDate
    ? scheduledOrders.filter((order) =>
        isSameDay(parseISO(order.scheduled_delivery!), selectedDate)
      )
    : [];

  // Get dates that have scheduled orders
  const datesWithOrders = scheduledOrders.map((order) =>
    parseISO(order.scheduled_delivery!)
  );

  // Group orders by date for the list view
  const groupedOrders = scheduledOrders.reduce((acc, order) => {
    const dateKey = format(parseISO(order.scheduled_delivery!), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const sortedDates = Object.keys(groupedOrders).sort();

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMM d");
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledOrders.length}</div>
            <p className="text-xs text-muted-foreground">Pending deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {scheduledOrders.filter((o) => o.scheduled_delivery && isToday(parseISO(o.scheduled_delivery!))).length}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledOrders.length}</div>
            <p className="text-xs text-muted-foreground">Upcoming deliveries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Delivery Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                scheduled: datesWithOrders,
                today: new Date(),
              }}
              modifiersStyles={{
                scheduled: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "white",
                  fontWeight: "bold",
                },
              }}
            />
            {selectedDate && ordersForDate.length > 0 && (
              <div className="mt-4 p-3 bg-accent/10 rounded-lg">
                <p className="text-sm font-semibold mb-2">
                  {ordersForDate.length} {ordersForDate.length === 1 ? "delivery" : "deliveries"} on{" "}
                  {format(selectedDate, "PPP")}
                </p>
                <div className="space-y-2">
                  {ordersForDate.map((order) => (
                    <div key={order.id} className="flex items-center gap-2 text-xs">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span>Order #{order.id.slice(-8)}</span>
                      <Badge variant="outline" className="ml-auto">
                        ₹{order.total_price?.toFixed(0) || '0'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No scheduled deliveries</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {sortedDates.map((dateKey) => {
                  const ordersOnDate = groupedOrders[dateKey];
                  const isDueToday = isToday(parseISO(dateKey));

                  return (
                    <div key={dateKey} className="space-y-2">
                      <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                        <h4 className="text-sm font-semibold">{getDateLabel(dateKey)}</h4>
                        {isDueToday && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Due Today
                          </Badge>
                        )}
                      </div>
                      {ordersOnDate.map((order) => (
                        <Card key={order.id} className={isDueToday ? "border-red-500" : ""}>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-sm">
                                    {order.product_name || 'Order #' + order.id.slice(-8)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Order #{order.id.slice(-8)} • {order.payment_method || 'N/A'}
                                  </p>
                                </div>
                                <Badge variant="secondary">
                                  ₹{order.total_price?.toFixed(0) || '0'}
                                </Badge>
                              </div>

                              <div className="flex items-start gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                                <p className="text-xs text-muted-foreground flex-1">
                                  {order.delivery_address?.address || 'No address'}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => onUpdateOrderStatus(order.id, "out_for_delivery")}
                                >
                                  Mark Out for Delivery
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => onUpdateOrderStatus(order.id, "delivered")}
                                >
                                  Mark Delivered
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliverySchedule;

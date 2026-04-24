import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import { Order, OrderItem } from '../../types';
import { 
  Package, Truck, CheckCircle, Clock, XCircle, ChevronRight, 
  Search, Filter, ShoppingBag 
} from 'lucide-react';
import { CURRENCY } from '../../constants';

// Helper for status colors (reused/adapted from Admin)
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'shipped': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'processing': return <Package className="w-4 h-4" />;
    case 'shipped': return <Truck className="w-4 h-4" />;
    case 'delivered': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <XCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export const Orders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await db.getOrdersByUserId(user._id);
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order? Item stock will be returned.")) return;

    setCancellingId(orderId);
    try {
      await db.cancelOrder(orderId);
      // Update local state
      setOrders(orders.map(o => 
        o._id === orderId ? { ...o, status: 'cancelled' } : o
      ));
    } catch (error) {
      console.error("Failed to cancel order:", error);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const StatusTab = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`
        flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap
        ${activeTab === id 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
          : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'}
      `}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Orders</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Track and manage your recent purchases</p>
        </div>
        
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700 self-start md:self-auto"
        >
          Continue Shopping <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <StatusTab id="all" label="All Orders" />
        <StatusTab id="pending" label="Pending" icon={Clock} />
        <StatusTab id="processing" label="In Progress" icon={Package} />
        <StatusTab id="shipped" label="Shipped" icon={Truck} />
        <StatusTab id="delivered" label="Completed" icon={CheckCircle} />
        <StatusTab id="cancelled" label="Cancelled" icon={XCircle} />
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No orders found</h3>
            <p className="text-slate-500 mb-6">Looks like you haven't placed any orders in this category yet.</p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-8 gap-y-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">Ordered On</div>
                    <div className="font-medium text-slate-900">
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">Total</div>
                    <div className="font-medium text-slate-900">{CURRENCY}{order.totalAmount.toLocaleString()}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">Order ID</div>
                    <div className="font-mono font-medium text-slate-900">#{order._id.slice(-6).toUpperCase()}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-slate-200 md:border-none">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </div>
                  
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      disabled={cancellingId === order._id}
                      className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
                    >
                      {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 sm:p-6">
                <div className="space-y-6">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img 
                          src={item.imageUrl} 
                          alt={item.productName} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                          <div className="sm:pr-4">
                            <h4 className="font-semibold text-slate-900 truncate-2-lines">{item.productName}</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.variantName && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                  {item.variantName}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                Qty: {item.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="font-medium text-slate-900">
                            {CURRENCY}{item.price.toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-right sm:text-left">
                          <button 
                            onClick={() => navigate(`/product/${item.productId}`)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline inline-flex items-center gap-1"
                          >
                            View Product <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Order Footer / Shipping Info */}
              {order.shippingAddress && (
                <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                  <div className="flex flex-col sm:flex-row gap-1">
                    <span className="font-medium text-slate-700 whitespace-nowrap">Shipping to:</span>
                    <span className="truncate">
                      {order.shippingAddress.fullName || order.customerName}, {order.shippingAddress.street}, {order.shippingAddress.city}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};


import React, { useEffect, useState } from 'react';
import { 
  Search, Filter, Eye, Truck, CheckCircle, Clock, XCircle, 
  MapPin, Package, Calendar, DollarSign, ChevronDown, ChevronUp,
  AlertCircle, ArrowUpRight, Trash2
} from 'lucide-react';
import { Order, OrderItem } from '../../types';
import { db } from '../../services/db';
import { CURRENCY } from '../../constants';

// Helper for status colors
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'shipped': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return <Clock className="w-3 h-3" />;
    case 'processing': return <Package className="w-3 h-3" />;
    case 'shipped': return <Truck className="w-3 h-3" />;
    case 'delivered': return <CheckCircle className="w-3 h-3" />;
    case 'cancelled': return <XCircle className="w-3 h-3" />;
    default: return null;
  }
};

export const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);


  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await db.getOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    if (!window.confirm(`Are you sure you want to update status to ${newStatus}?`)) return;
    
    setUpdatingStatus(true);
    try {
      await db.updateOrderStatus(orderId, newStatus);
      
      // Update local state
      setOrders(orders.map(o => 
        o._id === orderId ? { ...o, status: newStatus } : o
      ));
      
      // Update selected order if open
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;

    try {
      await db.deleteOrder(orderId);
      setOrders(orders.filter(o => o._id !== orderId));
      if (selectedOrder?._id === orderId) {
        setIsDetailsOpen(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Failed to delete order:", error);
      alert("Failed to delete order");
    }
  };

  const openDetails = async (order: Order) => {
    setIsDetailsOpen(true);
    setDetailsLoading(true);
    // Show cached data first while loading
    setSelectedOrder(order);
    
    try {
      const freshOrder = await db.getOrder(order._id);
      if (freshOrder) {
        setSelectedOrder(freshOrder);
      }
    } catch (error) {
      console.error("Failed to fetch fresh order details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = 
      order._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.shippingAddress?.fullName || order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.shippingAddress?.email || (order as any).email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-slate-500 text-sm">View and manage customer orders</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search orders..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white w-full sm:w-40"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-500">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-500">No orders found matching your criteria</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openDetails(order)}>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-500">#{order._id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {order.shippingAddress?.fullName || order.customerName || 'Guest'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.shippingAddress?.email || (order as any).email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {CURRENCY}{order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(order);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(order._id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {isDetailsOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">Order Details</h2>
                <span className="font-mono text-sm px-2 py-1 bg-slate-200 rounded text-slate-600">
                  #{selectedOrder._id.toUpperCase()}
                </span>
                {detailsLoading && (
                  <span className="text-xs text-indigo-600 animate-pulse font-medium">Updating...</span>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDelete(selectedOrder._id)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                  title="Delete Order"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={() => setIsDetailsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              
              {/* Status Bar */}
              <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(selectedOrder.status).split(' ')[0]}`}>
                    {getStatusIcon(selectedOrder.status)}
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Current Status</div>
                    <div className={`font-semibold capitalize ${getStatusColor(selectedOrder.status).split(' ')[1]}`}>
                      {selectedOrder.status}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Update Status:</span>
                  <div className="flex gap-1">
                    {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(selectedOrder._id, status as Order['status'])}
                        disabled={selectedOrder.status === status || updatingStatus}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                          ${selectedOrder.status === status 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }
                          ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Left Column - Order Items */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Order Items</h3>
                    <div className="space-y-4">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                          <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                            <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-slate-900">{item.productName}</h4>
                                {item.variantName && (
                                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                                    Variant: {item.variantName}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-slate-900">{CURRENCY}{item.price.toLocaleString()}</div>
                                <div className="text-xs text-slate-500">Qty: {item.quantity}</div>
                              </div>
                            </div>
                            <div className="mt-2 text-sm font-medium text-slate-700">
                              Subtotal: {CURRENCY}{(item.price * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-full max-w-xs space-y-2">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span>{CURRENCY}{selectedOrder.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Shipping Free</span>
                        <span className="text-emerald-600 font-medium">Free</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-lg font-bold text-slate-900">
                        <span>Total</span>
                        <span>{CURRENCY}{selectedOrder.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Customer Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Customer Details</h3>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {selectedOrder.shippingAddress?.fullName || selectedOrder.customerName || 'Guest'}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {selectedOrder.shippingAddress ? (
                              <>
                                {selectedOrder.shippingAddress.street}
                                {selectedOrder.shippingAddress.landmark && <><br />{selectedOrder.shippingAddress.landmark}</>}
                                <br />
                                {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.zipCode}
                                <br />
                                {selectedOrder.shippingAddress.state}, {selectedOrder.shippingAddress.country}
                              </>
                            ) : (
                              <span className="italic text-slate-400">No address provided</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                          <span className="font-bold">@</span>
                        </div>
                        <div className="text-sm text-slate-600 break-all">
                          {selectedOrder.email || (selectedOrder as any).email || 'No email provided'}
                        </div>
                      </div>

                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                          <span className="font-bold">#</span>
                        </div>
                        <div className="text-sm text-slate-600">
                          {selectedOrder.contactNumber || (selectedOrder as any).phone || 'No phone provided'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Order Info</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Date</span>
                        <span className="text-slate-900 font-medium">
                          {new Date(selectedOrder.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Time</span>
                        <span className="text-slate-900 font-medium">
                          {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Status</span>
                        <span className={`font-medium capitalize ${getStatusColor(selectedOrder.status).split(' ')[1]}`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

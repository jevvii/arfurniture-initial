import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, ShoppingCart, TrendingUp, Users, AlertTriangle, ArrowRight, BarChart3, PieChart as PieChartIcon, CheckCircle, Award } from 'lucide-react';
import { db } from '../../services/db';
import { DashboardStats } from '../../types';
import { CURRENCY } from '../../constants';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, Label, LabelList
} from 'recharts';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'count' | 'value'>('count');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await db.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: '#94A3B8',    // Slate 400
    processing: '#4F46E5', // Indigo 600
    shipped: '#F59E0B',    // Amber 500
    delivered: '#10B981',  // Emerald 500
    cancelled: '#EF4444'   // Red 500
  };

  const CATEGORY_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-100 rounded-xl"></div>
          <div className="h-96 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-serif">Dashboard Overview</h1>
          <p className="text-slate-500">Welcome back, <span className="font-semibold text-slate-700">{user?.name}</span>. Here's what's happening today.</p>
        </div>
        <div className="hidden sm:block text-right">
          <div className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">Current Date</div>
          <div className="text-lg font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<Package className="w-6 h-6 text-indigo-600" />}
          label="Total Products"
          value={stats?.totalProducts || 0}
          bgColor="bg-indigo-50"
          trend="+12%"
        />
        <StatCard 
          icon={<ShoppingCart className="w-6 h-6 text-emerald-600" />}
          label="Pending Orders"
          value={stats?.pendingOrders || 0}
          bgColor="bg-emerald-50"
          trend={stats?.pendingOrders && stats.pendingOrders > 10 ? "High" : "Normal"}
          trendColor={stats?.pendingOrders && stats.pendingOrders > 10 ? "text-amber-600" : "text-slate-400"}
        />
        <StatCard 
          icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
          label="Monthly Revenue"
          value={`${CURRENCY}${stats?.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
          bgColor="bg-amber-50"
          trend="+23.5%"
        />
        <StatCard 
          icon={<Users className="w-6 h-6 text-purple-600" />}
          label="Active Customers"
          value={stats?.activeCustomers.toLocaleString() || '0'}
          bgColor="bg-purple-50"
          trend="+5.2%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Revenue Growth (Last 7 Days)
            </h3>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg">Last 7 Days</div>
          </div>
          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueByDay}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                  tickFormatter={(value) => `${CURRENCY}${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${CURRENCY}${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-emerald-500" />
              Orders Breakdown
            </h3>
            <div className="flex bg-slate-50 p-1 rounded-lg">
                <button 
                  onClick={() => setChartMode('count')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${chartMode === 'count' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >#</button>
                <button 
                  onClick={() => setChartMode('value')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${chartMode === 'value' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >₱</button>
            </div>
          </div>
          <div className="h-[230px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.ordersByStatus || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey={chartMode === 'count' ? 'count' : 'value'}
                >
                  {(stats?.ordersByStatus || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status.toLowerCase()] || CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: any) => chartMode === 'count' ? value : `${CURRENCY}${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-xl font-black text-slate-800">
                {chartMode === 'count' 
                  ? (stats?.ordersByStatus || []).reduce((acc, curr) => acc + (Number(curr.count) || 0), 0)
                  : `${CURRENCY}${(stats?.ordersByStatus || []).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              </div>
              <div className="text-[8px] uppercase font-bold text-slate-400">{chartMode === 'count' ? 'Total Orders' : 'Total Value'}</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {(stats?.ordersByStatus || []).map((item, index) => (
              <div key={item.status} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status.toLowerCase()] || CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}></div>
                <div className="flex flex-col">
                    <span className="capitalize text-[10px] font-bold text-slate-500">{item.status}</span>
                    <span className="font-black text-slate-900 text-xs">
                        {chartMode === 'count' ? item.count : `${CURRENCY}${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Best Sellers
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All Time</span>
          </div>
          <div className="space-y-4 flex-1">
            {stats?.topSellingProducts && stats.topSellingProducts.length > 0 ? (
               stats.topSellingProducts.map((product, idx) => (
                 <div key={product.name} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">{product.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-tight font-medium">{product.salesCount} sold</span>
                    </div>
                    <div className="text-xs font-black text-slate-900">
                      {CURRENCY}{product.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                 </div>
               ))
            ) : (
              <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                   <ShoppingCart className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No sales data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Category Analysis */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              Inventory Value by Category
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Investment</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topCategories} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#475569', fontSize: 11, fontWeight: 700}}
                  width={100}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${CURRENCY}${value.toLocaleString()}`, 'Investment Value']}
                />
                <Bar 
                  dataKey="totalValue" 
                  fill="#6366f1" 
                  radius={[0, 10, 10, 0]} 
                  barSize={24}
                >
                    <LabelList dataKey="count" position="right" style={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} formatter={(v: any) => `${v} items`} />
                    {stats?.topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-50 pt-4">
             {(stats?.topCategories || []).slice(0, 3).map((cat, idx) => (
                 <div key={cat.category} className="text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{cat.category}</div>
                    <div className="text-sm font-black text-slate-900">{cat.count} Items</div>
                 </div>
             ))}
          </div>
        </div>
      </div>

      {/* Low Stock Footer Alert */}
      {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
          <div className="mt-8 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-4">
              <div className="p-3 bg-red-500 text-white rounded-xl shadow-lg shadow-red-200">
                  <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                  <h4 className="font-bold text-red-900">Inventory Alert</h4>
                  <p className="text-sm text-red-700">There are {stats.lowStockProducts.length} items with critical stock levels. Review your inventory immediately.</p>
              </div>
              <Link to="/admin/products" className="px-4 py-2 bg-white text-red-600 font-bold rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition-all text-sm">
                  Resolve Now
              </Link>
          </div>
      )}

      {/* Navigation Shortcuts */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard 
          title="Product Catalog" 
          desc="Manage 3D models and pricing" 
          to="/admin/products" 
          color="bg-indigo-600"
        />
        <QuickActionCard 
          title="Order Pipeline" 
          desc={`Process ${stats?.pendingOrders} pending requests`} 
          to="/admin/orders" 
          color="bg-emerald-600"
        />
        <QuickActionCard 
          title="Marketing Hub" 
          desc="Homepage banners and sales" 
          to="/admin/marketing" 
          color="bg-amber-500"
        />
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: string;
  bgColor: string;
  trendColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, bgColor, trendColor = "text-green-600" }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 ${bgColor} rounded-xl group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest ${trendColor}`}>{trend}</span>
    </div>
    <div className="flex flex-col">
      <h3 className="text-3xl font-black text-slate-900 mb-1">{value}</h3>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  </div>
);

const QuickActionCard: React.FC<{ title: string, desc: string, to: string, color: string }> = ({ title, desc, to, color }) => (
  <Link to={to} className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all flex items-center justify-between overflow-hidden relative">
    <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
    <div>
      <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{title}</h4>
      <p className="text-xs text-slate-500 mt-1 font-medium">{desc}</p>
    </div>
    <div className="p-2 bg-slate-50 rounded-full text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
      <ArrowRight className="w-5 h-5" />
    </div>
  </Link>
);




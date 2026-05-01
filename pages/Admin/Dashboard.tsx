import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, ShoppingCart, TrendingUp, Users, AlertTriangle, ArrowRight, BarChart3, PieChart as PieChartIcon, CheckCircle } from 'lucide-react';
import { db } from '../../services/db';
import { DashboardStats } from '../../types';
import { CURRENCY } from '../../constants';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
            <select className="text-xs font-bold text-slate-500 bg-slate-50 border-none rounded-lg px-3 py-1.5 focus:ring-0">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
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
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-emerald-500" />
            Orders Breakdown
          </h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.ordersByStatus || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {(stats?.ordersByStatus || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-2xl font-black text-slate-800">
                {(stats?.ordersByStatus || []).reduce((acc, curr) => acc + (Number(curr.count) || 0), 0)}
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Orders</div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {stats?.ordersByStatus.map((item, index) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="capitalize text-slate-600">{item.status}</span>
                </div>
                <span className="font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Low Stock Alerts
            </h3>
            <Link to="/admin/products" className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
               stats.lowStockProducts.map(product => (
                 <div key={product.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 line-clamp-1">{product.name}</span>
                      <span className="text-[10px] text-slate-500">Inventory Status: Critical</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-black ${product.stock <= 2 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-100 text-orange-600'}`}>
                      {product.stock}
                    </div>
                 </div>
               ))
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                   <CheckCircle className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500">All products well-stocked!</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            Inventory by Category
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#475569', fontSize: 12, fontWeight: 600}}
                  width={100}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard 
          title="New Product" 
          desc="Add a new 3D item to your catalog" 
          to="/admin/products" 
          color="bg-indigo-600"
        />
        <QuickActionCard 
          title="Process Orders" 
          desc={`You have ${stats?.pendingOrders} orders waiting`} 
          to="/admin/orders" 
          color="bg-emerald-600"
        />
        <QuickActionCard 
          title="Campaigns" 
          desc="Manage your homepage banners" 
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



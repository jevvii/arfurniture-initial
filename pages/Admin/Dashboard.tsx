import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { db } from '../../services/db';
import { DashboardStats } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await db.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600">Welcome back, {user?.name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Package className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-green-600">+12%</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">{stats?.totalProducts || 0}</h3>
          <p className="text-sm text-slate-500">Total Products</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600">+8%</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">{stats?.pendingOrders || 0}</h3>
          <p className="text-sm text-slate-500">Pending Orders</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-green-600">+23%</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">₱{stats?.monthlyRevenue.toLocaleString() || '0'}</h3>
          <p className="text-sm text-slate-500">Monthly Revenue</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-green-600">+5%</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">{stats?.activeCustomers.toLocaleString() || '0'}</h3>
          <p className="text-sm text-slate-500">Active Customers</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <p className="text-slate-600">Select a module from the navigation to manage products, orders, or marketing campaigns.</p>
      </div>
    </div>
  );
};


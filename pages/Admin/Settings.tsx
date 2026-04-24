import React, { useState, useEffect } from 'react';
import { Save, Upload, Loader, Users, Plus, X, Trash2, Edit } from 'lucide-react';
import { StoreSettings, UserRole } from '../../types';
import { APP_NAME } from '../../constants';
import { resolveAssetUrl, getApiBaseUrl } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

interface AdminUser {
  _id: string;
  fname: string;
  mname: string; // Add middle name support
  lname: string;
  email: string;
  username: string;
  role: 'admin' | 'superadmin';
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>({
    type: 'general',
    storeName: APP_NAME,
    logoUrl: ''
  });
  
  // Staff Management State
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  
  const [staffForm, setStaffForm] = useState({
    fname: '',
    mname: '',
    lname: '',
    email: '',
    username: '',
    password: '',
    role: 'admin' as 'admin' | 'superadmin'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    if (user?.role === 'superadmin' || (user as any)?.role === 'superadmin') {
      fetchStaff();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings({
          ...data,
          storeName: data.storeName || APP_NAME
        });
        if (data.logoUrl) {
          setPreviewUrl(resolveAssetUrl(data.logoUrl));
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/admin/staff`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      let logoUrl = settings.logoUrl;

      // Upload logo if changed
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);

        const uploadRes = await fetch(`${getApiBaseUrl()}/api/upload/logo`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Failed to upload logo');
        
        const uploadData = await uploadRes.json();
        logoUrl = uploadData.url;
      }

      // Update settings
      const res = await fetch(`${getApiBaseUrl()}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: settings.storeName,
          logoUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      const updatedSettings = await res.json();
      setSettings(updatedSettings.value || updatedSettings);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      
      if (updatedSettings.logoUrl || (updatedSettings.value && updatedSettings.value.logoUrl)) {
         const newUrl = updatedSettings.logoUrl || updatedSettings.value.logoUrl;
         setSettings(prev => ({ ...prev, logoUrl: newUrl }));
      }

    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const openModal = (staffMember?: AdminUser) => {
    if (staffMember) {
      setEditingStaffId(staffMember._id);
      setStaffForm({
        fname: staffMember.fname,
        mname: staffMember.mname || '',
        lname: staffMember.lname,
        email: staffMember.email,
        username: staffMember.username,
        role: staffMember.role,
        password: ''
      });
    } else {
      setEditingStaffId(null);
      setStaffForm({
        fname: '',
        mname: '',
        lname: '',
        email: '',
        username: '',
        password: '',
        role: 'admin'
      });
    }
    setShowModal(true);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingStaffId 
        ? `${getApiBaseUrl()}/api/admin/staff/${editingStaffId}`
        : `${getApiBaseUrl()}/api/admin/staff`;
        
      const method = editingStaffId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save staff member');
      }
      
      if (editingStaffId) {
        setStaff(staff.map(s => s._id === editingStaffId ? data : s));
        setMessage({ type: 'success', text: 'Staff member updated successfully' });
      } else {
        setStaff([...staff, data]);
        setMessage({ type: 'success', text: 'New staff member added successfully' });
      }
      
      setShowModal(false);
      
    } catch (error: any) {
      console.error('Error saving staff:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/staff/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete staff member');
      }

      setStaff(staff.filter(s => s._id !== id));
      setMessage({ type: 'success', text: 'Staff member deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }
  
  // Check for superadmin role (assuming 'superadmin' string or enum value if it existed)
  const isSuperAdmin = (user as any)?.role === 'superadmin' || user?.role === 'superadmin';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Store Settings</h1>
        <p className="text-slate-500 mt-1">Manage your store's general information and branding.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 md:p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <Save className="w-5 h-5" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center font-bold">!</div>
              )}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Store Name */}
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-slate-700 mb-2">
                Store Name
              </label>
              <input
                type="text"
                id="storeName"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full max-w-md px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-colors"
                placeholder="Enter store name"
                required
              />
              <p className="mt-2 text-sm text-slate-500">
                This name will appear in the header and footer of your store.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Store Logo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-4">
                Store Logo
              </label>
              
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-32 h-32 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Store Logo" 
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs text-center px-2">No logo</span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <label 
                      htmlFor="logo-upload" 
                      className="cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload New Logo
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    {logoFile && (
                      <span className="text-sm text-slate-500">
                        {logoFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    Recommended size: 200x200px. Supported formats: PNG, JPG, WEBP.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Staff Management Section - RBAC */}
      {isSuperAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Staff Management
              </h2>
              <p className="text-slate-500 mt-1 text-sm">Manage admin accounts and permissions.</p>
            </div>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Admin
            </button>
          </div>
          
          <div className="divide-y divide-slate-100">
            {loadingStaff ? (
              <div className="p-8 text-center text-slate-500">Loading staff...</div>
            ) : staff.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No other staff members found.</div>
            ) : (
              staff.map((admin) => (
                <div key={admin._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                      {admin.fname[0]}{admin.lname[0]}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                         {admin.fname} {admin.mname ? `${admin.mname} ` : ''}{admin.lname}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>@{admin.username}</span>
                        <span>•</span>
                        <span>{admin.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      admin.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {admin.role.toUpperCase()}
                    </span>
                    
                    <div className="flex items-center gap-2">
                         <button 
                           onClick={() => openModal(admin)}
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                           title="Edit Admin"
                         >
                            <Edit className="w-4 h-4" />
                         </button>
                          <button 
                           onClick={() => handleDeleteStaff(admin._id)}
                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                           title="Delete Admin"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">
                  {editingStaffId ? 'Edit Admin' : 'Add New Admin'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleStaffSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={staffForm.fname}
                    onChange={e => setStaffForm({...staffForm, fname: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={staffForm.mname}
                    onChange={e => setStaffForm({...staffForm, mname: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={staffForm.lname}
                    onChange={e => setStaffForm({...staffForm, lname: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={e => setStaffForm({...staffForm, email: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={staffForm.username}
                    onChange={e => setStaffForm({...staffForm, username: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={staffForm.role}
                    onChange={e => setStaffForm({...staffForm, role: e.target.value as any})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {editingStaffId ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingStaffId}
                  minLength={6}
                  value={staffForm.password}
                  onChange={e => setStaffForm({...staffForm, password: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder={editingStaffId ? "Min. 6 characters (optional)" : "Min. 6 characters"}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? (editingStaffId ? 'Updating...' : 'Creating...') : (editingStaffId ? 'Update Account' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Address } from '../../types';
import { updateUserProfile } from '../../services/auth';
import { AddressManager } from '../../components/AddressManager';
import { User as UserIcon, Phone, Mail, Lock, Save, Loader2, ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    fname: '',
    mname: '',
    lname: '',
    email: '',
    contactNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      // Split name if needed, but we should rely on individual fields if we have them. 
      // The user object in context might implement 'name' as a getter or computed.
      // Ideally user object has fname, lname, etc.
      // Let's assume user object matches the User interface + normalized data.
      // But `User` interface in types.ts only has `name`.
      // We might need to cast or rely on connection to DB user structure which has individual fields.
      // Wait, the `normalizeUser` sends fname, mname, lname within the object but `User` type might not expose them if strict.
      // Let's check `User` type. It only has `name`.
      // The `normalizeUser` returns `fname`, `mname`, `lname` but they might not be in `User` type definition.
      // We should update User type or cast it.
      
      setFormData(prev => ({
        ...prev,
        fname: user.fname || '',
        mname: user.mname || '',
        lname: user.lname || '',
        email: user.email || '',
        contactNumber: user.contactNumber || ''
      }));
    } else {
        navigate('/');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For contact number, only allow numeric input
    if (name === 'contactNumber') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData({ ...formData, [name]: numericValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Philippine mobile format: 09XXXXXXXXX (11 digits total)
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Contact number validation
    if (formData.contactNumber && !validatePhoneNumber(formData.contactNumber)) {
      setErrorMsg('Contact number must be in the format 09XXXXXXXXX (11 digits, starting with 09).');
      setIsLoading(false);
      return;
    }

    // Password validation
    if (formData.newPassword) {
       if (formData.newPassword !== formData.confirmPassword) {
           setErrorMsg("New passwords don't match.");
           setIsLoading(false);
           return;
       }
       if (!formData.currentPassword) {
           setErrorMsg("Current password is required to set a new password.");
           setIsLoading(false);
           return;
       }
    }

    try {
        if (!user) return;
        
        const updatedUser = await updateUserProfile(user._id, {
            fname: formData.fname,
            mname: formData.mname,
            lname: formData.lname,
            contactNumber: formData.contactNumber,
            currentPassword: formData.newPassword ? formData.currentPassword : undefined,
            newPassword: formData.newPassword || undefined
        });
        
        // Update global user state
        updateUser(updatedUser);

        setSuccessMsg('Profile updated successfully!');
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
        setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-3 space-y-8 flex flex-col">
              
              {/* Personal Information Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <UserIcon className="w-5 h-5 text-indigo-600" /> Personal Information
                  </h2>
                  
                  {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{successMsg}</div>}
                  {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorMsg}</div>}
                  
                  <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                              <input 
                                  type="text" 
                                  name="fname" 
                                  value={formData.fname} 
                                  onChange={handleChange}
                                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Middle Name</label>
                              <input 
                                  type="text" 
                                  name="mname" 
                                  value={formData.mname} 
                                  onChange={handleChange}
                                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                              <input 
                                  type="text" 
                                  name="lname" 
                                  value={formData.lname} 
                                  onChange={handleChange}
                                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="opacity-70">
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email (Read Only)</label>
                              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
                                  <Mail className="w-4 h-4" />
                                  <span>{formData.email}</span>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Number</label>
                              <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input 
                                      type="tel" 
                                      name="contactNumber" 
                                      value={formData.contactNumber} 
                                      onChange={handleChange}
                                      maxLength={11}
                                      placeholder="09171234567"
                                      className="w-full pl-9 p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                  />
                              </div>
                              {formData.contactNumber && !validatePhoneNumber(formData.contactNumber) && (
                                <p className="text-xs text-red-500 mt-1">Must be 11 digits starting with 09</p>
                              )}
                          </div>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100">
                          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <Lock className="w-4 h-4 text-indigo-600" /> Change Password
                          </h3>
                          <div className="space-y-3 bg-slate-50 p-4 rounded-xl">
                              <div>
                                  <input 
                                      type="password" 
                                      name="currentPassword"
                                      placeholder="Current Password"
                                      value={formData.currentPassword} 
                                      onChange={handleChange}
                                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                  />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <input 
                                      type="password" 
                                      name="newPassword"
                                      placeholder="New Password"
                                      value={formData.newPassword} 
                                      onChange={handleChange}
                                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                  />
                                  <input 
                                      type="password" 
                                      name="confirmPassword"
                                      placeholder="Confirm New Password"
                                      value={formData.confirmPassword} 
                                      onChange={handleChange}
                                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="flex justify-end pt-4">
                          <button 
                              type="submit" 
                              disabled={isLoading}
                              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save Changes
                          </button>
                      </div>
                  </form>
              </div>
          </div>
          
          {/* Right Column - Address Manager */}
          <div className="lg:col-span-2 space-y-8 flex flex-col">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 flex-shrink-0">
                       <MapPin className="w-5 h-5 text-indigo-600" /> Address Book
                  </h2>
                  <AddressManager 
                      userId={user._id} 
                      onSelectAddress={() => {}} // No-op for profile view
                      selectable={false}
                  />
              </div>
          </div>
      </div>
    </div>
  );
};

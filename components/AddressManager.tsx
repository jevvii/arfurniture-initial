import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Check, X, Edit2 } from 'lucide-react';
import { Address } from '../types';
import { getAddresses, addAddress, deleteAddress, updateAddress } from '../services/address';

interface AddressManagerProps {
  userId: string;
  selectedAddressId?: string;
  onSelectAddress: (address: Address) => void;
  selectable?: boolean;
}

export const AddressManager: React.FC<AddressManagerProps> = ({ userId, selectedAddressId, onSelectAddress, selectable = true }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null); // Track editing state
  const [error, setError] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState<Omit<Address, 'id'>>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Philippines',
    landmark: ''
  });

  useEffect(() => {
    loadAddresses();
  }, [userId]);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const data = await getAddresses(userId);
      setAddresses(data);
      if (data.length > 0 && !selectedAddressId) {
        onSelectAddress(data[0]);
      }
    } catch (err) {
      console.error('Failed to load addresses', err);
      setError('Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const updated = await updateAddress(userId, isEditing, addressForm);
        setAddresses(addresses.map(a => a.id === isEditing ? updated : a));
      } else {
        const added = await addAddress(userId, addressForm);
        setAddresses([...addresses, added]);
        // Optionally auto-select the new address
        if (selectable) {
            onSelectAddress(added);
        }
      }
      closeModal();
    } catch (err) {
      console.error('Failed to save address', err);
      setError('Failed to save address');
    }
  };

  const startAdding = () => {
      setAddressForm({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Philippines',
        landmark: ''
      });
      setIsEditing(null);
      setIsModalOpen(true);
  };

  const startEditing = (addr: Address) => {
      setAddressForm({
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          country: addr.country,
          landmark: addr.landmark || ''
      });
      setIsEditing(addr.id || '');
      setIsModalOpen(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await deleteAddress(userId, addressId);
      setAddresses(addresses.filter(a => a.id !== addressId));
      if (selectedAddressId === addressId) {
        // Handle deselection if needed, though parent controls selection
      }
    } catch (err) {
      console.error('Failed to delete address', err);
      setError('Failed to delete address');
    }
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setIsEditing(null);
      setError(null);
  };

  if (isLoading) return <div className="p-4 text-center text-slate-500">Loading addresses...</div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      {error && <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{error}</div>}
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar max-h-[500px]">
        <div className="grid grid-cols-1 gap-4">
        {addresses.map(addr => (
          <div 
            key={addr.id} 
            className={`
              relative p-5 rounded-2xl border transition-all duration-200 group flex flex-col
              ${selectable 
                ? 'cursor-pointer' 
                : 'hover:shadow-md bg-white border-slate-100'}
              ${selectable && selectedAddressId === addr.id 
                ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                : selectable ? 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50' : ''}
            `}
            onClick={() => selectable && onSelectAddress(addr)}
          >
            <div className="flex items-start gap-4 flex-1">
              {selectable ? (
                <div className={`
                  mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${selectedAddressId === addr.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}
                `}>
                  {selectedAddressId === addr.id && <Check className="w-3 h-3 text-white" />}
                </div>
              ) : (
                <div className="mt-1 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                    <MapPin className="w-4 h-4" />
                </div>
              )}
              
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold text-slate-900 text-base">{addr.street}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{addr.city}, {addr.state} {addr.zipCode}</p>
                        <p className="text-xs text-slate-400 uppercase mt-1 font-medium tracking-wide">{addr.country}</p>
                    </div>
                </div>
                {addr.landmark && (
                  <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1 font-medium bg-indigo-50 inline-block px-2 py-1 rounded-md">
                    <MapPin className="w-3 h-3" /> {addr.landmark}
                  </p>
                )}
              </div>
            </div>

            <div className={`flex gap-1 justify-end mt-3 pt-3 border-t border-slate-100 ${selectable ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditing(addr); }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Edit Address"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id!); }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Delete Address"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
              </div>
          </div>
        ))}
        </div>

        {addresses.length === 0 && (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <MapPin className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No saved addresses found.</p>
            <p className="text-slate-400 text-xs mt-1">Add an address to speed up checkout.</p>
          </div>
        )}

      </div>

        <button 
          onClick={startAdding}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/50 font-medium transition-all flex items-center justify-center gap-2 group min-h-[60px] flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" /> 
          </div>
          Add New Address
        </button>

      {/* Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" style={{ margin: 0 }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                    <h3 className="text-lg font-bold text-slate-900">
                        {isEditing ? 'Edit Address' : 'Add New Address'}
                    </h3>
                    <button 
                        onClick={closeModal}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-1 p-6">
                  <form id="address-form" onSubmit={handleSaveAddress} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                          <input
                              type="text"
                              required
                              placeholder="Unit, Building, Street Name"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                              value={addressForm.street}
                              onChange={e => setAddressForm({...addressForm, street: e.target.value})}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                              <input
                                  type="text"
                                  required
                                  placeholder="City"
                                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                  value={addressForm.city}
                                  onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">State/Province</label>
                              <input
                                  type="text"
                                  required
                                  placeholder="State"
                                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                  value={addressForm.state}
                                  onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
                              <input
                                  type="text"
                                  required
                                  placeholder="ZIP Code"
                                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                  value={addressForm.zipCode}
                                  onChange={e => setAddressForm({...addressForm, zipCode: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                              <input
                                  type="text"
                                  required
                                  placeholder="Country"
                                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 bg-slate-50"
                                  value={addressForm.country}
                                  onChange={e => setAddressForm({...addressForm, country: e.target.value})}
                                  readOnly // Assuming country is fixed for now or change to select
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Landmark <span className="text-slate-400 font-normal">(Optional)</span></label>
                          <input
                              type="text"
                              placeholder="Near..."
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                              value={addressForm.landmark}
                              onChange={e => setAddressForm({...addressForm, landmark: e.target.value})}
                          />
                      </div>
                  </form>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0 rounded-b-2xl">
                    <button 
                        type="button" 
                        onClick={closeModal}
                        className="flex-1 py-3 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-medium transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="address-form"
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-colors"
                    >
                        {isEditing ? 'Update Address' : 'Save Address'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

import { User, UserRole, Address } from '../types';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const AUTH_API_BASE = (metaEnv?.VITE_AUTH_API_BASE || 'http://localhost:4000').replace(/\/$/, '');

console.log('Auth API Base URL:', AUTH_API_BASE);

const parseResponse = async (res: Response) => {
  let data: any = {};
  try {
    data = await res.json();
  } catch (parseError) {
    console.error('Failed to parse response:', parseError);
  }
  if (!res.ok) {
    console.error('HTTP Error:', res.status, res.statusText, data);
    const error = new Error(data.error || `Request failed with status ${res.status}`);
    (error as any).status = res.status;
    throw error;
  }
  return data;
};

// Forgot Password - Request reset code
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; resetToken?: string; message: string }> => {
  const res = await fetch(`${AUTH_API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() })
  });
  return parseResponse(res);
};

// Forgot Password - Verify reset code
export const verifyResetCode = async (resetToken: string, code: string): Promise<{ success: boolean; message: string }> => {
  const res = await fetch(`${AUTH_API_BASE}/api/auth/forgot-password/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, code })
  });
  return parseResponse(res);
};

// Forgot Password - Reset password
export const resetPassword = async (resetToken: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  const res = await fetch(`${AUTH_API_BASE}/api/auth/forgot-password/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, code, newPassword })
  });
  return parseResponse(res);
};

// Customer Login
export const loginUser = async (email: string, password: string): Promise<User> => {
  console.log('→ Attempting customer login...');
  
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });
    
    const data = await parseResponse(res);
    const fullName = data.name || [data.fname, data.mname, data.lname].filter(Boolean).join(' ');
    console.log('✓ Customer login successful');
    
    return {
      _id: data._id,
      name: fullName,
      email: data.email,
      role: (data.role as UserRole) || UserRole.USER,
      addresses: data.addresses || [],
      fname: data.fname,
      mname: data.mname,
      lname: data.lname,
      contactNumber: data.contactNumber
    };
  } catch (error) {
    console.error('✗ Customer login error:', error);
    throw error;
  }
};

// Admin Login - separate function, doesn't fallback
export const loginAdmin = async (identifier: string, password: string): Promise<User> => {
  console.log('→ Attempting admin login for:', identifier);
  console.log('→ Calling:', `${AUTH_API_BASE}/api/auth/admins/login`);
  
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/auth/admins/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), password })
    });
    
    const data = await parseResponse(res);
    const fullName = data.name || [data.fname, data.mname, data.lname].filter(Boolean).join(' ');
    console.log('✓ Admin login successful:', fullName);
    
    return {
      _id: data._id,
      name: fullName || data.username || 'Admin',
      email: data.email,
      role: (data.role as UserRole) || UserRole.ADMIN,
      addresses: []
    };
  } catch (error) {
    console.error('✗ Admin login error:', error);
    throw error;
  }
};

// Customer Signup
export const registerUser = async (fname: string, lname: string, email: string, password: string, mname = ''): Promise<User> => {
  const res = await fetch(`${AUTH_API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      password,
      fname: fname.trim(),
      mname: mname.trim(),
      lname: lname.trim(),
      contactNumber: ''
    })
  });
  const data = await parseResponse(res);
  const fullName = data.name || [data.fname ?? fname, data.mname ?? mname, data.lname ?? lname].filter(Boolean).join(' ');
  return {
    _id: data._id,
    name: fullName,
    email: data.email,
    role: (data.role as UserRole) || UserRole.USER,
    addresses: data.addresses || [],
    fname: data.fname,
    mname: data.mname,
    lname: data.lname,
    contactNumber: data.contactNumber
  };
};

// Update User Profile
export const updateUserProfile = async (
  userId: string,
  data: Partial<User> & { currentPassword?: string, newPassword?: string, contactNumber?: string, fname?: string, mname?: string, lname?: string }
): Promise<User> => {
  const res = await fetch(`${AUTH_API_BASE}/api/auth/update-profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...data })
  });
  
  const updatedUser = await parseResponse(res);
  const fullName = updatedUser.name || [updatedUser.fname, updatedUser.mname, updatedUser.lname].filter(Boolean).join(' ');
  
  return {
    _id: updatedUser._id,
    name: fullName,
    email: updatedUser.email,
    role: (updatedUser.role as UserRole) || UserRole.USER,
    addresses: updatedUser.addresses || [],
    fname: updatedUser.fname,
    mname: updatedUser.mname,
    lname: updatedUser.lname,
    contactNumber: updatedUser.contactNumber
  };
};

export const updateUserAddress = async (userId: string, address: Address): Promise<Address> => {
  return address;
};


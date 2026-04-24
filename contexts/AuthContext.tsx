import { createContext, useContext } from 'react';
import { User, Address } from '../types';

export interface AuthContextType {
  user: User | null;
  userLogin: (email: string, pass: string) => Promise<User>;
  adminLogin: (identifier: string, pass: string) => Promise<User>;
  signup: (fname: string, lname: string, email: string, pass: string, mname?: string) => Promise<User>;
  logout: () => void;
  updateAddress: (address: Address) => Promise<void>;
  updateUser: (user: User) => void;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (isOpen: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

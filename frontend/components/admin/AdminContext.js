'use client';
import { createContext, useContext } from 'react';

export const AdminCtx = createContext({ session: null, can: () => false, attention: null, refresh: () => {} });
export const useAdmin = () => useContext(AdminCtx);

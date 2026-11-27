'use client';
import { createContext, useContext } from 'react';
import { EMPTY_SITE } from '@/lib/site';

const Ctx = createContext(EMPTY_SITE);
export const SiteProvider = ({ site, children }) => <Ctx.Provider value={site || EMPTY_SITE}>{children}</Ctx.Provider>;
export const useSite = () => useContext(Ctx);

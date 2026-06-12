'use client';

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { callAPI } from './api';

// ─── Context ──────────────────────────────────────────────────────────────────
const StoreContext = createContext(null);

// ─── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
  khachHang: [],
  xe: [],
  xeStats: null,
  thuChi: [],
  xeDaBan: [],
  loading: true,
  error: null,
};

// ─── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };

    case 'LOAD_SUCCESS':
      return { ...state, loading: false, error: null, ...action.payload };

    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error };

    // Thu-Chi mutations (for optimistic updates)
    case 'ADD_THU_CHI_ROW':
      return { ...state, thuChi: [action.payload, ...state.thuChi] };
    case 'UPDATE_THU_CHI_ROW':
      return {
        ...state,
        thuChi: state.thuChi.map(row =>
          row.rowNum === action.rowNum ? { ...row, ...action.data } : row
        ),
      };
    case 'DELETE_THU_CHI_ROW':
      return { ...state, thuChi: state.thuChi.filter(row => row.rowNum !== action.rowNum) };

    // Khách Hàng mutations
    case 'ADD_KHACH_HANG':
      return { ...state, khachHang: [action.payload, ...state.khachHang] };
    case 'UPDATE_KHACH_HANG':
      return {
        ...state,
        khachHang: state.khachHang.map(kh =>
          (kh.tenKH === action.originalName && kh.bienSo === action.originalBienSo) ? { ...kh, ...action.data } : kh
        ),
      };
    case 'DELETE_KHACH_HANG':
      return {
        ...state,
        khachHang: state.khachHang.filter(kh => !(kh.tenKH === action.originalName && kh.bienSo === action.originalBienSo)),
      };

    // Xe mutations
    case 'ADD_XE':
      return { ...state, xe: [action.payload, ...state.xe] };
    case 'UPDATE_XE':
      return {
        ...state,
        xe: state.xe.map(x =>
          x.bienSo === action.originalBienSo ? { ...x, ...action.data } : x
        ),
      };
    case 'DELETE_XE':
      return { ...state, xe: state.xe.filter(x => x.bienSo !== action.originalBienSo) };

    default:
      return state;
  }
}

// ─── Parse helper ──────────────────────────────────────────────────────────────
function parseList(result) {
  if (Array.isArray(result)) return result;
  // Some endpoints return { data: [...] } or { success, data: [...] }
  if (result && Array.isArray(result.data)) return result.data;
  // Fallback field names
  if (result && Array.isArray(result.xe)) return result.xe;
  if (result && Array.isArray(result.khachHang)) return result.khachHang;
  return [];
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) dispatch({ type: 'LOAD_START' });
    try {
      // Load all in parallel — use allSettled so one failure doesn't block others
      const [khResult, xeResult, tcResult, xdbResult] = await Promise.allSettled([
        callAPI('getKhachHangData'),
        callAPI('getXeData'),
        callAPI('getThuChiData', '', '', ''),
        callAPI('getXeDaBanData'),
      ]);

      const rawKhachHang = parseList(khResult.status === 'fulfilled' ? khResult.value : []);
      const xeList = parseList(xeResult.status === 'fulfilled' ? xeResult.value : []);

      const activeKhachHang = rawKhachHang.filter(k => {
        if (k.bienSo) {
          const vehicle = xeList.find(x => x.bienSo === k.bienSo);
          if (vehicle) {
            const status = String(vehicle.trangThai || '').trim().toLowerCase();
            if (status === 'trống' || status === 'bảo dưỡng') {
              return false; // Đã trả xe
            }
          }
        }
        return true;
      });

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: {
          khachHang: activeKhachHang,
          xe: xeList,
          xeStats: (xeResult.status === 'fulfilled' && xeResult.value?.stats) ? xeResult.value.stats : null,
          thuChi: parseList(tcResult.status === 'fulfilled' ? tcResult.value : []).filter(r => r && (r.loai === 'Thu' || r.loai === 'Chi')),
          xeDaBan: parseList(xdbResult.status === 'fulfilled' ? xdbResult.value : []),
        },
      });
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', error: err.message || 'Không thể tải dữ liệu' });
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const value = {
    ...state,
    dispatch,
    reload: loadAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
